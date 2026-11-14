/**
 * Reading v2: one strict-schema LLM call per (birth details, language).
 *
 * The engine owns every fact (dates, window ids and clock times, dasha lords, periods);
 * the model only writes prose keyed by those ids. Pure module: schema, prompt,
 * validation/repair selection, sanitizing, the legacy-compatible view and the
 * zero-call adapter for readings written by the old 6-phase pack pipeline.
 */
import { DATE_RULE, jargonHits, polishDeep, VOICE_BLOCK } from "./voice.ts";
import { arcsOf, clipSentences, hasAlien, isV5, stripAlien, stageKey, V5_LIMITS, v5Flags, v5Rules } from "./reading_v5.ts";
import { DateTime } from "luxon";
import { localizeGrahaNames } from "./planner.ts";
import { type DayAngle, OPENER_HOW } from "./angles.ts";
import { alreadySaid, themeCheck, type ThemeStats } from "./theme_check.ts";
import { engineDayCopy, engineSlotNote, starName } from "./engine_copy.ts";
import type { ChartFacts, ReadingStory } from "./reading_v4.ts";
import { checkClaims, engineChapterCopy, requiredIdsV4, v4SystemRules } from "./reading_v4.ts";

export const READING_SCHEMA_VERSION = 2;
export const READING_PROMPT_VERSION = "reading-v3.0";
export const READING_PROMPT_VERSION_V4 = "reading-v4.0";
export const READING_PROMPT_VERSION_V5 = "reading-v5.0";

export type ReadingLocale = "en" | "te" | "hi";
export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const ADULT_AREAS = ["career", "money", "business", "relationship", "family", "health_routine"] as const;
export const CHILD_AREAS = ["temperament", "learning", "sleep_rhythm", "feeding_health", "bonding", "family"] as const;
export const ASK_TOPICS = ["work", "money", "relationship", "family", "health", "timing", "child"] as const;
export const WINDOW_IDS = ["g1", "g2", "g3", "c1"] as const;

// ---------------------------------------------------------------- facts (engine-owned)

export type V2WindowFact = {
  id: string;
  kind: "good" | "caution";
  part: string;
  /** Planetary-hour lord at the slot's midpoint (v3 facts). */
  hora?: string;
  /** Why the engine picked it: "clean" daylight run clear of Rahu/Yama/Gulika, or "rahu". */
  why?: "clean" | "rahu";
  /** v3: only the angle's slot is written by the model; the rest get engine notes. */
  writer?: "llm" | "engine";
  /** The verdict's best window (calendar.ts pickBest): the one Today, Calendar and push call best. */
  best?: boolean;
};
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
  /** Calendar tab tags for the same date (deterministic scoring), so copy and Calendar agree. */
  calendar?: { favours: string[]; avoid: string | null; why?: string };
  /** v3: engine-assigned angle (area, action, opener, tone, lead fact, trait day, slot). */
  angle?: DayAngle;
  /** The one engine day verdict (calendar.ts scoreDay) every screen and push uses. */
  verdict?: { tone: "supportive" | "mixed" | "rest"; best: { start: string; end: string } | null; best_kind: "go" | "calm"; favours: string[]; avoid: string | null };
};
export type V2WeekdayFact = { weekday: Weekday; day_lord: string; windows: V2WindowFact[] };
export type V2PeriodFact = {
  period_key: string;
  label: string;
  supportive_days: number;
  careful_days: number;
  notable: string[];
  chapter_id: number | null;
  /** v3: the strongest and the lightest dates of the stretch ("Thu 19 Nov (Pushya)"). */
  best_days?: string[];
  light_days?: string[];
};
export type V2ChapterFact = {
  chapter_id: number;
  period: string;
  start_iso: string | null;
  end_iso: string | null;
  md: string;
  /** Antardasha lord; "" on summary rows. */
  ad: string;
  /** "detail" = one antardasha chapter (full text); "summary" = a whole mahadasha (or the early years) in one line. Missing on readings before v2.9 = detail. */
  kind?: "detail" | "summary";
  /** Summary rows: every mahadasha lord inside the span (early years can hold several). */
  md_lords?: string[];
  /** Summary row that covers childhood up to where full chapters begin. */
  early?: boolean;
  age_from?: number | null;
  age_to?: number | null;
  tense: "past" | "current" | "future";
  domains: string[];
  support: string[];
  pressure: string[];
  pulse: string;
  transition: string;
  evidence: string;
  lenses: string[];
  /** v3: what this sub-period lord brings (distinct per chapter). */
  ad_theme?: { support: string[]; pressure: string[] };
  /** v5: the life stage for these ages ("early career", "school years"), engine-owned. */
  life_stage?: string;
  /** v5: plain-language life areas this sub-period's lords rule or sit in (per chapter, not per person). */
  chapter_domains?: string[];
  /** v5: the mahadasha arc this chapter belongs to. */
  arc_md?: string;
};
export type V2Meanings = {
  stars: Record<string, string>;
  tithis: Record<string, string>;
  yogas: Record<string, string>;
  taras: Record<string, string>;
  horas: Record<string, string>;
};
export type V2Facts = {
  schema_version: 2;
  /** 3 = 45 engine-angled days, no weekday cards, engine slot notes, meaning tables. */
  facts_version?: 3 | 4 | 5;
  meanings?: V2Meanings;
  /** v4: the rule engine's evidence pack (ids the model must cite for any chart claim). */
  chart?: ChartFacts;
  /** v4: one small story record shared by every part and screen. */
  story?: ReadingStory;
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
    evidence_ids?: string[];
    /** v5: the one chart fact behind the summary, in plain words. */
    why?: string;
  };
  areas: { area_id: string; headline: string; summary: string; evidence_ids?: string[]; why?: string }[];
  chapters: { chapter_id: number; title: string; highlight: string; body: string; share_line: string; evidence_ids?: string[]; why?: string; action?: string }[];
  /** v5: one line per mahadasha arc (md lord or "early"). */
  arcs?: { md: string; line: string }[];
  /** v5: two sentences on the whole story so far and where it is heading. */
  life_story?: string;
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
  chapterTitle: 36,
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

function windowNotesSchema(wl: boolean, one = false): Json {
  if (one) {
    return arr(obj({
      window_id: { type: "string", enum: [...WINDOW_IDS] },
      label: str(LIMITS.label, wl, "2-4 word purpose label for the day's slot, e.g. 'Calls & follow-ups'"),
      note: str(LIMITS.note, wl, "what THIS slot suits for the day's angle.area; no clock times; do not start with 'Use this slot', 'A good slot', 'Good for' or 'This slot'"),
    }), 1);
  }
  return arr(
    obj({
      window_id: { type: "string", enum: [...WINDOW_IDS] },
      label: str(LIMITS.label, wl, "2-4 word purpose label for this window, e.g. 'Calls & follow-ups'"),
      note: str(LIMITS.note, wl, "why this window suits / does not suit things today; no clock times"),
    }),
    [1, 4],
  );
}

function dayCopyProps(wl: boolean, v3 = false): Record<string, Json> {
  return {
    title: str(LIMITS.title, wl, "headline for the day"),
    line: str(LIMITS.line, wl, "one-sentence takeaway"),
    body: str(LIMITS.dayBody, wl, "2-3 sentences"),
    do: arr(str(LIMITS.chip, wl, "short concrete action"), 2),
    avoid: arr(str(LIMITS.chip, wl, "short concrete thing to skip"), 2),
    window_notes: windowNotesSchema(wl, v3),
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
  /** Sharded generation: include the profile block / ask_starters + remedies + push. */
  profile?: boolean;
  extras?: boolean;
  /** v5: the arc lines and the life story (written with the first chapters). */
  arcs?: boolean;
};

const nullable = (j: Json): Json => ({ anyOf: [j, { type: "null" }] });
export const isV3 = (f: V2Facts) => (f.facts_version ?? 0) >= 3;
/** v4 pipeline (evidence pack, parts, claims). v5 rides on it. */
export const isV4 = (f: V2Facts) => (f.facts_version === 4 || f.facts_version === 5) && Boolean(f.chart);

/**
 * One schema for every shard of a v3 reading (all sections, arrays may be empty, profile/push
 * nullable). Identical bytes across shards keep the system + schema + FACTS prefix cacheable.
 */
export function buildUnionSchema(facts: V2Facts, withLengths: boolean): Json {
  const full = buildReadingSchema(facts, { withLengths }) as { properties: Record<string, Json & { minItems?: number }> };
  const props: Record<string, Json> = {};
  for (const [k, v] of Object.entries(full.properties)) {
    // push stays required (tiny; a nullable push was skipped by the extras part), profile is nullable.
    if (k === "profile") props[k] = nullable(v);
    else if (k === "push") props[k] = v;
    else props[k] = { ...(v as Record<string, unknown>), minItems: 0 } as Json;
  }
  return obj(props);
}

/** Full reading schema, or a repair schema restricted to `scope` ids. */
export function buildReadingSchema(facts: V2Facts, opts: { withLengths: boolean; scope?: SchemaScope }): Json {
  const wl = opts.withLengths;
  const scope = opts.scope;
  const v3 = isV3(facts);
  const dayIds = scope ? scope.days ?? [] : facts.days.map((d) => d.date);
  const wdIds = scope ? scope.weekdays ?? [] : facts.weekdays.map((d) => d.weekday);
  const chIds = scope ? scope.chapters ?? [] : facts.chapters.map((c) => c.chapter_id);
  const wkIds = scope ? scope.weeks ?? [] : facts.weeks.map((w) => w.period_key);
  const moIds = scope ? scope.months ?? [] : facts.months.map((m) => m.period_key);
  const arIds = scope ? scope.areas ?? [] : facts.area_ids;
  const props: Record<string, Json> = {};
  const evIds = isV4(facts) ? facts.chart!.evidence.map((e) => e.id) : [];
  const cite = (n: [number, number]): Record<string, Json> =>
    evIds.length ? { evidence_ids: { ...arr({ type: "string", enum: evIds }, n), description: "ids of the EVIDENCE items this text explains; every graha, house, yoga or dignity you name must be in one of them" } } : {};
  if (!scope || scope.profile) {
    props.profile = obj({
      ...cite([2, 5]),
      title: str(LIMITS.title, wl, "who this person is, as a short title"),
      summary: str(LIMITS.profileSummary, wl, "3-4 sentences, specific to the natal facts"),
      strengths: arr(str(LIMITS.trait, wl), 3),
      watchouts: arr(str(LIMITS.trait, wl), 3),
      work_style: str(LIMITS.style, wl),
      relationship_style: str(LIMITS.style, wl),
      share_line: str(LIMITS.share, wl, "a warm line someone would share"),
      ...(isV5(facts) ? { why: str(V5_LIMITS.why, wl, "one plain sentence: the single chart fact behind the summary") } : {}),
    });
  }
  if (arIds.length) {
    props.areas = arr(obj({
      area_id: { type: "string", enum: arIds },
      headline: str(LIMITS.areaHeadline, wl),
      summary: str(LIMITS.areaSummary, wl, isV5(facts) ? "2 sentences for the current chapter, with one concrete thing to do" : "2-3 sentences for the current chapter"),
      ...(isV5(facts) ? { why: str(V5_LIMITS.why, wl, "one plain sentence: the chart fact behind this, in everyday words") } : {}),
      ...cite([1, 3]),
    }), arIds.length);
  }
  if (chIds.length && isV5(facts)) {
    props.chapters = arr(obj({
      chapter_id: { type: "integer", enum: chIds },
      title: str(V5_LIMITS.chapterTitle, wl, "2-4 words, concrete, no planet names, unique first word"),
      highlight: str(V5_LIMITS.beat, wl, "the beat: one short sentence, max 14 words"),
      body: str(V5_LIMITS.body.current, wl, "detail: framed by life_stage; past 2-3 sentences (what the chart suggests, no events), current 4-6, future 2-3; summary: \"\""),
      why: str(V5_LIMITS.why, wl, "one plain sentence: the sub-period lord's role for this person; summary: \"\""),
      action: str(V5_LIMITS.action, wl, "current/future detail: one concrete thing to do, verb first; past and summary: \"\""),
      share_line: str(LIMITS.share, wl),
      ...cite([1, 4]),
    }), chIds.length);
  } else if (chIds.length) {
    props.chapters = arr(obj({
      chapter_id: { type: "integer", enum: chIds },
      title: str(LIMITS.chapterTitle, wl, "chapter title, 2-4 words, no planet names, first word different from every other chapter title"),
      highlight: str(LIMITS.chapterHighlight, wl, "one sentence"),
      body: str(LIMITS.chapterBody, wl, "kind=detail: past 1-2 sentences, current/future 3-4 sentences; kind=summary: empty string \"\""),
      share_line: str(LIMITS.share, wl),
      ...cite([1, 4]),
    }), chIds.length);
  }
  if (isV5(facts) && (scope ? scope.arcs : true)) {
    const keys = [...new Set(arcsOf(facts.chapters).map((a) => a.md))];
    props.arcs = arr(obj({ md: { type: "string", enum: keys }, line: str(V5_LIMITS.arcLine, wl, "that whole stretch's theme for that time of life, one sentence") }), keys.length);
    props.life_story = str(V5_LIMITS.lifeStory, wl, "two short sentences: where the story has been and what this stretch builds toward");
  }
  if (dayIds.length) {
    props.days = arr(obj({ date: { type: "string", enum: dayIds }, ...dayCopyProps(wl, v3) }), dayIds.length);
  }
  if (wdIds.length) {
    props.weekdays = arr(obj({ weekday: { type: "string", enum: wdIds }, ...dayCopyProps(wl) }), wdIds.length);
  }
  if (wkIds.length) props.weeks = arr(periodSchema(wkIds, wl), wkIds.length);
  if (moIds.length) props.months = arr(periodSchema(moIds, wl), moIds.length);
  if (!scope || scope.extras) {
    props.ask_starters = arr(obj({
      topic: { type: "string", enum: [...ASK_TOPICS] },
      question: str(LIMITS.question, wl, "a personal first-person question tied to this person's current chapter or a trait from FACTS, in plain words: no planet, dasha or period names, no generic 'how do I balance work and life'"),
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

const OPENERS_LINE = Object.entries(OPENER_HOW).map(([k, v]) => `${k} = ${v}`).join("; ");

/** v3 day rules: the engine already gave every day its own angle (the "already used" ledger). */
function dayRulesV3(facts: V2Facts): string[] {
  const te = facts.locale === "te";
  return [
    "2. Day cards follow the engine's `angle` for that date; the angles are already spread so no two neighbouring days share an area, action or opener. Write the day ABOUT angle.area, suggest angle.action, write in angle.tone, and open the body the way angle.opener says (" + OPENERS_LINE + ").",
    "2a. The reason comes from angle.lead: star -> MEANINGS.stars[nakshatra]; tithi -> MEANINGS.tithis[the tithi's last word]; tara -> MEANINGS.taras[tara] (how today's star sits with their birth star); yoga -> MEANINGS.yogas[yoga]. Say that meaning in fresh, everyday words tied to angle.area and make the why explicit (" + (te ? "కాబట్టి / అందుకే / కావడంతో" : facts.locale === "hi" ? "क्योंकि / इसलिए / की वजह से" : "because / so / which means") + "), and name the lead fact once (the star, tithi or yoga name; for tara, say 'your birth star' relation in plain words), mid-sentence. Never open a body with the star name. Never write '<star> is today's star', 'today's star is <star>'" + (te ? ", 'ఈరోజు నక్షత్రం <star>' / '<star> నక్షత్రం ఈరోజు'" : "") + " or the word 'hint'.",
    "2b. One screen shows title, line, body, do/avoid chips and the slot note together, so each takes a DIFFERENT job: line = the one-sentence verdict; body = the why + one concrete example in angle.area; do/avoid = two other actions not named in the body; the slot note = what that slot suits. Never repeat a task across them. The calendar field holds the Calendar tab's tags; agree with them.",
    "2c. Personality: mention the natal trait (natal.archetype / signals) ONLY on days whose angle.trait_ok is true, at most once. On every other day say nothing about their character (no 'your eye for detail', 'perfectionist', 'you like things just right').",
    "2d. Titles: 2-5 words, each title fresh (different first word from the previous three days), concrete to angle.area/action. No '<Star>'s <Noun>' formula. If a title names a star or tithi, spell it exactly as in FACTS (e.g. Pushya, never 'Pushy').",
    "2e. Word budget across all days: 'familiar', 'simple', 'gentle', 'quiet/quietly', 'steady', 'small step', 'one thing' each at most once per five days; prefer the specific noun or verb. Vary HOW you give the reason too: never reuse one sentence frame across days (" + (te ? "'… రోజు కాబట్టి', '… కావడంతో ఈరోజు'" : facts.locale === "hi" ? "'… का दिन है, इसलिए', '… की याद दिलाता है', '… का संकेत देता है'" : "'… is a day for …, so', 'which means today'") + " at most twice in the whole reading).",
    "3. window_notes: exactly ONE note, for the window whose writer is \"llm\" (slot = angle.slot); the app writes the other slots from the engine's hora and Rahu Kalam tables. The note ties that slot's `suits` to angle.area; never start it with 'Use this slot', 'A good slot', 'Good for' or 'This slot'. Never write times; the app shows them.",
    "4. There are no weekday cards in this reading; weeks/months use best_days and light_days (weekday + star) to say which days to use and which to keep light; never write dates.",
  ];
}

export function buildSystemPrompt(facts: V2Facts): string {
  if (isV5(facts)) return buildSystemPromptV5(facts);
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
    ...(isV3(facts) ? dayRulesV3(facts) : [
    "2. Every day needs its OWN hook from that day's facts, never a mood bucket. Build body as: hook (today's star by name, or the tithi_hint, or the tara_hint in plain words) -> why it matters for THIS person (their natal signals or current period) -> one concrete action. At least two days in every three must give an explicit reason tied to that day's star or tithi: name it and link it to the advice with a plain causal word (because, so, which means; Telugu కాబట్టి, అందుకే, కావడంతో; Hindi क्योंकि, इसलिए), e.g. 'Pushya is a nourishing star, so it suits a slow family lunch' / 'పుష్యమి రోజు కావడంతో ఇంట్లో పనులు సాఫీగా సాగుతాయి'. Vary the sentence shape: open with the star's name on at most one day in three; on the others lead with the action, the person or the moment and name the star mid-sentence. Never use the formula '<star> combined with/alongside <tithi>', and never lean on one stock link phrase (Telugu 'నక్షత్రం వల్ల ఈరోజు', English 'thanks to <star>') more than twice in the whole month. Name the current period as 'your current period', never by planet names. Use tithi_hint on every day that has one (full moon, new moon, Ekadashi ...). day_tone is an internal label: never write 'mixed/careful/supportive tone', 'day tone' or 'energy' as an opener. No two day bodies may start with the same two words; no two lines may share an opener. Call a star 'your birth star' ONLY when is_birth_star is true; otherwise it is 'today's star' (use the exact nakshatra name from that day's facts, Telugu: nakshatra_te). Never reuse a title or chip across days. Never put a weekday name in a day title.",
      "2b. One screen shows a day's title, line, body, do/avoid chips and window notes together, so each must take a DIFFERENT angle: line = the one-sentence verdict; body = the why + one concrete example; do/avoid = two other actions not named in the body; each window note = what that particular slot suits (no repeat of the body's example). Never reuse the same task (e.g. 'clear the inbox', 'wrap up pending work') in two of them. Each day's calendar field holds the Calendar tab's tags (favours/avoid areas); the day's angle must agree with them: lean into a favoured area, steer away from the avoid area, never contradict them.",
      "3. window_notes: write one note for every window id listed for that day/weekday (and no others). Good windows (g*) say what to use them for; c1 is the traditional caution window: say what to keep routine. Never write times; the app shows them.",
      "4. weekdays are evergreen cards used after the dated days run out: write for that weekday in general, no tithi/nakshatra references.",
    ]),
    "5. chapters: use the chapter facts (period, lords, support, pressure, domains). Past chapters: 1-2 reflective sentences. Current chapter: most detail. Future: what to prepare. Each chapter title must be unique and short: 2-4 words and at most 28 characters (Telugu: 2-3 words), concrete rather than generic (not 'New Beginnings', 'Growth Phase', 'A Time of Change'), never the same word twice in one title (no 'New Horizon Horizon'), and no two chapters may start with the same word or share their main noun (avoid 'Quiet Mental Rest' vs 'Quiet Leadership', 'Refining Details' vs 'Refined Work'; in Telugu avoid 'పెద్దల బాధ్యత' vs 'పెద్దల ఆశీస్సులు' or three titles opening with 'స్మార్ట్'). Before answering, read the first word of every chapter title in order and change any repeat. Name what is specific to that chapter's lords and domains.",
    "5b. Chapters with kind=\"summary\" are long overview rows (a whole mahadasha, or with early=true the childhood years up to age_from of the first detailed chapter): write ONLY title (2-3 words), highlight (one sentence giving that whole stretch's theme; for early=true, the childhood/teen years in a warm, general way: no events, no fear) and share_line; body MUST be an empty string. Summary titles follow the same uniqueness rules and must name the stretch's theme: never a generic label like 'Early Years', 'Childhood', 'Later Life' or the planet's name (the app already shows that label). Chapters with kind=\"detail\" get the full text as in rule 5.",
    "6. weeks/months: use the counts and notable days given; each period must differ. A week or month card must not restate the current chapter's theme or the day cards' tasks: talk about the stretch itself (which days to use, which to keep light).",
    child
      ? "7. This is a child's chart: speak to the parent about the child. Areas are child areas. No career, money, romance or marriage. No fear, no medical claims; never suggest delaying care."
      : "7. No fear, no guaranteed outcomes, no medical, legal or financial certainty. Remedies are simple habits, prayers or kindness; never purchases or gemstones.",
    `8. Never use these phrases: ${BANNED_PHRASES[facts.locale].concat(facts.locale === "en" ? [] : BANNED_PHRASES.en.slice(0, 4)).map((p) => `"${p}"`).join(", ")}.`,
    "8b. This is a personal reading, not a work ticket: no corporate or tech-job jargon (backend, operational, workflow, bottleneck, stakeholders, deliverables, KPIs, bandwidth, pipeline, sprint, scale up, optimise, leverage, glitches) and never assume a profession or job title (no 'coding', 'your team's sprint'); the user's profession is not known. Say it in everyday words: 'what quietly slows your day', 'the people who rely on you', 'finish what you started'.",
    "9. Respect every max length. Be concrete; no filler. Do not copy the engine's English phrases from FACTS word for word: say the same idea in your own natural words.",
    "10. Emoji: at most one, and only in push titles/bodies or share_line. None elsewhere.",
    ...(isV4(facts) ? v4SystemRules(facts) : []),
  ].join("\n");
}

/** v5: one clean prompt (the shared, cached prefix for every part). */
function buildSystemPromptV5(facts: V2Facts): string {
  const lang = LANGUAGE_NAME[facts.locale];
  const banned = BANNED_PHRASES[facts.locale].concat(facts.locale === "en" ? [] : BANNED_PHRASES.en.slice(0, 4));
  return [
    `You write a personal Vedic-astrology reading for the Muhurta app, in ${lang}.` +
    (facts.locale === "en" ? "" : ` Write natively in ${lang}, not as a translation: everyday spoken words, not Sanskrit-heavy.`),
    "You explain; the rule engine decides. FACTS and EVIDENCE are computed; your job is to say what they mean for this one person, in words they would use.",
    "Voice: warm, specific, everyday. Short sentences. 'You' for the account owner; for another person use their name.",
    VOICE_BLOCK[facts.locale],
    DATE_RULE,
    ...v5Rules(facts, OPENERS_LINE, banned),
  ].join("\n");
}

// ---------------------------------------------------------------- grounding hints (engine-owned)

export const NAKSHATRA_TE: Record<string, string> = {
  "Ashwini": "అశ్విని", "Bharani": "భరణి", "Krittika": "కృత్తిక", "Rohini": "రోహిణి", "Mrigashira": "మృగశిర",
  "Ardra": "ఆరుద్ర", "Punarvasu": "పునర్వసు", "Pushya": "పుష్యమి", "Ashlesha": "ఆశ్లేష", "Magha": "మఖ",
  "Purva Phalguni": "పుబ్బ", "Uttara Phalguni": "ఉత్తర", "Hasta": "హస్త", "Chitra": "చిత్త", "Swati": "స్వాతి",
  "Vishakha": "విశాఖ", "Anuradha": "అనూరాధ", "Jyeshtha": "జ్యేష్ఠ", "Mula": "మూల", "Purva Ashadha": "పూర్వాషాఢ",
  "Uttara Ashadha": "ఉత్తరాషాఢ", "Shravana": "శ్రవణం", "Dhanishta": "ధనిష్ఠ", "Shatabhisha": "శతభిష",
  "Purva Bhadrapada": "పూర్వాభాద్ర", "Uttara Bhadrapada": "ఉత్తరాభాద్ర", "Revati": "రేవతి",
};

/** Plain-language meaning of the day's tara relative to the birth star (the classic 9-tara cycle). */
const TARA_HINT: Record<string, string> = {
  Janma: "birth-star echo day: energy can dip, keep plans light and self-care high",
  Sampat: "gain day: good for money tasks and asking for what you need",
  Vipat: "friction day: expect small snags, double-check before sending or paying",
  Kshema: "well-being day: good for health, home and steady progress",
  Pratyak: "obstacle day: finish what's open instead of starting new things",
  Sadhana: "achievement day: push the one task that matters most",
  Naidhana: "low day: protect energy, avoid big commitments and arguments",
  Mitra: "friendly day: good for people, favours and teamwork",
  "Parama Mitra": "best-friend day: very supportive, good for important asks",
};

function tithiHint(tithi: string): string | null {
  const t = tithi.toLowerCase();
  if (t.includes("purnima")) return "full moon (Purnima): emotions run high, good for gratitude, family and finishing";
  if (t.includes("amavasya")) return "new moon (Amavasya): quiet reset, rest and plan, no big launches";
  if (t.includes("ekadashi")) return "Ekadashi: light food, discipline and focus";
  if (t.includes("chaturthi")) return t.includes("krishna") ? "Sankashti Chaturthi: clear obstacles, finish pending work" : "Chaturthi: remove blockers before starting";
  if (t.includes("ashtami")) return "Ashtami: effortful day, stick to essentials";
  if (t.includes("pratipada")) return "Pratipada: a fresh lunar start, good to set an intention";
  return null;
}

/** Facts sent to the model, with per-day grounding hints so every day has its own real hook. */
export function promptFacts(facts: V2Facts): V2Facts {
  const natal = (facts.natal as { nakshatra?: string } | undefined)?.nakshatra ?? "";
  if (isV3(facts)) {
    return {
      ...facts,
      weekdays: [],
      days: facts.days.map((d) => {
        const { windows, ...rest } = d;
        const slot = windows.find((w) => w.writer === "llm") ?? windows[0];
        return {
          ...rest,
          ...(facts.locale === "te" ? { nakshatra_te: NAKSHATRA_TE[d.nakshatra] ?? d.nakshatra } : {}),
          is_birth_star: Boolean(natal) && d.nakshatra === natal,
          windows: slot ? [{ id: slot.id, kind: slot.kind, part: slot.part, writer: "llm", suits: slot.hora ? facts.meanings?.horas[slot.hora] ?? "" : "" }] : [],
        };
      }),
    } as unknown as V2Facts;
  }
  return {
    ...facts,
    days: facts.days.map((d) => ({
      ...d,
      ...(facts.locale === "te" ? { nakshatra_te: NAKSHATRA_TE[d.nakshatra] ?? d.nakshatra } : {}),
      is_birth_star: Boolean(natal) && d.nakshatra === natal,
      tara_hint: d.tara ? TARA_HINT[d.tara] ?? null : null,
      tithi_hint: tithiHint(d.tithi),
    })),
  } as V2Facts;
}

export function buildUserPrompt(facts: V2Facts): string {
  const pf = promptFacts(facts) as V2Facts & { meanings?: V2Meanings };
  if (isV3(facts)) {
    const { meanings, ...rest } = pf;
    return "MEANINGS (engine tables, English; say them in your own words in the target language):\n" + JSON.stringify(meanings ?? {}) +
      "\n\nFACTS (JSON):\n" + JSON.stringify(rest);
  }
  return "FACTS (JSON):\n" + JSON.stringify(pf);
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
  const summaryIds = new Set(facts.chapters.filter((f) => f.kind === "summary").map((f) => f.chapter_id));
  const v5 = isV5(facts);
  const tenseOf = new Map(facts.chapters.map((f) => [f.chapter_id, f.tense]));
  const v5Chapter = (ch: V2Content["chapters"][number]) => {
    const id = Number(ch.chapter_id);
    const summary = summaryIds.has(id);
    const tense = tenseOf.get(id) ?? "future";
    return {
      chapter_id: id,
      title: clip(ch.title, V5_LIMITS.chapterTitle),
      highlight: clipSentences(ch.highlight, V5_LIMITS.beat),
      body: summary ? "" : clipSentences(ch.body, V5_LIMITS.body[tense]),
      why: summary ? "" : clipSentences(ch.why, V5_LIMITS.why),
      action: summary || tense === "past" ? "" : clipSentences(ch.action, V5_LIMITS.action),
      share_line: clip(ch.share_line, LIMITS.share),
      ...ev(ch.evidence_ids),
    };
  };
  const dayWin = new Map(facts.days.map((d) => [d.date, new Set(d.windows.filter((w) => !w.writer || w.writer === "llm").map((w) => w.id))]));
  const wdWin = new Map(facts.weekdays.map((d) => [d.weekday, new Set(d.windows.map((w) => w.id))]));
  const known = new Set(isV4(facts) ? facts.chart!.evidence.map((e) => e.id) : []);
  const ev = (xs: unknown): { evidence_ids?: string[] } => {
    if (!known.size) return {};
    const ids = [...new Set((Array.isArray(xs) ? xs : []).map(String).filter((x) => known.has(x)))];
    return { evidence_ids: ids };
  };
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
      ...ev(c.profile?.evidence_ids),
      ...(v5 ? { why: clipSentences(c.profile?.why, V5_LIMITS.why) } : {}),
    },
    areas: (c.areas ?? []).map((a) => ({
      area_id: a.area_id,
      headline: clip(a.headline, LIMITS.areaHeadline),
      summary: v5 ? clipSentences(a.summary, LIMITS.areaSummary) : clip(a.summary, LIMITS.areaSummary),
      ...ev(a.evidence_ids),
      ...(v5 ? { why: clipSentences(a.why, V5_LIMITS.why) } : {}),
    })),
    ...(v5 && (c.arcs || c.life_story) ? {
      arcs: (c.arcs ?? []).map((a) => ({ md: String(a.md ?? ""), line: clipSentences(a.line, V5_LIMITS.arcLine) })).filter((a) => a.md && a.line),
      life_story: clipSentences(c.life_story, V5_LIMITS.lifeStory),
    } : {}),
    chapters: (c.chapters ?? []).map((ch) => v5 ? v5Chapter(ch) : ({
      chapter_id: Number(ch.chapter_id),
      title: clip(ch.title, LIMITS.chapterTitle),
      highlight: clip(ch.highlight, LIMITS.chapterHighlight),
      // Summary rows are one-liners by design: drop any body the model wrote anyway.
      body: summaryIds.has(Number(ch.chapter_id)) ? "" : clip(ch.body, LIMITS.chapterBody),
      share_line: clip(ch.share_line, LIMITS.share),
      ...ev(ch.evidence_ids),
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
  stats: { [k: string]: number | ThemeStats | undefined; theme?: ThemeStats };
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

export function scriptShare(text: string, locale: ReadingLocale): number {
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

const WEEKDAY_NAMES: Record<ReadingLocale, RegExp> = {
  en: /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  te: /(ఆదివారం|సోమవారం|మంగళవారం|బుధవారం|గురువారం|శుక్రవారం|శనివారం)/,
  hi: /(रविवार|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार)/,
};
const TONE_LABEL_RE: Record<ReadingLocale, RegExp> = {
  en: /\b(mixed|careful|supportive|balanced)\s+(day\s+)?(tone|tones|energy)\b|\bday tone\b|\btara\b|\b(a|the|this|today'?s)\s+(warm,?\s+)?(mixed|supportive|restful|rest)\s+day\b/i,
  te: /(మిక్స్‌డ్ టోన్|డే టోన్|టోన్ |తార బలం|తారా బలం|మిశ్రమ రోజు|మిక్స్‌డ్ రోజు|మిశ్రమమైన రోజు)/,
  hi: /(मिक्स्ड टोन|डे टोन|मिला-जुला दिन|मिलाजुला दिन|मिश्रित दिन)/,
};
const NAK_EN_RE = new RegExp(`\\b(${Object.keys(NAKSHATRA_TE).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");

/** Day-copy grounding: stars named must be that day's star; birth star only when it really is; no internal labels. */
export function groundingProblems(
  text: string,
  d: V2DayCopy,
  fx: V2DayFact | undefined,
  natal: string,
  locale: ReadingLocale,
  section: "days" | "weekdays",
): string[] {
  const out: string[] = [];
  if (TONE_LABEL_RE[locale].test(text)) out.push("tone_label");
  if (section !== "days" || !fx) return out;
  if (WEEKDAY_NAMES[locale].test(d.title ?? "")) out.push("weekday_in_title");
  const isBirth = Boolean(natal) && fx.nakshatra === natal;
  const named = locale === "te"
    ? Object.entries(NAKSHATRA_TE).filter(([, te]) => new RegExp(`(^|\\s)${te}(\\s+)?(నక్షత్ర|\\(|,|\\.)|నక్షత్రం\\s+${te}(\\s|,|\\.|$)`).test(text)).map(([en]) => en)
    : [...new Set([...text.matchAll(NAK_EN_RE)].map((m) => m[1]))];
  // A star other than today's may appear only as the natal star introduced as such.
  for (const n of named) {
    if (n === fx.nakshatra) continue;
    if (n === natal && !isBirth && /today|ఈరోజు|आज/i.test(text) && /birth star|జన్మ నక్షత్ర/i.test(text) && !text.includes(fx.nakshatra) && !text.includes(NAKSHATRA_TE[fx.nakshatra] ?? "~")) { out.push("wrong_star"); continue; }
    if (n !== natal) out.push("wrong_star");
  }
  // Natal star named as if it were today's star ("Hasta (your birth star) shines today" on a Rohini day).
  if (!isBirth && natal) {
    const nat = locale === "te" ? (NAKSHATRA_TE[natal] ?? natal) : natal;
    const asToday = new RegExp(`(today'?s star (is )?${nat}|${nat}\\s*\\(your birth star\\)\\s*(is\\s+)?(active|shines|rules|today)|your birth star (is )?(active|today)|జన్మ నక్షత్రం ఈరోజు|ఈరోజు\\s+(మీ\\s+)?జన్మ నక్షత్రం)`, "i");
    if (asToday.test(text)) out.push("wrong_star");
  }
  const hint = tithiHint(fx.tithi);
  if (hint && /purnima|amavasya|ekadashi/i.test(fx.tithi)) {
    const words = locale === "te"
      ? /(పౌర్ణమి|పున్నమి|అమావాస్య|ఏకాదశి)/
      : locale === "hi"
      ? /(पूर्णिमा|पूनम|अमावस्या|अमावस|एकादशी|full moon|new moon|purnima|amavasya|ekadashi)/i
      : /(full moon|purnima|new moon|amavasya|ekadashi)/i;
    if (!words.test(text)) out.push("tithi_missed");
  }
  return [...new Set(out)];
}

function dayText(d: V2DayCopy): string {
  return [d.title, d.line, d.body, ...(d.do ?? []), ...(d.avoid ?? []), ...(d.window_notes ?? []).map((n) => `${n.label} ${n.note}`)].join(" ");
}

const TITLE_STOP = new Set(["and", "the", "of", "a", "an", "to", "for", "in", "on", "with", "your", "you", "&", "మీ", "ఈ"]);
/** Crude English stem so "Refining"/"Refined", "Horizon"/"Horizons", "Master"/"Mastery" collide. */
export function titleStem(w: string): string {
  const x = w.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");
  if (!/^[a-z]+$/.test(x)) return x;
  return x.length >= 5 ? x.slice(0, 5) : x;
}

/** Chapter titles stay short: at most 4 words and 28 characters (36 for Indic scripts, whose marks count as chars). */
export function chapterTitleTooLong(title: string): boolean {
  const t = (title ?? "").trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const indic = /[\u0900-\u0DFF]/.test(t);
  return words > 4 || t.length > (indic ? 36 : 28);
}

/** Stock link phrases the model leans on ("<star> నక్షత్రం వల్ల ఈరోజు ...", "thanks to <star>"). */
const STOCK_LINK = /నక్షత్రం వల్ల ఈరోజు|\bthanks to\b/i;

/** Words that make a sentence a reason ("because", "so", "కాబట్టి" ...), per locale. */
const REASON_RE: Record<ReadingLocale, RegExp> = {
  en: /\b(because|since|so that|so|as (the|today|it|this|your)|which (means|makes|favours|favors|suits|helps)|that'?s why|this means|means|thanks to|with (today'?s|the|a) )\b/i,
  te: /(కాబట్టి|వల్ల|అందుకే|కనుక|ప్రభావంతో|కారణంగా|అంటే|కావడంతో|కావడం వల్ల|కదా|ఉండటంతో)/,
  hi: /(क्योंकि|इसलिए|के कारण|की वजह से|यानी|इस वजह से|जिससे|ताकि|इसी से)/,
};

const TITHI_WORD_RE: Record<ReadingLocale, RegExp> = {
  en: /\b(tithi|full moon|new moon|purnima|amavasya|ekadashi|chaturthi|ashtami|pratipada|dashami|navami|saptami|shashthi|panchami|tritiya|dwitiya|dvitiya|trayodashi|dwadashi|chaturdashi|lunar day)\b/i,
  te: /(తిథి|పౌర్ణమి|పున్నమి|అమావాస్య|ఏకాదశి|చవితి|చతుర్థి|అష్టమి|పాడ్యమి|దశమి|నవమి|సప్తమి|షష్ఠి|పంచమి|తదియ|విదియ|త్రయోదశి|ద్వాదశి|చతుర్దశి)/,
  hi: /(तिथि|पूर्णिमा|अमावस्या|एकादशी|चतुर्थी|अष्टमी|प्रतिपदा|द्वितीया|तृतीया|पंचमी|षष्ठी|सप्तमी|नवमी|दशमी|द्वादशी|त्रयोदशी|चतुर्दशी)/,
};

/**
 * A day "gives a reason tied to its panchang" when its line + body name that day's star
 * (or its tithi) AND carry a causal link (because / so / కాబట్టి ...). Target: >= 60% of days.
 */
export function panchangReason(d: V2DayCopy, fx: V2DayFact | undefined, locale: ReadingLocale): boolean {
  if (!fx) return false;
  const text = `${d.line ?? ""} ${d.body ?? ""}`;
  const hiStar = locale === "hi" && fx.nakshatra ? starName(fx.nakshatra, "hi").split(" ").slice(-1)[0] : "";
  const star = fx.nakshatra ? text.toLowerCase().includes(fx.nakshatra.toLowerCase().split(" ").slice(-1)[0]) || (NAKSHATRA_TE[fx.nakshatra] ? text.includes(NAKSHATRA_TE[fx.nakshatra]) : false) || (hiStar.length >= 2 && text.includes(hiStar)) : false;
  const tithiWord = (fx.tithi ?? "").split(" ").slice(-1)[0]?.toLowerCase() ?? "";
  const tithi = TITHI_WORD_RE[locale].test(text) || (tithiWord.length >= 4 && text.toLowerCase().includes(tithiWord));
  const yoga = Boolean(fx.angle) && fx.yoga.length >= 4 && text.toLowerCase().includes(fx.yoga.toLowerCase());
  const tara = fx.angle?.lead === "tara" && /birth star|జన్మ నక్షత్ర|जन्म नक्षत्र/i.test(text);
  return (star || tithi || yoga || tara) && REASON_RE[locale].test(text);
}

/** Minimum share of dated days whose copy gives a panchang-tied reason. */
export const PANCHANG_REASON_MIN = 0.6;

/** Chapter title checks: a word twice in one title, or a lead word another chapter already used. */
export function chapterTitleProblems(title: string, leadSeen: Set<string>): string[] {
  const words = title.split(/[\s,&/–-]+/).filter((w) => w && !TITLE_STOP.has(w.toLowerCase()));
  const stems = words.map(titleStem).filter((s) => s.length >= 3);
  const out: string[] = [];
  if (new Set(stems).size < stems.length) out.push("title_word_repeat");
  const lead = stems[0];
  if (lead) {
    if (leadSeen.has(lead)) out.push("title_lead_repeat");
    leadSeen.add(lead);
  }
  return out;
}

const CONTENT_STOP = new Set(["your", "you", "the", "and", "for", "with", "that", "this", "today", "from", "into", "some", "any", "one", "all", "are", "can", "will", "just", "keep", "make", "get", "use", "time", "slot", "good", "day",
  "अपने", "अपनी", "अपना", "करें", "कीजिए", "किसी", "लिए", "साथ", "बातें", "थोड़ा", "थोड़ी", "दिन", "आज", "समय", "उनके", "उनकी", "जैसे",
  "మీరు", "మీకు", "ఈరోజు", "కోసం", "చేయండి", "రోజు", "ఒకటి", "కొంచెం", "మీ", "ఇంకా"]);
function contentWords(s: string): Set<string> {
  return new Set(tokenize(s).filter((w) => w.length >= 4 && !CONTENT_STOP.has(w)).map(titleStem));
}

/** The same task told twice on one Today screen (body vs. do chips vs. window notes). */
export function screenRepeat(d: V2DayCopy): boolean {
  const body = contentWords(`${d.line ?? ""} ${d.body ?? ""}`);
  const parts = [...(d.do ?? []), ...(d.window_notes ?? []).map((n) => n.note)].map(contentWords);
  let hits = 0;
  for (const p of parts) {
    const shared = [...p].filter((w) => body.has(w)).length;
    if (p.size && shared >= 2 && shared / p.size >= 0.5) hits += 1;
  }
  for (let i = 0; i < parts.length; i++) {
    for (let j = 0; j < i; j++) {
      const shared = [...parts[i]].filter((w) => parts[j].has(w)).length;
      if (shared >= 2) hits += 1;
    }
  }
  return hits >= 2;
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
  // v4 is progressive: only the first parts' ids are required; later days/chapters are optional.
  const req = isV4(facts) ? requiredIdsV4(facts) : null;
  need("days", c.days, req ? req.days : facts.days.map((d) => d.date), (x: { date: string }) => x.date);
  need("weekdays", c.weekdays, facts.weekdays.map((d) => d.weekday), (x: { weekday: string }) => x.weekday);
  need("chapters", c.chapters, req ? req.chapters : facts.chapters.map((d) => d.chapter_id), (x: { chapter_id: number }) => Number(x.chapter_id));
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
    if (jargonHits(text, locale).length) flag(section, id, "jargon");
    if (strictFacts) {
      if (TIME_RE.some((re) => re.test(text))) flag(section, id, "clock_time");
      if (PLANET_RE[locale].test(text)) flag(section, id, "planet_name");
      if (YEAR_RE.test(text)) flag(section, id, "year");
    }
  };

  const dayWin = new Map(facts.days.map((d) => [d.date, d.windows.filter((w) => !w.writer || w.writer === "llm").map((w) => w.id)]));
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
  const dayFact = new Map(facts.days.map((d) => [d.date, d]));
  const natalStar = (facts.natal as { nakshatra?: string } | undefined)?.nakshatra ?? "";
  const bodyOpenSeen = new Map<string, number>();
  let starOpeners = 0;
  let stockLinks = 0;
  for (const { section, id, d, wins } of dayLike) {
    const text = dayText(d);
    checkText(section, id, text, true);
    const fx = section === "days" ? dayFact.get(String(id)) : undefined;
    for (const reason of groundingProblems(text, d, fx, natalStar, locale, section)) flag(section, id, reason);
    const bodyOpen = tokenize(d.body ?? "").slice(0, 2).join(" ");
    bodyOpenSeen.set(bodyOpen, (bodyOpenSeen.get(bodyOpen) ?? 0) + 1);
    if (bodyOpen && (bodyOpenSeen.get(bodyOpen) ?? 0) > 2) flag(section, id, "body_opener_repeat");
    if (fx) {
      const first = (d.body ?? "").trim().split(/[\s,]+/)[0] ?? "";
      const starWords = [fx.nakshatra.split(" ")[0], NAKSHATRA_TE[fx.nakshatra]?.split(" ")[0] ?? "~"];
      if (first && starWords.some((w) => first.startsWith(w))) {
        starOpeners += 1;
        if (starOpeners > 10) flag(section, id, "star_opener_repeat");
      }
      if (/\b(combined with|alongside)\b/i.test(d.body ?? "")) flag(section, id, "formula_phrase");
      if (STOCK_LINK.test(d.body ?? "")) {
        stockLinks += 1;
        if (stockLinks > 2) flag(section, id, "formula_phrase");
      }
    }
    if (!d.title || !d.body || (d.body ?? "").length < 40) flag(section, id, "too_thin");
    if (section === "days" && screenRepeat(d)) flag(section, id, "screen_repeat");
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

  // Theme-level repetition across the whole run of days (the template feel a pairwise check misses).
  const theme = themeCheck(c.days ?? [], facts);
  for (const f of theme.flags) flag("days", f.id, f.reason);

  // Usefulness: at least 60% of dated days must say WHY, tied to that day's star or tithi.
  // Below the bar, flag just enough of the ungrounded days (earliest first, they show first) for the repair pass.
  const reasonless = (c.days ?? []).filter((d) => !panchangReason(d, dayFact.get(d.date), locale)).map((d) => d.date).sort();
  const totalDays = (c.days ?? []).length;
  const reasonShare = totalDays ? (totalDays - reasonless.length) / totalDays : 1;
  if (totalDays && reasonShare < PANCHANG_REASON_MIN) {
    const need = Math.ceil(PANCHANG_REASON_MIN * totalDays) - (totalDays - reasonless.length);
    for (const id of reasonless.slice(0, need + 2)) flag("days", id, "reason_missing");
  }

  const chapterTitles = new Map<string, number>();
  const leadSeen = new Set<string>();
  for (const ch of c.chapters ?? []) {
    checkText("chapters", Number(ch.chapter_id), [ch.title, ch.highlight, ch.body, ch.share_line].join(" "), false);
    const k = tokenize(ch.title ?? "").join(" ");
    chapterTitles.set(k, (chapterTitles.get(k) ?? 0) + 1);
    if ((chapterTitles.get(k) ?? 0) > 1) flag("chapters", Number(ch.chapter_id), "title_repeat");
    for (const r of chapterTitleProblems(ch.title ?? "", leadSeen)) flag("chapters", Number(ch.chapter_id), r);
    if (chapterTitleTooLong(ch.title ?? "")) flag("chapters", Number(ch.chapter_id), "title_too_long");
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

  // v4: every chart claim (graha, house, yoga, dignity) must be backed by a cited evidence item.
  let claims = 0, unsupported = 0;
  if (isV4(facts)) {
    const chFact = new Map(facts.chapters.map((f) => [f.chapter_id, f]));
    const run = (section: Flag["section"], id: string | number, text: string, cited: string[] | undefined, extra: string[]) => {
      const r = checkClaims(text, cited ?? [], facts, extra);
      claims += r.claims;
      unsupported += r.unsupported.length;
      for (const u of r.unsupported.slice(0, 3)) flag(section, id, `unsupported_claim:${u}`);
    };
    if (c.profile) {
      const pr = c.profile;
      run("profile" as Flag["section"], "profile", [pr.title, pr.summary, ...(pr.strengths ?? []), ...(pr.watchouts ?? []), pr.work_style, pr.relationship_style].join(" "), pr.evidence_ids, []);
    }
    for (const a of c.areas ?? []) run("areas", a.area_id, `${a.headline} ${a.summary}`, a.evidence_ids, []);
    const lordsOf = (f: V2ChapterFact | undefined) => f ? [f.md, f.ad, ...(f.md_lords ?? [])].filter(Boolean) : [];
    for (const ch of c.chapters ?? []) {
      const id = Number(ch.chapter_id);
      // A chapter may name its own period lords and the neighbouring chapters' lords ("after the
      // Venus sub-period ..."): those are dasha facts, not chart claims.
      const allowed = [...lordsOf(chFact.get(id)), ...lordsOf(chFact.get(id - 1)), ...lordsOf(chFact.get(id + 1))];
      run("chapters", id, `${ch.title} ${ch.highlight} ${ch.body}`, ch.evidence_ids, allowed);
    }
  }

  if (isV5(facts)) for (const x of v5Flags(c, facts)) flag(x.section, x.id, x.reason);
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
      panchang_reason_pct: Math.round(reasonShare * 100),
      ...(isV4(facts) ? { claims, unsupported_claims: unsupported, unsupported_pct: claims ? Math.round((unsupported / claims) * 1000) / 10 : 0 } : {}),
      theme: theme.stats,
      profile_jargon: jargonHits([c.profile?.title, c.profile?.summary, ...(c.profile?.strengths ?? []), ...(c.profile?.watchouts ?? []), c.profile?.work_style, c.profile?.relationship_style].filter(Boolean).join(" "), locale).length,
    },
  };
}

export const REPAIR_MAX_DAYS = 18;
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
    else if (f.section === "profile") scope.profile = true;
  }
  // Bound one repair call: the earliest flagged days first (they are on screen first).
  if (scope.days && scope.days.length > REPAIR_MAX_DAYS) scope.days = [...new Set(scope.days)].sort().slice(0, REPAIR_MAX_DAYS);
  const n = Object.values(scope).reduce((s, a) => s + (Array.isArray(a) ? a.length : a === true ? 1 : 0), 0);
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
    ...(scope.profile ? { profile: content.profile } : {}),
  };
  const factItems = {
    days: promptFacts(facts).days.filter((d) => scope.days?.includes(d.date)),
    weekdays: facts.weekdays.filter((d) => scope.weekdays?.includes(d.weekday)),
    chapters: facts.chapters.filter((d) => scope.chapters?.includes(d.chapter_id)),
    weeks: facts.weeks.filter((d) => scope.weeks?.includes(d.period_key)),
    months: facts.months.filter((d) => scope.months?.includes(d.period_key)),
    ...(isV4(facts) ? { evidence: facts.chart!.evidence.map((e) => ({ id: e.id, ref: e.ref, meaning: e.meaning })) } : {}),
  };
  const keepTitles = (content.days ?? []).filter((d) => !scope.days?.includes(d.date)).map((d) => d.title);
  return [
    "Rewrite ONLY these items. Fix every listed problem and keep everything else about the rules.",
    "Problems:",
    ...v.flags.filter((f) => f.section !== "days" || scope.days?.includes(String(f.id))).map((f) => `- ${f.section} ${f.id}: ${f.reasons.join(", ")}`),
    "similar_to/title_repeat/opening_repeat/chip_overused = make it clearly different from the rest; wrong_script = write fully in the target script; clock_time/planet_name/year = remove them; wrong_star = use exactly that day's nakshatra (call it 'your birth star' only if is_birth_star); tone_label = drop 'mixed/careful/supportive tone' and 'a mixed/supportive/rest day' (the app shows the tone) and open with the day's real hook; weekday_in_title = remove the weekday name; tithi_missed = mention the tithi_hint; body_opener_repeat = start the body differently; star_opener_repeat = do not open with the star name, lead with the action or moment and name the star mid-sentence; formula_phrase = drop 'combined with/alongside', say it plainly; screen_repeat = give the line, body, do chips and each window note a different task or angle; title_word_repeat = no word twice in the title; title_lead_repeat = start the title with a different word than other chapters; title_too_long = 2-4 words, at most 28 characters; formula_phrase (stock link) = drop 'నక్షత్రం వల్ల ఈరోజు' / 'thanks to <star>' and give the reason in fresh words; jargon = replace corporate/tech-job words (backend, workflow, bottleneck, operational, stakeholders ...) with everyday words and do not assume a profession; reason_missing = in the line or body name that day's star (or tithi) and say plainly WHY it suits this action (because / so / which means; Telugu కాబట్టి / అందుకే / కావడంతో), without opening the body with the star's name.",
    "stock_star_line = drop '<star> is today's star' / 'today's star is'; give the reason from MEANINGS in fresh words; hint_word = never write 'hint'; slot_opener = start the slot note with what the slot suits, not 'Use this slot/A good slot/Good for'; trait_off_day = remove every mention of their personality trait (this day's angle.trait_ok is false); overused:<word> = do not use that word; ngram_repeat = do not use that phrase; title_formula = no '<Star>'s <Noun>' title; star_misspelled = spell the star/tithi exactly as in FACTS; unsupported_claim:<x> = either cite the EVIDENCE id that states <x> in evidence_ids or remove <x> (never invent a chart fact).",
    ...(isV5(facts) ? ["lord_chain = drop 'X lord in Y links/connects A with B' and say what it means for the person in plain words; truncated = end on a complete sentence and stay inside the length; opener_repeat = open this chapter differently from the others; stage_missing = frame the chapter by its life_stage and ages first; past_asserted = describe what the chart suggests for that age, never state an event as fact; past_hedge = no 'may have/perhaps you': say what the stretch favoured; action_missing = add ONE concrete thing to do (verb first); why_missing = add the one-sentence plain why; verdict_mismatch = this day's verdict is not for big starts: make the line and do chips fit verdict.tone (finish, review, keep light)."] : []),
    `Titles already used elsewhere (do not reuse): ${JSON.stringify(keepTitles.slice(0, 45))}`,
    ...(v.stats.theme ? ["Already said elsewhere in this reading (do not echo):", ...alreadySaid(content.days ?? [], new Set(scope.days ?? []), v.stats.theme)] : []),
    ...(isV3(facts) && facts.meanings ? ["MEANINGS (engine tables):", JSON.stringify(facts.meanings)] : []),
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
    ...(patch.profile?.summary ? { profile: patch.profile } : {}),
  };
}

// ---------------------------------------------------------------- view (legacy-compatible content)

export type ViewOptions = {
  dateStr: string;
  tz: string;
  locale: ReadingLocale;
  daysBefore?: number;
  daysAfter?: number;
  /** v3: engine facts for a date outside the written range (real panchang, not a weekday copy). */
  engineDay?: (date: string) => V2DayFact | null;
};

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

/** v3: the model's one slot note plus engine notes (hora / Rahu Kalam) for the other slots, in window order. */
function windowNotesV3(d: V2DayCopy | null, fx: V2DayFact, locale: ReadingLocale) {
  const byId = new Map((d?.window_notes ?? []).map((n) => [n.window_id, n]));
  const noteFor = (w: V2WindowFact) => {
    const llm = byId.get(w.id);
    if (llm && llm.note) return { category: llm.label, why_it_works: llm.note };
    return engineSlotNote(w.kind, w.hora, fx.angle?.area, locale);
  };
  return {
    good_window_notes: fx.windows.filter((w) => w.kind === "good").map(noteFor),
    caution_window_notes: fx.windows.filter((w) => w.kind === "caution").map(noteFor),
  };
}

function dayCard(key: string, d: V2DayCopy, source: "day" | "weekday" | "engine", tone?: string, fx?: V2DayFact, locale?: ReadingLocale) {
  return {
    key,
    ...(tone ? { tone } : {}),
    title: d.title,
    one_line: d.line,
    body: d.body,
    better_for: d.do ?? [],
    be_careful: d.avoid ?? [],
    ...(fx?.windows?.some((w) => w.writer) && locale ? windowNotesV3(d, fx, locale) : windowNotesFor(d)),
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
/** Last-mile script guard for te/hi: sentences in a drifted script are dropped; a chapter or
 * day left without a clean title/body falls back to the engine's own copy for that item. */
export function scriptGuard(c: V2Content, facts: V2Facts): V2Content {
  const L = facts.locale;
  if (L === "en") return c;
  const deep = (v: unknown): unknown =>
    typeof v === "string" ? stripAlien(v, L)
    : Array.isArray(v) ? v.map(deep).filter((x) => x !== "")
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, deep(x)]))
    : v;
  if (!hasAlien(JSON.stringify(c), L)) return c;
  const out = deep(c) as V2Content;
  const chF = new Map(facts.chapters.map((f) => [f.chapter_id, f]));
  const dayF = new Map(facts.days.map((d) => [d.date, d]));
  const summary = new Set(facts.chapters.filter((f) => f.kind === "summary").map((f) => f.chapter_id));
  out.chapters = (out.chapters ?? []).map((ch) => {
    const f = chF.get(Number(ch.chapter_id));
    if (!f || (ch.title && ch.highlight && (ch.body || summary.has(f.chapter_id)))) return ch;
    const e = engineChapterCopy(f, L);
    return { ...ch, title: ch.title || e.title, highlight: ch.highlight || e.highlight, body: summary.has(f.chapter_id) ? "" : ch.body || e.body };
  });
  out.days = (out.days ?? []).map((d) => {
    const f = dayF.get(d.date);
    if (!f || (d.title && d.line && d.body)) return d;
    const e = engineDayCopy(f, L) as Partial<V2DayCopy>;
    return { ...d, title: d.title || e.title || "", line: d.line || e.line || "", body: d.body || e.body || "" };
  });
  return out;
}

export function buildReadingView(raw: V2Content, facts: V2Facts, opts: ViewOptions): Record<string, unknown> {
  // Older stored readings (v2.2 and legacy) get the same last-mile voice fixes (human dates, no "window").
  const c = scriptGuard(polishDeep(raw, opts.locale, POLISH_SKIP), facts);
  const now = DateTime.fromISO(opts.dateStr, { zone: opts.tz }).set({ hour: 12 }).toMillis();
  const byDate = new Map((c.days ?? []).map((d) => [d.date, d]));
  const byWeekday = new Map((c.weekdays ?? []).map((d) => [d.weekday, d]));
  const toneByDate = new Map((facts.days ?? []).map((d) => [d.date, d.day_tone]));
  const factByDate = new Map((facts.days ?? []).map((d) => [d.date, d]));
  const start = DateTime.fromISO(opts.dateStr, { zone: opts.tz });
  const todayCards: Record<string, unknown>[] = [];
  const v3 = isV3(facts);
  for (let i = -(opts.daysBefore ?? 7); i <= (opts.daysAfter ?? 45); i++) {
    const dt = start.plus({ days: i });
    const key = dt.toISODate()!;
    const day = byDate.get(key);
    if (day) {
      todayCards.push(dayCard(key, day, "day", toneByDate.get(key), factByDate.get(key), opts.locale));
      continue;
    }
    if (v3) {
      // Past the written range: a real card from that date's panchang, never a weekday copy.
      const fx = factByDate.get(key) ?? opts.engineDay?.(key);
      if (fx) todayCards.push(dayCard(key, { ...engineDayCopy(fx, opts.locale), window_notes: [] }, "engine", fx.day_tone, fx, opts.locale));
      continue;
    }
    const wd = byWeekday.get(WEEKDAYS[dt.weekday % 7]);
    if (wd) todayCards.push(dayCard(key, wd, "weekday"));
  }
  const chFacts = new Map(facts.chapters.map((f) => [f.chapter_id, f]));
  const v4 = isV4(facts);
  const v5 = isV5(facts);
  const written = new Map((c.chapters ?? []).map((ch) => [Number(ch.chapter_id), ch]));
  // v4 is progressive: chapters not written yet show an engine card (period themes) and are
  // written on demand when opened.
  const chapters = (v4
    ? facts.chapters.map((f) => written.get(f.chapter_id) ?? { chapter_id: f.chapter_id, ...engineChapterCopy(f, facts.locale), share_line: "", pending: true })
    : [...(c.chapters ?? [])].filter((ch) => chFacts.has(Number(ch.chapter_id))))
    .sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id)) as (V2Content["chapters"][number] & { pending?: boolean })[];
  const evRef = new Map((facts.chart?.evidence ?? []).map((e) => [e.id, e.ref]));
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
      kind: f.kind ?? "detail",
      ...(f.kind === "summary" ? { mdLords: f.md_lords ?? [f.md], early: Boolean(f.early) } : {}),
      ageFrom: f.age_from ?? null,
      ageTo: f.age_to ?? null,
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
      ...(v4 ? { pending: Boolean(ch.pending), evidence: (ch.evidence_ids ?? []).map((id) => evRef.get(id)).filter(Boolean) } : {}),
      ...(v5 ? {
        why: ch.why ?? "",
        action: ch.action ?? "",
        lifeStage: stageKey(f.age_from, f.age_to),
        chapterDomains: f.chapter_domains ?? [],
        arcMd: f.arc_md ?? f.md,
      } : {}),
    };
  });
  const journeyFacts = journeyPhases.map((p) => ({
    sortOrder: p.sortOrder,
    periodLabel: p.periodLabel,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    mahadashaLord: p.mahadashaLord,
    antardashaLord: p.antardashaLord,
    kind: p.kind,
    ageFrom: p.ageFrom,
    ageTo: p.ageTo,
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
      ...(v5 ? { why: c.profile?.why ?? "" } : {}),
    },
    ...(v5 ? {
      life_story: c.life_story ?? "",
      life_arcs: arcsOf(facts.chapters).map((a) => ({
        md: a.md, line: (c.arcs ?? []).find((x) => x.md === a.md)?.line ?? "", ageFrom: a.from, ageTo: a.to, chapterIds: a.chapter_ids,
      })),
    } : {}),
    user_identity: {
      work_money_pattern: c.profile?.work_style,
      relationship_pattern: c.profile?.relationship_style,
    },
    category_reports: Object.fromEntries((c.areas ?? []).map((a) => [a.area_id, { headline: a.headline, summary: a.summary, ...(v5 ? { why: a.why ?? "" } : {}), ...(v4 ? { evidence: (a.evidence_ids ?? []).map((id) => evRef.get(id)).filter(Boolean) } : {}) }])),
    ...(v4 ? { chart_evidence: { houses_from: facts.chart!.ref, confidence: facts.chart!.confidence, profile: (c.profile?.evidence_ids ?? []).map((id) => evRef.get(id)).filter(Boolean) } } : {}),
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
