/**
 * Reading v2: one strict-schema LLM call per (birth details, language).
 *
 * The engine owns every fact (dates, window ids and clock times, dasha lords, periods);
 * the model only writes prose keyed by those ids. Pure module: schema, prompt,
 * validation/repair selection, sanitizing, the legacy-compatible view and the
 * zero-call adapter for readings written by the old 6-phase pack pipeline.
 */
import { DATE_RULE, polishDeep, VOICE_BLOCK } from "./voice.ts";
import { DateTime } from "luxon";
import { localizeGrahaNames } from "./planner.ts";

export const READING_SCHEMA_VERSION = 2;
export const READING_PROMPT_VERSION = "reading-v2.3";

export type ReadingLocale = "en" | "te" | "hi";
export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const ADULT_AREAS = ["career", "money", "business", "relationship", "family", "health_routine"] as const;
export const CHILD_AREAS = ["temperament", "learning", "sleep_rhythm", "feeding_health", "bonding", "family"] as const;
export const ASK_TOPICS = ["work", "money", "relationship", "family", "health", "timing", "child"] as const;
export const WINDOW_IDS = ["g1", "g2", "g3", "c1"] as const;

// ---------------------------------------------------------------- facts (engine-owned)

export type V2WindowFact = { id: string; kind: "good" | "caution"; part: string };
export type V2DayFact = {
  date: string;
  weekday: Weekday;
  tithi: string;
  nakshatra: string;
  yoga: string;
  moon_sign: string;
  tara: string | null;
  day_tone: "supportive" | "mixed" | "careful";
  windows: V2WindowFact[];
};
export type V2WeekdayFact = { weekday: Weekday; day_lord: string; windows: V2WindowFact[] };
export type V2PeriodFact = {
  period_key: string;
  label: string;
  supportive_days: number;
  careful_days: number;
  notable: string[];
  chapter_id: number | null;
};
export type V2ChapterFact = {
  chapter_id: number;
  period: string;
  start_iso: string | null;
  end_iso: string | null;
  md: string;
  ad: string;
  tense: "past" | "current" | "future";
  domains: string[];
  support: string[];
  pressure: string[];
  pulse: string;
  transition: string;
  evidence: string;
  lenses: string[];
};
export type V2Facts = {
  schema_version: 2;
  locale: ReadingLocale;
  generation_date: string;
  timezone: string;
  is_child: boolean;
  age: number | null;
  life_stage: string;
  subject: { name: string | null; is_account_owner: boolean };
  natal: Record<string, unknown>;
  current_chapter_id: number | null;
  chapters: V2ChapterFact[];
  days: V2DayFact[];
  weekdays: V2WeekdayFact[];
  weeks: V2PeriodFact[];
  months: V2PeriodFact[];
  area_ids: string[];
};

// ---------------------------------------------------------------- content (LLM-owned)

export type V2WindowNote = { window_id: string; label: string; note: string };
export type V2DayCopy = {
  title: string;
  line: string;
  body: string;
  do: string[];
  avoid: string[];
  window_notes: V2WindowNote[];
};
export type V2Content = {
  profile: {
    title: string;
    summary: string;
    strengths: string[];
    watchouts: string[];
    work_style: string;
    relationship_style: string;
    share_line: string;
  };
  areas: { area_id: string; headline: string; summary: string }[];
  chapters: { chapter_id: number; title: string; highlight: string; body: string; share_line: string }[];
  days: (V2DayCopy & { date: string })[];
  weekdays: (V2DayCopy & { weekday: Weekday })[];
  weeks: { period_key: string; headline: string; body: string; caution: string }[];
  months: { period_key: string; headline: string; body: string; caution: string }[];
  ask_starters: { topic: string; question: string }[];
  remedies: { title: string; body: string }[];
  push: Record<PushKey, { title: string; body: string }>;
};
export type PushKey = "today_ready" | "good_soon" | "good_start" | "caution_soon" | "caution_start";
export const PUSH_KEYS: PushKey[] = ["today_ready", "good_soon", "good_start", "caution_soon", "caution_start"];

/** Character limits (enforced in schema when supported, always enforced in sanitize). */
export const LIMITS = {
  title: 60,
  line: 150,
  dayBody: 340,
  chip: 48,
  label: 28,
  note: 130,
  profileSummary: 460,
  trait: 100,
  style: 220,
  share: 120,
  areaHeadline: 80,
  areaSummary: 320,
  chapterHighlight: 170,
  chapterBody: 560,
  periodHeadline: 80,
  periodBody: 320,
  periodCaution: 130,
  remedyTitle: 50,
  remedyBody: 230,
  pushTitle: 50,
  pushBody: 130,
  question: 90,
} as const;

// ---------------------------------------------------------------- schema

type Json = Record<string, unknown>;
const str = (max: number, withLengths: boolean, description?: string): Json => ({
  type: "string",
  ...(withLengths ? { maxLength: max } : {}),
  ...(description ? { description: `${description} (max ${max} chars)` } : { description: `max ${max} chars` }),
});
const arr = (items: Json, n: number | [number, number]): Json => ({
  type: "array",
  items,
  minItems: Array.isArray(n) ? n[0] : n,
  maxItems: Array.isArray(n) ? n[1] : n,
});
const obj = (props: Record<string, Json>): Json => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

function windowNotesSchema(wl: boolean): Json {
  return arr(
    obj({
      window_id: { type: "string", enum: [...WINDOW_IDS] },
      label: str(LIMITS.label, wl, "2-4 word purpose label for this window, e.g. 'Calls & follow-ups'"),
      note: str(LIMITS.note, wl, "why this window suits / does not suit things today; no clock times"),
    }),
    [1, 4],
  );
}

function dayCopyProps(wl: boolean): Record<string, Json> {
  return {
    title: str(LIMITS.title, wl, "headline for the day"),
    line: str(LIMITS.line, wl, "one-sentence takeaway"),
    body: str(LIMITS.dayBody, wl, "2-3 sentences"),
    do: arr(str(LIMITS.chip, wl, "short concrete action"), 2),
    avoid: arr(str(LIMITS.chip, wl, "short concrete thing to skip"), 2),
    window_notes: windowNotesSchema(wl),
  };
}

function periodSchema(keys: string[], wl: boolean): Json {
  return obj({
    period_key: { type: "string", enum: keys },
    headline: str(LIMITS.periodHeadline, wl),
    body: str(LIMITS.periodBody, wl, "2-3 sentences"),
    caution: str(LIMITS.periodCaution, wl, "one watch-out"),
  });
}

export type SchemaScope = {
  days?: string[];
  weekdays?: Weekday[];
  chapters?: number[];
  weeks?: string[];
  months?: string[];
  areas?: string[];
};

/** Full reading schema, or a repair schema restricted to `scope` ids. */
export function buildReadingSchema(facts: V2Facts, opts: { withLengths: boolean; scope?: SchemaScope }): Json {
  const wl = opts.withLengths;
  const scope = opts.scope;
  const dayIds = scope ? scope.days ?? [] : facts.days.map((d) => d.date);
  const wdIds = scope ? scope.weekdays ?? [] : facts.weekdays.map((d) => d.weekday);
  const chIds = scope ? scope.chapters ?? [] : facts.chapters.map((c) => c.chapter_id);
  const wkIds = scope ? scope.weeks ?? [] : facts.weeks.map((w) => w.period_key);
  const moIds = scope ? scope.months ?? [] : facts.months.map((m) => m.period_key);
  const arIds = scope ? scope.areas ?? [] : facts.area_ids;
  const props: Record<string, Json> = {};
  if (!scope) {
    props.profile = obj({
      title: str(LIMITS.title, wl, "who this person is, as a short title"),
      summary: str(LIMITS.profileSummary, wl, "3-4 sentences, specific to the natal facts"),
      strengths: arr(str(LIMITS.trait, wl), 3),
      watchouts: arr(str(LIMITS.trait, wl), 3),
      work_style: str(LIMITS.style, wl),
      relationship_style: str(LIMITS.style, wl),
      share_line: str(LIMITS.share, wl, "a warm line someone would share"),
    });
  }
  if (arIds.length) {
    props.areas = arr(obj({
      area_id: { type: "string", enum: arIds },
      headline: str(LIMITS.areaHeadline, wl),
      summary: str(LIMITS.areaSummary, wl, "2-3 sentences for the current chapter"),
    }), arIds.length);
  }
  if (chIds.length) {
    props.chapters = arr(obj({
      chapter_id: { type: "integer", enum: chIds },
      title: str(LIMITS.title, wl, "chapter title, no planet names"),
      highlight: str(LIMITS.chapterHighlight, wl, "one sentence"),
      body: str(LIMITS.chapterBody, wl, "past: 1-2 sentences; current/future: 3-4 sentences"),
      share_line: str(LIMITS.share, wl),
    }), chIds.length);
  }
  if (dayIds.length) {
    props.days = arr(obj({ date: { type: "string", enum: dayIds }, ...dayCopyProps(wl) }), dayIds.length);
  }
  if (wdIds.length) {
    props.weekdays = arr(obj({ weekday: { type: "string", enum: wdIds }, ...dayCopyProps(wl) }), wdIds.length);
  }
  if (wkIds.length) props.weeks = arr(periodSchema(wkIds, wl), wkIds.length);
  if (moIds.length) props.months = arr(periodSchema(moIds, wl), moIds.length);
  if (!scope) {
    props.ask_starters = arr(obj({
      topic: { type: "string", enum: [...ASK_TOPICS] },
      question: str(LIMITS.question, wl, "a question this person would actually ask, first person"),
    }), 4);
    props.remedies = arr(obj({
      title: str(LIMITS.remedyTitle, wl),
      body: str(LIMITS.remedyBody, wl, "a simple, safe, practical or devotional habit; no purchases, no fear"),
    }), 3);
    const pushItem = obj({ title: str(LIMITS.pushTitle, wl), body: str(LIMITS.pushBody, wl) });
    props.push = obj(Object.fromEntries(PUSH_KEYS.map((k) => [k, pushItem])));
  }
  return obj(props);
}

// ---------------------------------------------------------------- prompt

const LANGUAGE_NAME: Record<ReadingLocale, string> = {
  en: "English",
  te: "Telugu (తెలుగు script)",
  hi: "Hindi (देवनागरी script)",
};

export const BANNED_PHRASES: Record<ReadingLocale, string[]> = {
  en: [
    "this phase turned the story",
    "slow but solid results",
    "showing up with dignity",
    "perfection pressure",
    "the universe",
    "cosmic energy",
    "stars align",
    "the stars say",
    "caution span",
    "rahu kalam is better",
    "good vibes",
    "manifest",
    "auspicious",
    "favourable",
    "favorable",
    "energies",
    "harness",
    "navigate",
    "delve",
    "tapestry",
    "embark",
  ],
  te: [
    "వైపు మలుపు తిరిగిన దశ",
    "ఫాలోఅప్",
    "ఇది పిల్లల దశ కాబట్టి",
    "విశ్వం",
    "నక్షత్రాలు చెబుతున్నాయి",
    "శుభప్రదమైన",
    "అనుకూలమైన కాలం",
    "సమయ విండో",
  ],
  hi: [
    "ब्रह्मांड",
    "सितारे कहते हैं",
    "कॉस्मिक",
    "की ओर मुड़ा दौर",
  ],
};

export function buildSystemPrompt(facts: V2Facts): string {
  const lang = LANGUAGE_NAME[facts.locale];
  const child = facts.is_child;
  return [
    `You write a personal Vedic-astrology reading for the Muhurta app. Write EVERYTHING in ${lang}.` +
    (facts.locale === "en" ? "" : ` Write natively in ${lang} (not a translation); everyday words, not Sanskrit-heavy. Common English words like 'Pro' are fine, but sentences must be in ${lang} script.`),
    "Voice: warm, specific, everyday, a little playful. Short sentences. Second person ('you') for the account owner; for another person use their name.",
    VOICE_BLOCK[facts.locale],
    DATE_RULE,
    "Rules:",
    "1. The engine owns all facts. Never write clock times, durations in hours, years, dates, ages or planet/graha names in days, weekdays, weeks, months or push. Planet names are allowed only inside chapters and profile, and only when they help.",
    "2. Every day must read differently: use that day's tithi, nakshatra, yoga, moon sign, tara and day_tone to choose a different angle, title and chips. Never reuse a title, opening phrase or chip across days. Do not mention the weekday name in day titles.",
    "3. window_notes: write one note for every window id listed for that day/weekday (and no others). Good windows (g*) say what to use them for; c1 is the traditional caution window: say what to keep routine. Never write times; the app shows them.",
    "4. weekdays are evergreen cards used after the dated days run out: write for that weekday in general, no tithi/nakshatra references.",
    "5. chapters: use the chapter facts (period, lords, support, pressure, domains). Past chapters: 1-2 reflective sentences. Current chapter: most detail. Future: what to prepare. Each chapter title must be unique.",
    "6. weeks/months: use the counts and notable days given; each period must differ.",
    child
      ? "7. This is a child's chart: speak to the parent about the child. Areas are child areas. No career, money, romance or marriage. No fear, no medical claims; never suggest delaying care."
      : "7. No fear, no guaranteed outcomes, no medical, legal or financial certainty. Remedies are simple habits, prayers or kindness; never purchases or gemstones.",
    `8. Never use these phrases: ${BANNED_PHRASES[facts.locale].concat(facts.locale === "en" ? [] : BANNED_PHRASES.en.slice(0, 4)).map((p) => `"${p}"`).join(", ")}.`,
    "9. Respect every max length. Be concrete; no filler. Do not copy the engine's English phrases from FACTS word for word: say the same idea in your own natural words.",
    "10. Emoji: at most one, and only in push titles/bodies or share_line. None elsewhere.",
  ].join("\n");
}

export function buildUserPrompt(facts: V2Facts): string {
  return "FACTS (JSON):\n" + JSON.stringify(facts);
}

// ---------------------------------------------------------------- sanitize

function clip(s: unknown, max: number): string {
  let t = typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("। "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (stop > max * 0.6) return cut.slice(0, stop + 1).trim();
  const sp = cut.lastIndexOf(" ");
  t = (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim();
  return t.replace(/[,;:–-]+$/, "") + "…";
}

const CLOCK_RE = /\b\d{1,2}[:.]\d{2}\s*(?:am|pm|AM|PM)?\b|\b\d{1,2}\s*(?:am|pm|AM|PM)\b/g;

function cleanDayCopy<T extends V2DayCopy>(d: T, allowedWindows: Set<string> | null): T {
  const notes = (Array.isArray(d.window_notes) ? d.window_notes : [])
    .filter((n) => n && (!allowedWindows || allowedWindows.has(n.window_id)))
    .filter((n, i, all) => all.findIndex((x) => x.window_id === n.window_id) === i)
    .map((n) => ({
      window_id: n.window_id,
      label: clip(String(n.label ?? "").replace(CLOCK_RE, ""), LIMITS.label),
      note: clip(String(n.note ?? "").replace(CLOCK_RE, ""), LIMITS.note),
    }));
  return {
    ...d,
    title: clip(d.title, LIMITS.title),
    line: clip(String(d.line ?? "").replace(CLOCK_RE, ""), LIMITS.line),
    body: clip(String(d.body ?? "").replace(CLOCK_RE, ""), LIMITS.dayBody),
    do: (d.do ?? []).slice(0, 2).map((x) => clip(x, LIMITS.chip)),
    avoid: (d.avoid ?? []).slice(0, 2).map((x) => clip(x, LIMITS.chip)),
    window_notes: notes,
  };
}

const POLISH_SKIP = new Set(["date", "weekday", "window_id", "area_id", "period_key", "topic"]);

export function sanitizeContent(c: V2Content, facts: V2Facts): V2Content {
  return polishDeep(sanitizeRaw(c, facts), facts.locale, POLISH_SKIP);
}

function sanitizeRaw(c: V2Content, facts: V2Facts): V2Content {
  const dayWin = new Map(facts.days.map((d) => [d.date, new Set(d.windows.map((w) => w.id))]));
  const wdWin = new Map(facts.weekdays.map((d) => [d.weekday, new Set(d.windows.map((w) => w.id))]));
  const period = (p: V2Content["weeks"][number]) => ({
    period_key: p.period_key,
    headline: clip(p.headline, LIMITS.periodHeadline),
    body: clip(String(p.body ?? "").replace(CLOCK_RE, ""), LIMITS.periodBody),
    caution: clip(p.caution, LIMITS.periodCaution),
  });
  return {
    profile: {
      title: clip(c.profile?.title, LIMITS.title),
      summary: clip(c.profile?.summary, LIMITS.profileSummary),
      strengths: (c.profile?.strengths ?? []).map((s) => clip(s, LIMITS.trait)),
      watchouts: (c.profile?.watchouts ?? []).map((s) => clip(s, LIMITS.trait)),
      work_style: clip(c.profile?.work_style, LIMITS.style),
      relationship_style: clip(c.profile?.relationship_style, LIMITS.style),
      share_line: clip(c.profile?.share_line, LIMITS.share),
    },
    areas: (c.areas ?? []).map((a) => ({
      area_id: a.area_id,
      headline: clip(a.headline, LIMITS.areaHeadline),
      summary: clip(a.summary, LIMITS.areaSummary),
    })),
    chapters: (c.chapters ?? []).map((ch) => ({
      chapter_id: Number(ch.chapter_id),
      title: clip(ch.title, LIMITS.title),
      highlight: clip(ch.highlight, LIMITS.chapterHighlight),
      body: clip(ch.body, LIMITS.chapterBody),
      share_line: clip(ch.share_line, LIMITS.share),
    })),
    days: (c.days ?? []).map((d) => cleanDayCopy(d, dayWin.get(d.date) ?? null)),
    weekdays: (c.weekdays ?? []).map((d) => cleanDayCopy(d, wdWin.get(d.weekday) ?? null)),
    weeks: (c.weeks ?? []).map(period),
    months: (c.months ?? []).map(period),
    ask_starters: (c.ask_starters ?? []).map((a) => ({ topic: a.topic, question: clip(a.question, LIMITS.question) })),
    remedies: (c.remedies ?? []).map((r) => ({ title: clip(r.title, LIMITS.remedyTitle), body: clip(r.body, LIMITS.remedyBody) })),
    push: Object.fromEntries(PUSH_KEYS.map((k) => [k, {
      title: clip(c.push?.[k]?.title, LIMITS.pushTitle),
      body: clip(String(c.push?.[k]?.body ?? "").replace(CLOCK_RE, ""), LIMITS.pushBody),
    }])) as V2Content["push"],
  };
}

// ---------------------------------------------------------------- validation

export type Flag = { section: keyof SchemaScope; id: string | number; reasons: string[] };
export type Validation = {
  ok: boolean;
  fatal: string[];
  flags: Flag[];
  stats: Record<string, number>;
};

const SCRIPT_RE: Record<ReadingLocale, RegExp | null> = {
  en: null,
  te: /[\u0C00-\u0C7F]/g,
  hi: /[\u0900-\u097F]/g,
};
const LETTER_RE = /\p{L}/gu;
const PLANET_RE: Record<ReadingLocale, RegExp> = {
  en: /\b(saturn|jupiter|mars|mercury|venus|rahu(?!\s*kal)|ketu|graha)\b/i,
  te: /(రాహు(?!\s*కాల)|కేతు|బృహస్పతి|కుజుడు|శనిగ్రహ|శని గ్రహ|గ్రహం)/,
  hi: /(राहु(?!\s*काल)|केतु|बृहस्पति|शनि ग्रह|मंगल ग्रह|ग्रह )/,
};
const YEAR_RE = /\b(19|20)\d{2}\b/;
const TIME_RE: RegExp[] = [
  /\b\d{1,2}[:.]\d{2}\b/,
  /\b\d{1,2}\s?(am|pm)\b/i,
  /\d+\s*గంట/,
  /\d+\s*बजे/,
];

function scriptShare(text: string, locale: ReadingLocale): number {
  const re = SCRIPT_RE[locale];
  if (!re) return 1;
  const letters = text.match(LETTER_RE)?.length ?? 0;
  if (letters < 6) return 1;
  return (text.match(re)?.length ?? 0) / letters;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
}

function shingles(text: string, n = 3): Set<string> {
  const t = tokenize(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function dayText(d: V2DayCopy): string {
  return [d.title, d.line, d.body, ...(d.do ?? []), ...(d.avoid ?? []), ...(d.window_notes ?? []).map((n) => `${n.label} ${n.note}`)].join(" ");
}

export function validateContent(c: V2Content | null, facts: V2Facts): Validation {
  const fatal: string[] = [];
  const flagMap = new Map<string, Flag>();
  const flag = (section: Flag["section"], id: string | number, reason: string) => {
    const k = `${section}:${id}`;
    const f = flagMap.get(k) ?? { section, id, reasons: [] };
    if (!f.reasons.includes(reason)) f.reasons.push(reason);
    flagMap.set(k, f);
  };
  if (!c || typeof c !== "object") return { ok: false, fatal: ["not_object"], flags: [], stats: {} };
  const locale = facts.locale;

  // Coverage (engine ids must all be present exactly once).
  const need = (name: string, got: unknown[], want: (string | number)[], idOf: (x: never) => string | number) => {
    const ids = (got ?? []).map((x) => idOf(x as never));
    const missing = want.filter((w) => !ids.includes(w));
    if (missing.length) fatal.push(`${name}_missing:${missing.slice(0, 5).join(",")}${missing.length > 5 ? "…" : ""}`);
    if (new Set(ids).size !== ids.length) fatal.push(`${name}_duplicate_ids`);
  };
  need("days", c.days, facts.days.map((d) => d.date), (x: { date: string }) => x.date);
  need("weekdays", c.weekdays, facts.weekdays.map((d) => d.weekday), (x: { weekday: string }) => x.weekday);
  need("chapters", c.chapters, facts.chapters.map((d) => d.chapter_id), (x: { chapter_id: number }) => Number(x.chapter_id));
  need("weeks", c.weeks, facts.weeks.map((d) => d.period_key), (x: { period_key: string }) => x.period_key);
  need("months", c.months, facts.months.map((d) => d.period_key), (x: { period_key: string }) => x.period_key);
  need("areas", c.areas, facts.area_ids, (x: { area_id: string }) => x.area_id);
  if (!c.profile?.summary) fatal.push("profile_missing");
  if (!c.push || PUSH_KEYS.some((k) => !c.push[k]?.title)) fatal.push("push_missing");

  const banned = BANNED_PHRASES[locale].concat(locale === "en" ? [] : BANNED_PHRASES.en);
  const checkText = (section: Flag["section"], id: string | number, text: string, strictFacts: boolean) => {
    const low = text.toLowerCase();
    for (const p of banned) if (low.includes(p.toLowerCase())) flag(section, id, `banned:${p}`);
    if (scriptShare(text, locale) < 0.6) flag(section, id, "wrong_script");
    if (strictFacts) {
      if (TIME_RE.some((re) => re.test(text))) flag(section, id, "clock_time");
      if (PLANET_RE[locale].test(text)) flag(section, id, "planet_name");
      if (YEAR_RE.test(text)) flag(section, id, "year");
    }
  };

  const dayWin = new Map(facts.days.map((d) => [d.date, d.windows.map((w) => w.id)]));
  const wdWin = new Map(facts.weekdays.map((d) => [d.weekday, d.windows.map((w) => w.id)]));
  const titleSeen = new Map<string, number>();
  const openSeen = new Map<string, number>();
  const chipSeen = new Map<string, number>();
  const prior: { id: string; sh: Set<string> }[] = [];
  let maxSim = 0;
  const dayLike: { section: "days" | "weekdays"; id: string; d: V2DayCopy; wins: string[] }[] = [
    ...(c.days ?? []).map((d) => ({ section: "days" as const, id: d.date, d, wins: dayWin.get(d.date) ?? [] })),
    ...(c.weekdays ?? []).map((d) => ({ section: "weekdays" as const, id: d.weekday, d, wins: wdWin.get(d.weekday) ?? [] })),
  ];
  for (const { section, id, d, wins } of dayLike) {
    const text = dayText(d);
    checkText(section, id, text, true);
    if (!d.title || !d.body || (d.body ?? "").length < 40) flag(section, id, "too_thin");
    const noteIds = new Set((d.window_notes ?? []).map((n) => n.window_id));
    if (wins.some((w) => !noteIds.has(w))) flag(section, id, "window_note_missing");
    const t = tokenize(d.title ?? "").join(" ");
    titleSeen.set(t, (titleSeen.get(t) ?? 0) + 1);
    if ((titleSeen.get(t) ?? 0) > 1) flag(section, id, "title_repeat");
    const open = tokenize(d.line ?? "").slice(0, 3).join(" ");
    openSeen.set(open, (openSeen.get(open) ?? 0) + 1);
    if (open && (openSeen.get(open) ?? 0) > 2) flag(section, id, "opening_repeat");
    for (const chip of [...(d.do ?? []), ...(d.avoid ?? [])]) {
      const k = tokenize(chip).join(" ");
      chipSeen.set(k, (chipSeen.get(k) ?? 0) + 1);
      if ((chipSeen.get(k) ?? 0) > 3) flag(section, id, "chip_overused");
    }
    const sh = shingles(`${d.line} ${d.body}`);
    let similarTo: string | null = null;
    for (const p of prior) {
      const s = jaccard(sh, p.sh);
      maxSim = Math.max(maxSim, s);
      if (s >= 0.35 && !similarTo) similarTo = p.id;
    }
    if (similarTo) flag(section, id, `similar_to:${similarTo}`);
    prior.push({ id: String(id), sh });
  }

  const chapterTitles = new Map<string, number>();
  for (const ch of c.chapters ?? []) {
    checkText("chapters", Number(ch.chapter_id), [ch.title, ch.highlight, ch.body, ch.share_line].join(" "), false);
    const k = tokenize(ch.title ?? "").join(" ");
    chapterTitles.set(k, (chapterTitles.get(k) ?? 0) + 1);
    if ((chapterTitles.get(k) ?? 0) > 1) flag("chapters", Number(ch.chapter_id), "title_repeat");
    if (YEAR_RE.test(`${ch.title} ${ch.highlight} ${ch.body}`)) flag("chapters", Number(ch.chapter_id), "year");
    if (TIME_RE.some((re) => re.test(ch.body ?? ""))) flag("chapters", Number(ch.chapter_id), "clock_time");
  }
  const chapterShingles = (c.chapters ?? []).map((ch) => ({ id: Number(ch.chapter_id), sh: shingles(`${ch.highlight} ${ch.body}`) }));
  for (let i = 0; i < chapterShingles.length; i++) {
    for (let j = 0; j < i; j++) {
      if (jaccard(chapterShingles[i].sh, chapterShingles[j].sh) >= 0.35) flag("chapters", chapterShingles[i].id, "similar_chapter");
    }
  }
  for (const w of c.weeks ?? []) checkText("weeks", w.period_key, [w.headline, w.body, w.caution].join(" "), true);
  for (const m of c.months ?? []) checkText("months", m.period_key, [m.headline, m.body, m.caution].join(" "), true);
  for (const a of c.areas ?? []) checkText("areas", a.area_id, [a.headline, a.summary].join(" "), false);

  const flags = [...flagMap.values()];
  return {
    ok: fatal.length === 0,
    fatal,
    flags,
    stats: {
      days: c.days?.length ?? 0,
      weekdays: c.weekdays?.length ?? 0,
      chapters: c.chapters?.length ?? 0,
      flagged: flags.length,
      max_day_similarity: Math.round(maxSim * 100) / 100,
    },
  };
}

/** Which flagged ids are worth one targeted repair call. */
export function repairScope(v: Validation): SchemaScope | null {
  const scope: SchemaScope = {};
  for (const f of v.flags) {
    if (f.section === "days") (scope.days ??= []).push(String(f.id));
    else if (f.section === "weekdays") (scope.weekdays ??= []).push(f.id as Weekday);
    else if (f.section === "chapters") (scope.chapters ??= []).push(Number(f.id));
    else if (f.section === "weeks") (scope.weeks ??= []).push(String(f.id));
    else if (f.section === "months") (scope.months ??= []).push(String(f.id));
    else if (f.section === "areas") (scope.areas ??= []).push(String(f.id));
  }
  const n = Object.values(scope).reduce((s, a) => s + (a?.length ?? 0), 0);
  return n ? scope : null;
}

export function repairPrompt(facts: V2Facts, content: V2Content, v: Validation, scope: SchemaScope): string {
  const pick = <T extends Record<string, unknown>>(arr: T[], key: string, ids: unknown[] | undefined) =>
    (arr ?? []).filter((x) => ids?.includes(x[key] as never));
  const currentItems = {
    days: pick(content.days as never[], "date", scope.days),
    weekdays: pick(content.weekdays as never[], "weekday", scope.weekdays),
    chapters: pick(content.chapters as never[], "chapter_id", scope.chapters),
    weeks: pick(content.weeks as never[], "period_key", scope.weeks),
    months: pick(content.months as never[], "period_key", scope.months),
    areas: pick(content.areas as never[], "area_id", scope.areas),
  };
  const factItems = {
    days: facts.days.filter((d) => scope.days?.includes(d.date)),
    weekdays: facts.weekdays.filter((d) => scope.weekdays?.includes(d.weekday)),
    chapters: facts.chapters.filter((d) => scope.chapters?.includes(d.chapter_id)),
    weeks: facts.weeks.filter((d) => scope.weeks?.includes(d.period_key)),
    months: facts.months.filter((d) => scope.months?.includes(d.period_key)),
  };
  const keepTitles = (content.days ?? []).filter((d) => !scope.days?.includes(d.date)).map((d) => d.title);
  return [
    "Rewrite ONLY these items. Fix every listed problem and keep everything else about the rules.",
    "Problems:",
    ...v.flags.map((f) => `- ${f.section} ${f.id}: ${f.reasons.join(", ")}`),
    "similar_to/title_repeat/opening_repeat/chip_overused = make it clearly different from the rest; wrong_script = write fully in the target script; clock_time/planet_name/year = remove them.",
    `Titles already used elsewhere (do not reuse): ${JSON.stringify(keepTitles.slice(0, 40))}`,
    "FACTS for these items:",
    JSON.stringify(factItems),
    "CURRENT (flawed) items:",
    JSON.stringify(currentItems),
  ].join("\n");
}

export function mergeRepair(c: V2Content, patch: Partial<V2Content>): V2Content {
  const merge = <T extends Record<string, unknown>>(base: T[], upd: T[] | undefined, key: string): T[] => {
    if (!upd?.length) return base;
    const m = new Map(upd.map((u) => [String(u[key]), u]));
    return base.map((b) => m.get(String(b[key])) ?? b);
  };
  return {
    ...c,
    days: merge(c.days as never[], patch.days as never[], "date"),
    weekdays: merge(c.weekdays as never[], patch.weekdays as never[], "weekday"),
    chapters: merge(c.chapters as never[], patch.chapters as never[], "chapter_id"),
    weeks: merge(c.weeks as never[], patch.weeks as never[], "period_key"),
    months: merge(c.months as never[], patch.months as never[], "period_key"),
    areas: merge(c.areas as never[], patch.areas as never[], "area_id"),
  };
}

// ---------------------------------------------------------------- view (legacy-compatible content)

export type ViewOptions = { dateStr: string; tz: string; locale: ReadingLocale; daysBefore?: number; daysAfter?: number };

function chapterTense(f: V2ChapterFact, now: number): "past" | "current" | "future" {
  const s = f.start_iso ? Date.parse(f.start_iso) : NaN;
  const e = f.end_iso ? Date.parse(f.end_iso) : NaN;
  if (Number.isFinite(s) && Number.isFinite(e)) return now < s ? "future" : now >= e ? "past" : "current";
  return f.tense;
}

function windowNotesFor(d: V2DayCopy) {
  const byId = new Map((d.window_notes ?? []).map((n) => [n.window_id, n]));
  const good = ["g1", "g2", "g3"].map((id) => byId.get(id)).filter(Boolean).map((n) => ({
    category: n!.label,
    why_it_works: n!.note,
  }));
  const c1 = byId.get("c1");
  return {
    good_window_notes: good,
    caution_window_notes: c1 ? [{ category: c1.label, why_it_works: c1.note }] : [],
  };
}

function dayCard(key: string, d: V2DayCopy, source: "day" | "weekday", tone?: string) {
  return {
    key,
    ...(tone ? { tone } : {}),
    title: d.title,
    one_line: d.line,
    body: d.body,
    better_for: d.do ?? [],
    be_careful: d.avoid ?? [],
    ...windowNotesFor(d),
    source,
  };
}

/** Older te/hi facts carried English engine phrases; never surface them on te/hi screens. */
const NATIVE_VIEW = /[\u0900-\u097F\u0C00-\u0C7F]/;
function nativeView(loc: string, xs: string[] | undefined): string[] {
  const list = xs ?? [];
  return loc === "en" ? list : list.filter((s) => NATIVE_VIEW.test(s));
}

/** Build the content object today's PWA and engine readers understand. */
export function buildReadingView(raw: V2Content, facts: V2Facts, opts: ViewOptions): Record<string, unknown> {
  // Older stored readings (v2.2 and legacy) get the same last-mile voice fixes (human dates, no "window").
  const c = polishDeep(raw, opts.locale, POLISH_SKIP);
  const now = DateTime.fromISO(opts.dateStr, { zone: opts.tz }).set({ hour: 12 }).toMillis();
  const byDate = new Map((c.days ?? []).map((d) => [d.date, d]));
  const byWeekday = new Map((c.weekdays ?? []).map((d) => [d.weekday, d]));
  const toneByDate = new Map((facts.days ?? []).map((d) => [d.date, d.day_tone]));
  const start = DateTime.fromISO(opts.dateStr, { zone: opts.tz });
  const todayCards: Record<string, unknown>[] = [];
  for (let i = -(opts.daysBefore ?? 7); i <= (opts.daysAfter ?? 45); i++) {
    const dt = start.plus({ days: i });
    const key = dt.toISODate()!;
    const day = byDate.get(key);
    if (day) {
      todayCards.push(dayCard(key, day, "day", toneByDate.get(key)));
      continue;
    }
    const wd = byWeekday.get(WEEKDAYS[dt.weekday % 7]);
    if (wd) todayCards.push(dayCard(key, wd, "weekday"));
  }
  const chFacts = new Map(facts.chapters.map((f) => [f.chapter_id, f]));
  const chapters = [...(c.chapters ?? [])]
    .filter((ch) => chFacts.has(Number(ch.chapter_id)))
    .sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id));
  let firstFutureSeen = false;
  const journeyPhases = chapters.map((ch) => {
    const f = chFacts.get(Number(ch.chapter_id))!;
    const tense = chapterTense(f, now);
    const isFirstFuture = tense === "future" && !firstFutureSeen;
    if (tense === "future") firstFutureSeen = true;
    const sentences = (ch.body ?? "").split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);
    return {
      sortOrder: f.chapter_id,
      periodLabel: f.period,
      periodStart: f.start_iso,
      periodEnd: f.end_iso,
      mahadashaLord: f.md,
      antardashaLord: f.ad,
      title: ch.title,
      highlight: ch.highlight,
      sentences,
      evidenceLine: localizeGrahaNames(f.evidence, facts.locale),
      transitionNote: localizeGrahaNames(f.transition, facts.locale),
      focusAreas: nativeView(facts.locale, f.domains),
      pressureThemes: nativeView(facts.locale, f.pressure),
      domainLenses: f.lenses,
      shareHook: ch.share_line,
      tense,
      freePreview: tense === "current" || isFirstFuture,
    };
  });
  const journeyFacts = journeyPhases.map((p) => ({
    sortOrder: p.sortOrder,
    periodLabel: p.periodLabel,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    mahadashaLord: p.mahadashaLord,
    antardashaLord: p.antardashaLord,
    tense: p.tense,
    activeDomains: p.focusAreas,
    pressureThemes: p.pressureThemes,
    evidenceLine: p.evidenceLine,
    transitionNote: p.transitionNote,
    domainLenses: p.domainLenses,
  }));
  const weekKey = start.startOf("week").toISODate()!;
  const monthKey = opts.dateStr.slice(0, 7);
  const period = (p: V2Content["weeks"][number]) => ({
    key: p.period_key,
    title: p.headline,
    body: p.body,
    be_careful: p.caution ? [p.caution] : [],
  });
  const weekly = (c.weeks ?? []).filter((w) => w.period_key >= weekKey).map(period);
  const monthly = (c.months ?? []).filter((m) => m.period_key >= monthKey).map(period);
  const current = journeyPhases.find((p) => p.tense === "current");
  const fallbackHorizon = current
    ? { headline: current.title, body: current.highlight, caution: current.pressureThemes?.[0] ?? "" }
    : null;
  const week = c.weeks?.find((w) => w.period_key === weekKey);
  const month = c.months?.find((m) => m.period_key === monthKey);
  const p = c.push ?? ({} as V2Content["push"]);
  return {
    schema_version: READING_SCHEMA_VERSION,
    me_profile: {
      title: c.profile?.title,
      summary: c.profile?.summary,
      strengths: c.profile?.strengths ?? [],
      watchouts: c.profile?.watchouts ?? [],
      share_hook: c.profile?.share_line,
    },
    user_identity: {
      work_money_pattern: c.profile?.work_style,
      relationship_pattern: c.profile?.relationship_style,
    },
    category_reports: Object.fromEntries((c.areas ?? []).map((a) => [a.area_id, { headline: a.headline, summary: a.summary }])),
    journey_phases: journeyPhases,
    journey_phase_facts: journeyFacts,
    today_cards: todayCards,
    weekly_cards: weekly,
    monthly_cards: monthly,
    horizons: {
      week: week ? { headline: week.headline, body: week.body, caution: week.caution } : fallbackHorizon,
      month: month ? { headline: month.headline, body: month.body, caution: month.caution } : fallbackHorizon,
    },
    remedy_cards: (c.remedies ?? []).map((r, i) => ({ key: `remedy_${i + 1}`, title: r.title, body: r.body })),
    ask_templates: (c.ask_starters ?? []).map((a) => ({ key: a.topic, question: a.question })),
    notification_copy: {
      today_ready: p.today_ready,
      good_time_reminder: p.good_soon,
      good_time_start: p.good_start,
      caution_time_reminder: p.caution_soon,
      caution_start: p.caution_start,
    },
    is_child_chart: facts.is_child,
    _generation: { phases_done: ["v2"], schema_version: READING_SCHEMA_VERSION },
  };
}

// ---------------------------------------------------------------- legacy adapter (zero LLM calls)

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const sa = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);

function legacyNotes(card: Record<string, unknown>): V2WindowNote[] {
  const out: V2WindowNote[] = [];
  const good = Array.isArray(card.good_window_notes) ? card.good_window_notes as Record<string, unknown>[] : [];
  good.slice(0, 3).forEach((n, i) => {
    const note = s(n?.why_it_works) || s(n?.share_line);
    if (note) out.push({ window_id: `g${i + 1}`, label: /\d[:.]\d/.test(s(n?.category)) ? "" : s(n?.category), note });
  });
  const c = Array.isArray(card.caution_window_notes) ? card.caution_window_notes as Record<string, unknown>[] : [];
  const c0 = c[0];
  const cn = s(c0?.why_it_works) || s(c0?.share_line);
  if (cn) out.push({ window_id: "c1", label: /\d[:.]\d/.test(s(c0?.category)) ? "" : s(c0?.category), note: cn });
  return out;
}

function legacyDayCopy(card: Record<string, unknown>): V2DayCopy {
  return {
    title: s(card.title),
    line: s(card.one_line) || s(card.share_hook),
    body: s(card.body),
    do: sa(card.better_for).slice(0, 2),
    avoid: sa(card.be_careful).slice(0, 2),
    window_notes: legacyNotes(card),
  };
}

/** Convert an old 6-phase pack into v2 content. Reuses only text the user already has. */
export function legacyPackToV2(content: Record<string, unknown>, facts: V2Facts): V2Content {
  const me = (content.me_profile ?? {}) as Record<string, unknown>;
  const ident = (content.user_identity ?? {}) as Record<string, unknown>;
  const reports = (content.category_reports ?? {}) as Record<string, Record<string, unknown>>;
  const phases = Array.isArray(content.journey_phases) ? content.journey_phases as Record<string, unknown>[] : [];
  const cards = (Array.isArray(content.today_cards) ? content.today_cards as Record<string, unknown>[] : [])
    .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(s(c?.key)) && s(c?.title));
  const weekly = Array.isArray(content.weekly_cards) ? content.weekly_cards as Record<string, unknown>[] : [];
  const monthly = Array.isArray(content.monthly_cards) ? content.monthly_cards as Record<string, unknown>[] : [];
  const remedies = Array.isArray(content.remedy_cards) ? content.remedy_cards as Record<string, unknown>[] : [];
  const asks = Array.isArray(content.ask_templates) ? content.ask_templates as Record<string, unknown>[] : [];
  const notif = (content.notification_copy ?? {}) as Record<string, Record<string, unknown>>;

  const byWeekday = new Map<Weekday, V2DayCopy>();
  for (const card of [...cards].sort((a, b) => s(b.key).localeCompare(s(a.key)))) {
    const wd = WEEKDAYS[DateTime.fromISO(s(card.key)).weekday % 7];
    if (!byWeekday.has(wd)) byWeekday.set(wd, legacyDayCopy(card));
  }
  const anyCard = cards[0] ? legacyDayCopy(cards[0]) : null;
  const phaseBySort = new Map(phases.map((p, i) => [Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : i, p]));
  const pushOf = (k: string) => ({ title: s(notif[k]?.title), body: s(notif[k]?.body) });
  return {
    profile: {
      title: s(me.title) || s(me.headline),
      summary: s(me.summary) || s(me.body),
      strengths: sa(me.strengths),
      watchouts: sa(me.watchouts) .length ? sa(me.watchouts) : sa(me.blind_spots),
      work_style: s(ident.work_money_pattern),
      relationship_style: s(ident.relationship_pattern),
      share_line: s(me.share_hook),
    },
    areas: Object.entries(reports).map(([area_id, r]) => ({
      area_id,
      headline: s(r?.headline) || s(r?.title),
      summary: s(r?.summary) || s(r?.body),
    })).filter((a) => a.summary),
    chapters: facts.chapters.map((f) => {
      const p = phaseBySort.get(f.chapter_id) ?? {};
      return {
        chapter_id: f.chapter_id,
        title: s(p.title),
        highlight: s(p.highlight),
        body: sa(p.sentences).join(" "),
        share_line: s(p.shareHook) || s(p.share_hook),
      };
    }).filter((c) => c.title),
    days: cards.map((c) => ({ date: s(c.key), ...legacyDayCopy(c) })),
    weekdays: WEEKDAYS.map((wd) => {
      const copy = byWeekday.get(wd) ?? anyCard;
      return copy ? { weekday: wd, ...copy } : null;
    }).filter(Boolean) as V2Content["weekdays"],
    weeks: weekly.filter((w) => s(w.key)).map((w) => ({
      period_key: s(w.key),
      headline: s(w.title),
      body: s(w.body),
      caution: sa(w.be_careful)[0] ?? "",
    })),
    months: monthly.filter((m) => s(m.key)).map((m) => ({
      period_key: s(m.key),
      headline: s(m.title),
      body: s(m.body),
      caution: sa(m.be_careful)[0] ?? "",
    })),
    ask_starters: asks.map((a) => ({ topic: s(a.key) || "timing", question: s(a.question) || s(a.title) })).filter((a) => a.question).slice(0, 4),
    remedies: remedies.map((r) => ({
      title: s(r.title),
      body: s(r.body) || s(r.practice) || s(r.why) || s(r.description) || sa(r.steps).join(" "),
    })).filter((r) => r.title && r.body).slice(0, 4),
    push: {
      today_ready: pushOf("today_ready"),
      good_soon: pushOf("good_time_reminder"),
      good_start: pushOf("good_time_start"),
      caution_soon: pushOf("caution_time_reminder"),
      caution_start: pushOf("caution_start"),
    },
  };
}
