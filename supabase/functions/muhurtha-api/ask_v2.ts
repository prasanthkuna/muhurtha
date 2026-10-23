/**
 * Real AI Ask: one small strict-schema call per question, grounded in the chart's reading
 * (profile, current chapter, the day's card) and the engine's live windows. Times are
 * engine-owned: the model picks a window id and the server prints the clock times.
 */
import { createResponse, readingModel, type ResponseObject } from "./openai_responses.ts";

export const ASK_V2_PROMPT_VERSION = "ask-v2.1";

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
    `You are Muhurta's Ask guide. Answer in ${LANG[ctx.locale]} only, warm and specific, like a wise friend who knows Jyotisha.`,
    "Ground every answer in the CONTEXT (profile, current chapter, today's card, upcoming days). Do not invent planets, dashas, dates or times beyond it.",
    "Never write clock times; pick best_window / caution_window ids instead and the app shows the times.",
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
  const answer = JSON.parse(resp.output_text) as AskLlmAnswer;
  return { answer, resp, latencyMs: Date.now() - t0, model };
}

export function normalizeQuestion(q: string): string {
  return q.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}
