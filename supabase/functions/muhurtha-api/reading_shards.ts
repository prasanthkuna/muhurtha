/**
 * Split initial reading: Decode + current chapter first (shard A, small and fast), then the
 * Life Map chapters, the remaining days and the weeks/months/extras in parallel. Every shard
 * shares the same system + FACTS prefix (prompt-cached under one key) and writes only its ids;
 * the merged reading goes through the same sanitize -> validate -> one repair path.
 */
import {
  buildReadingSchema,
  buildUnionSchema,
  isV3,
  buildSystemPrompt,
  buildUserPrompt,
  type SchemaScope,
  type V2Content,
  type V2Facts,
} from "./reading_v2.ts";
import { createResponse, type ReasoningEffort, type ResponseObject, streamResponse } from "./openai_responses.ts";
import { compileContext, partInstructionV4, planPartsV4 } from "./reading_v4.ts";
import { isV4 } from "./reading_v2.ts";

export type ShardKey = "A" | "B" | "B2" | "C" | "C2" | "C3" | "D" | "F1" | "F2" | "L";
/** Chapter and day parts: bulk prose, effort tunable separately (READING_EFFORT_BULK). */
export const BULK_SHARDS: ShardKey[] = ["B", "B2", "C", "C2", "C3"];
export type ShardPlan = { key: ShardKey; scope: SchemaScope; maxTokens: number; note: string };

/** Effort for the structured reading; picked by the Luna eval (none vs low). */
export function readingEffort(): ReasoningEffort {
  const v = (Deno.env.get("READING_EFFORT") ?? "").trim();
  return v === "low" || v === "none" ? v : READING_EFFORT_DEFAULT;
}
/** Effort per part: A (first insight) and D use READING_EFFORT; chapters/days may use READING_EFFORT_BULK. */
export function shardEffort(key: ShardKey): ReasoningEffort {
  if (!BULK_SHARDS.includes(key)) return readingEffort();
  const v = (Deno.env.get("READING_EFFORT_BULK") ?? "").trim();
  return v === "low" || v === "none" ? v : readingEffort();
}
/** Delay between submitting part A and the rest, so A writes the shared prefix to the prompt cache first. */
export function shardStaggerMs(): number {
  const v = Number(Deno.env.get("SHARD_STAGGER_MS") ?? "");
  return Number.isFinite(v) && v >= 0 ? Math.min(v, 10_000) : 3000;
}
// Eval rd-1112a (3 profiles × en/te/hi): both pass; "none" had fewer validator flags (58 vs 81) at similar speed.
export const READING_EFFORT_DEFAULT: ReasoningEffort = "none";

export function planShards(f: V2Facts): ShardPlan[] {
  if (isV4(f)) return planPartsV4(f);
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
  if (isV3(f)) {
    const third = Math.ceil(restDays.length / 3);
    const keys: ShardKey[] = ["C", "C2", "C3"];
    keys.forEach((key, k) => {
      const ids = restDays.slice(k * third, (k + 1) * third);
      if (ids.length) plans.push({ key, scope: { days: ids }, maxTokens: 9000, note: "these days" });
    });
  } else {
    const half = Math.ceil(restDays.length / 2);
    plans.push({ key: "C", scope: { days: restDays.slice(0, half) }, maxTokens: 9000, note: "these days" });
    plans.push({ key: "C2", scope: { days: restDays.slice(half), weekdays: f.weekdays.map((w) => w.weekday) }, maxTokens: 9000, note: "these days and the weekday cards" });
  }
  plans.push({
    key: "D",
    scope: { weeks: f.weeks.map((w) => w.period_key), months: f.months.map((m) => m.period_key), extras: true },
    maxTokens: 5000,
    note: "the weeks, the months, the ask starters, the remedies and the push lines",
  });
  return plans;
}

export function shardInstruction(f: V2Facts, p: ShardPlan): string {
  if (isV4(f)) return partInstructionV4(f, p as Parameters<typeof partInstructionV4>[1]);
  const ids: string[] = [];
  if (p.scope.chapters?.length) ids.push(`chapters ${JSON.stringify(p.scope.chapters)}`);
  if (p.scope.days?.length) ids.push(`days ${JSON.stringify(p.scope.days)}`);
  if (p.scope.weekdays?.length) ids.push("all weekdays");
  if (p.scope.weeks?.length) ids.push("all weeks");
  if (p.scope.months?.length) ids.push("all months");
  const titles = p.key === "A" ? "" : ` Day titles must not repeat across the whole reading: vary the opening word by date.`;
  const v3 = isV3(f);
  const fill: string[] = [];
  if (v3) {
    if (p.scope.profile) fill.push("profile");
    if (p.scope.areas?.length) fill.push("areas (every area)");
    if (p.scope.extras) fill.push("ask_starters (4), remedies (3), push (all five keys, each with title and body)");
  }
  return [
    `PART ${p.key}: write ONLY ${p.note} (${ids.join("; ") || "as listed in the schema"}).`,
    ...(v3 ? [`Fill exactly: ${[...ids, ...fill].join("; ")}. Every other array stays empty ([]); profile stays null unless listed${p.scope.extras ? "" : "; push is required by the schema, so fill it with short placeholders (it is discarded)"}. Each listed id appears exactly once.`] : []),
    "Other parts of the same reading are written in parallel from the same FACTS; follow every rule exactly as for the full reading." + titles,
    `Language: ${f.locale}.`,
  ].join("\n");
}

let lengthsOk: boolean | null = null;

export async function shardCall(
  f: V2Facts,
  p: ShardPlan,
  o: { background: boolean; effort?: ReasoningEffort; metadata?: Record<string, string>; cacheKey?: string; timeoutMs?: number; content?: Partial<V2Content> | null; stream?: { onFirstToken?: (ms: number) => void } },
): Promise<ResponseObject> {
  if (isV4(f)) {
    // v4: a compiled, part-specific context and a compact part schema (no union schema, no
    // placeholder fields). One-off prompts: no prompt-cache writes.
    const compiled = compileContext(f, p as Parameters<typeof compileContext>[1], o.content);
    const req = (withLengths: boolean) => ({
      system: buildSystemPrompt(f),
      user: compiled.user + "\n\n" + shardInstruction(f, p),
      schemaName: `muhurta_part_${p.key.toLowerCase()}`,
      schema: buildReadingSchema(f, { withLengths, scope: p.scope }),
      background: o.background,
      reasoningEffort: o.effort ?? shardEffort(p.key),
      maxOutputTokens: p.maxTokens,
      metadata: o.metadata,
      timeoutMs: o.timeoutMs,
      promptCacheMode: "explicit" as const,
    });
    const run = (withLengths: boolean) => o.stream && !o.background
      ? streamResponse(req(withLengths), { onDelta: () => {}, onFirstToken: o.stream.onFirstToken })
      : createResponse(req(withLengths));
    if (lengthsOk !== false) {
      try {
        const r = await run(true);
        lengthsOk = true;
        return r;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/maxLength|max_length|not permitted|unsupported/i.test(msg) || !/:400:/.test(msg)) throw e;
        lengthsOk = false;
      }
    }
    return run(false);
  }
  const go = (withLengths: boolean) =>
    createResponse({
      system: buildSystemPrompt(f),
      prefix: buildUserPrompt(f),
      user: shardInstruction(f, p),
      schemaName: isV3(f) ? "muhurta_reading" : `muhurta_reading_${p.key.toLowerCase()}`,
      schema: isV3(f) ? buildUnionSchema(f, withLengths) : buildReadingSchema(f, { withLengths, scope: p.scope }),
      background: o.background,
      reasoningEffort: o.effort ?? shardEffort(p.key),
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

/** Ids a part was asked for but did not return (union schema allows empty arrays). */
export function shardMissing(p: ShardPlan, c: Partial<V2Content> | null): string[] {
  if (!c) return ["all"];
  const miss: string[] = [];
  const have = (arr: unknown[] | undefined, key: string) => new Set((arr ?? []).map((x) => String((x as Record<string, unknown>)[key])));
  const days = have(c.days, "date");
  for (const d of p.scope.days ?? []) if (!days.has(d)) miss.push(d);
  const ch = have(c.chapters, "chapter_id");
  for (const id of p.scope.chapters ?? []) if (!ch.has(String(id))) miss.push(`ch${id}`);
  const wk = have(c.weeks, "period_key");
  for (const id of p.scope.weeks ?? []) if (!wk.has(id)) miss.push(`w${id}`);
  const mo = have(c.months, "period_key");
  for (const id of p.scope.months ?? []) if (!mo.has(id)) miss.push(`m${id}`);
  const ar = have(c.areas, "area_id");
  for (const id of p.scope.areas ?? []) if (!ar.has(id)) miss.push(`a:${id}`);
  if (p.scope.profile && !c.profile) miss.push("profile");
  if (p.scope.extras && (!c.push || !(c.remedies ?? []).length || !(c.ask_starters ?? []).length)) miss.push("extras");
  return miss;
}

/** Keep only what a part was asked to write (a union-schema part may stray into other ids). */
export function shardOnly(p: ShardPlan, c: Partial<V2Content>): Partial<V2Content> {
  const inSet = <T>(arr: T[] | undefined, ids: (string | number)[] | undefined, key: string) =>
    (arr ?? []).filter((x) => (ids ?? []).map(String).includes(String((x as Record<string, unknown>)[key])));
  return {
    profile: p.scope.profile ? c.profile : undefined,
    areas: inSet(c.areas, p.scope.areas, "area_id"),
    chapters: inSet(c.chapters, p.scope.chapters, "chapter_id"),
    days: inSet(c.days, p.scope.days, "date"),
    weekdays: inSet(c.weekdays, p.scope.weekdays, "weekday"),
    weeks: inSet(c.weeks, p.scope.weeks, "period_key"),
    months: inSet(c.months, p.scope.months, "period_key"),
    ask_starters: p.scope.extras ? c.ask_starters : [],
    remedies: p.scope.extras ? c.remedies : [],
    push: p.scope.extras ? c.push : undefined,
  } as Partial<V2Content>;
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
