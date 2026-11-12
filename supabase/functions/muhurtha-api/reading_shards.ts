/**
 * Split initial reading: Decode + current chapter first (shard A, small and fast), then the
 * Life Map chapters, the remaining days and the weeks/months/extras in parallel. Every shard
 * shares the same system + FACTS prefix (prompt-cached under one key) and writes only its ids;
 * the merged reading goes through the same sanitize -> validate -> one repair path.
 */
import {
  buildReadingSchema,
  buildSystemPrompt,
  buildUserPrompt,
  type SchemaScope,
  type V2Content,
  type V2Facts,
} from "./reading_v2.ts";
import { createResponse, type ReasoningEffort, type ResponseObject } from "./openai_responses.ts";

export type ShardKey = "A" | "B" | "B2" | "C" | "C2" | "D";
export type ShardPlan = { key: ShardKey; scope: SchemaScope; maxTokens: number; note: string };

/** Effort for the structured reading; picked by the Luna eval (none vs low). */
export function readingEffort(): ReasoningEffort {
  const v = (Deno.env.get("READING_EFFORT") ?? "").trim();
  return v === "low" || v === "none" ? v : READING_EFFORT_DEFAULT;
}
export const READING_EFFORT_DEFAULT: ReasoningEffort = "low";

export function planShards(f: V2Facts): ShardPlan[] {
  const cur = f.current_chapter_id;
  const dayIds = f.days.map((d) => d.date);
  const firstDays = dayIds.slice(0, 3);
  const restDays = dayIds.slice(3);
  const otherCh = f.chapters.map((c) => c.chapter_id).filter((id) => id !== cur);
  const plans: ShardPlan[] = [
    {
      key: "A",
      scope: { profile: true, areas: f.area_ids, chapters: cur == null ? [] : [cur], days: firstDays },
      maxTokens: 7000,
      note: "the personality profile, every life area, the CURRENT chapter and the first three days",
    },
  ];
  if (otherCh.length > 14) {
    const half = Math.ceil(otherCh.length / 2);
    plans.push({ key: "B", scope: { chapters: otherCh.slice(0, half) }, maxTokens: 7000, note: "these life chapters" });
    plans.push({ key: "B2", scope: { chapters: otherCh.slice(half) }, maxTokens: 7000, note: "these life chapters" });
  } else if (otherCh.length) {
    plans.push({ key: "B", scope: { chapters: otherCh }, maxTokens: 9000, note: "these life chapters" });
  }
  const half = Math.ceil(restDays.length / 2);
  plans.push({ key: "C", scope: { days: restDays.slice(0, half) }, maxTokens: 9000, note: "these days" });
  plans.push({ key: "C2", scope: { days: restDays.slice(half), weekdays: f.weekdays.map((w) => w.weekday) }, maxTokens: 9000, note: "these days and the weekday cards" });
  plans.push({
    key: "D",
    scope: { weeks: f.weeks.map((w) => w.period_key), months: f.months.map((m) => m.period_key), extras: true },
    maxTokens: 5000,
    note: "the weeks, the months, the ask starters, the remedies and the push lines",
  });
  return plans;
}

export function shardInstruction(f: V2Facts, p: ShardPlan): string {
  const ids: string[] = [];
  if (p.scope.chapters?.length) ids.push(`chapters ${JSON.stringify(p.scope.chapters)}`);
  if (p.scope.days?.length) ids.push(`days ${JSON.stringify(p.scope.days)}`);
  if (p.scope.weekdays?.length) ids.push("all weekdays");
  if (p.scope.weeks?.length) ids.push("all weeks");
  if (p.scope.months?.length) ids.push("all months");
  const titles = p.key === "A" ? "" : ` Day titles must not repeat across the whole reading: vary the opening word by date.`;
  return [
    `PART ${p.key}: write ONLY ${p.note} (${ids.join("; ") || "as listed in the schema"}).`,
    "Other parts of the same reading are written in parallel from the same FACTS; follow every rule exactly as for the full reading." + titles,
    `Language: ${f.locale}.`,
  ].join("\n");
}

let lengthsOk: boolean | null = null;

export async function shardCall(
  f: V2Facts,
  p: ShardPlan,
  o: { background: boolean; effort?: ReasoningEffort; metadata?: Record<string, string>; cacheKey?: string; timeoutMs?: number },
): Promise<ResponseObject> {
  const go = (withLengths: boolean) =>
    createResponse({
      system: buildSystemPrompt(f),
      prefix: buildUserPrompt(f),
      user: shardInstruction(f, p),
      schemaName: `muhurta_reading_${p.key.toLowerCase()}`,
      schema: buildReadingSchema(f, { withLengths, scope: p.scope }),
      background: o.background,
      reasoningEffort: o.effort ?? readingEffort(),
      maxOutputTokens: p.maxTokens,
      metadata: o.metadata,
      promptCacheKey: o.cacheKey,
      timeoutMs: o.timeoutMs,
    });
  if (lengthsOk !== false) {
    try {
      const r = await go(true);
      lengthsOk = true;
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/maxLength|max_length|not permitted|unsupported/i.test(msg) || !/:400:/.test(msg)) throw e;
      lengthsOk = false;
    }
  }
  return go(false);
}

/** Combine shard outputs into one reading (missing sections stay empty; validation catches them). */
export function mergeShards(parts: Partial<V2Content>[]): V2Content {
  const out: V2Content = {
    profile: undefined as unknown as V2Content["profile"],
    areas: [], chapters: [], days: [], weekdays: [], weeks: [], months: [], ask_starters: [], remedies: [],
    push: undefined as unknown as V2Content["push"],
  };
  for (const p of parts) {
    if (!p) continue;
    if (p.profile && !out.profile) out.profile = p.profile;
    if (p.push && !out.push) out.push = p.push;
    for (const k of ["areas", "chapters", "days", "weekdays", "weeks", "months", "ask_starters", "remedies"] as const) {
      const arr = p[k] as unknown[] | undefined;
      if (Array.isArray(arr)) (out[k] as unknown[]).push(...arr);
    }
  }
  out.chapters.sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id));
  out.days.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export type ReadingPreview = {
  profile: { title: string; summary: string; strengths: string[] } | null;
  chapter: { title: string; highlight: string; body: string; period: string } | null;
  today: { date: string; title: string; line: string } | null;
};

/** What Decode can show while the rest of the reading is still being written. */
export function previewFrom(f: V2Facts, a: Partial<V2Content> | null | undefined): ReadingPreview | null {
  if (!a) return null;
  const cf = f.chapters.find((c) => c.chapter_id === f.current_chapter_id);
  const ch = (a.chapters ?? []).find((c) => Number(c.chapter_id) === f.current_chapter_id);
  const d = (a.days ?? []).find((x) => x.date === f.generation_date) ?? (a.days ?? [])[0];
  return {
    profile: a.profile ? { title: a.profile.title, summary: a.profile.summary, strengths: (a.profile.strengths ?? []).slice(0, 3) } : null,
    chapter: ch ? { title: ch.title, highlight: ch.highlight, body: ch.body, period: cf?.period ?? "" } : null,
    today: d ? { date: d.date, title: d.title, line: d.line } : null,
  };
}
