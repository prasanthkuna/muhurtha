/**
 * Real AI Ask: one small strict-schema call per question, grounded in the chart's reading
 * (profile, current chapter, the day's card) and the engine's live windows. Times are
 * engine-owned: the model picks a window id and the server prints the clock times.
 */
import { DATE_RULE, polishDeep, VOICE_BLOCK } from "./voice.ts";
import { createResponse, readingModel, type ResponseObject } from "./openai_responses.ts";

export const ASK_V2_PROMPT_VERSION = "ask-v2.2";

export type AskContext = {
  locale: "en" | "te" | "hi";
  subject: { name: string | null; is_account_owner: boolean; is_child: boolean };
  date: string;
  profile: { title?: string; summary?: string; strengths?: string[]; watchouts?: string[] };
  chapter: { title?: string; highlight?: string; body?: string; period?: string; lords?: string } | null;
  today: { title?: string; line?: string; body?: string; do?: string[]; avoid?: string[] } | null;
  upcoming: { date: string; weekday: string; tone?: string; title?: string }[];
  windows: { id: string; kind: "good" | "caution"; start: string; end: string }[];
};

export type AskLlmAnswer = {
  direct_answer: string;
  action_line: string;
  simple_why: string;
  better_option: string;
  share_hook: string;
  best_window: "g1" | "g2" | "none";
  caution_window: "c1" | "none";
  suggested_date: string;
  topic: string;
};

const LANG: Record<string, string> = { en: "English", te: "Telugu (తెలుగు script)", hi: "Hindi (देवनागरी script)" };

function schema(): Record<string, unknown> {
  const s = (d: string) => ({ type: "string", description: d });
  const props = {
    direct_answer: s("2-4 sentences that directly answer the question for this person (max 520 chars)"),
    action_line: s("one concrete next step (max 150 chars)"),
    simple_why: s("why, grounded in the chapter/day context, plain words (max 240 chars)"),
    better_option: s("a better alternative or how to make it safer; empty string if none (max 150 chars)"),
    share_hook: s("a short shareable line (max 110 chars)"),
    best_window: { type: "string", enum: ["g1", "g2", "none"], description: "which of today's good windows fits best" },
    caution_window: { type: "string", enum: ["c1", "none"], description: "c1 if they should avoid the caution window for this" },
    suggested_date: s("YYYY-MM-DD from upcoming if another day is clearly better, else empty string"),
    topic: { type: "string", enum: ["work", "money", "relationship", "family", "health", "timing", "child", "other"] },
  };
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}

function system(ctx: AskContext): string {
  return [
    `You are Muhurta's Ask guide. Answer in ${LANG[ctx.locale]} only, like a friend who knows Jyotisha: warm, direct, specific, a little playful.`,
    VOICE_BLOCK[ctx.locale],
    DATE_RULE,
    "Start direct_answer with the answer itself (yes / not yet / better on <day>), not with a restatement of the question. No 'Based on your chart' openers.",
    "share_hook: a line someone would actually post, max one emoji. No emoji anywhere else.",
    "Ground every answer in the CONTEXT (profile, current chapter, today's card, upcoming days). Do not invent planets, dashas, dates or times beyond it.",
    "Never write clock times; pick best_window / caution_window ids instead and the app shows the times. Never write the ids themselves (g1, g2, c1) in any text; say 'the best time' or 'Rahu Kalam' instead.",
    "No fear, no guarantees, no medical/legal/financial certainty; for health or legal questions suggest a professional too.",
    ctx.subject.is_child ? "This chart is a child's: answer for the parent; no career/money/romance framing for the child." : "",
    "If the question is not about life, timing or the chart, answer briefly and steer back kindly.",
  ].filter(Boolean).join("\n");
}

export async function askWithLlm(
  question: string,
  ctx: AskContext,
  history: { role: string; content: string }[],
): Promise<{ answer: AskLlmAnswer; resp: ResponseObject; latencyMs: number; model: string }> {
  const model = Deno.env.get("ASK_MODEL")?.trim() || readingModel();
  const t0 = Date.now();
  const user = [
    "CONTEXT:",
    JSON.stringify(ctx),
    history.length ? "RECENT CHAT:\n" + history.map((h) => `${h.role}: ${h.content.slice(0, 400)}`).join("\n") : "",
    "QUESTION:",
    question.slice(0, 900),
  ].filter(Boolean).join("\n");
  const resp = await createResponse({
    model,
    system: system(ctx),
    user,
    schemaName: "muhurta_ask",
    schema: schema(),
    background: false,
    reasoningEffort: "low",
    maxOutputTokens: 1800,
    timeoutMs: 45_000,
  });
  if (resp.status !== "completed" || !resp.output_text) {
    throw new Error(`ask_incomplete:${resp.status}:${resp.incomplete_reason ?? resp.error ?? ""}`);
  }
  const parsed = JSON.parse(resp.output_text) as AskLlmAnswer;
  const answer = scrubWindowIds(
    polishDeep(parsed, ctx.locale, new Set(["best_window", "caution_window", "suggested_date", "topic"])),
    ctx.locale,
  );
  return { answer, resp, latencyMs: Date.now() - t0, model };
}

const WINDOW_WORDS: Record<string, { good: string; caution: string }> = {
  en: { good: "your best time slot", caution: "the go-slow slot" },
  te: { good: "మంచి టైమ్‌", caution: "జాగ్రత్త టైమ్‌" },
  hi: { good: "अच्छे समय", caution: "धीमे समय" },
};

/** The model sometimes leaks window ids ("send it in g1", "c1 లో") into prose; swap them for words. */
export function scrubWindowIds<T>(answer: T, locale: string): T {
  const w = WINDOW_WORDS[locale] ?? WINDOW_WORDS.en;
  const keep = new Set(["best_window", "caution_window", "suggested_date", "topic"]);
  const fix = (s: string) =>
    s.replace(/(^|[^A-Za-z0-9_])([gc])([1-3])(?![A-Za-z0-9_])/g, (_m, pre: string, k: string) => pre + (k === "g" ? w.good : w.caution));
  const walk = (v: unknown, key = ""): unknown => {
    if (typeof v === "string") return keep.has(key) ? v : fix(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(answer) as T;
}

export function normalizeQuestion(q: string): string {
  return q.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}
