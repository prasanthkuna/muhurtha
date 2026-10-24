/**
 * Bond — pure part: match + monthly couple facts, LLM schemas, prompts and validation.
 * The engine owns every fact (kootas, Kuja, day types); the LLM only explains them in plain
 * words, written natively in the reader's language. DB / job code lives in bond.ts.
 */
import { DateTime } from "luxon";
import { ashtakoota, kujaDosha, type MatchResult, type MoonStar, pairKuja, rashiOfStar } from "./koota.ts";
import { houseFrom, type NatalGrahas, siderealLon } from "./grahas.ts";
import { type CalPlace, coupleDayType, type CoupleDayType, dayFacts } from "./calendar.ts";
import { NAKSHATRAS } from "./vimshottari.ts";

export const BOND_SCHEMA_VERSION = 1;
export const MATCH_PROMPT_VERSION = "match-v1";
export const MONTH_PROMPT_VERSION = "bond-month-v1";
export type BondLocale = "en" | "te" | "hi";
export const RASHI_KEYS = ["mesha", "vrishabha", "mithuna", "karka", "simha", "kanya", "tula", "vrishchika", "dhanu", "makara", "kumbha", "meena"] as const;
const ELEMENTS = ["fire", "earth", "air", "water"] as const;
export type Element = (typeof ELEMENTS)[number];
export const elementOf = (sign: number): Element => ELEMENTS[((sign % 4) + 4) % 4];

export type BondPerson = {
  name: string;
  star: MoonStar;
  /** true when the Moon star comes from a noon estimate (no birth time, no star given) */
  starApprox: boolean;
  natal: NatalGrahas;
  place: CalPlace;
};

export function placeFor(star: MoonStar, base: Omit<CalPlace, "natalNakshatra" | "natalRashi">): CalPlace {
  return { ...base, natalNakshatra: NAKSHATRAS[star.nak] as string, natalRashi: RASHI_KEYS[rashiOfStar(star)] };
}

// ------------------------------------------------------------------ match facts

export type LoveStyle = { needs: Element; shows: Element; conflict: Element };
export function loveStyle(p: BondPerson): LoveStyle {
  return {
    needs: elementOf(rashiOfStar(p.star)),
    shows: elementOf(p.natal.grahas.Venus.sign),
    conflict: elementOf(p.natal.grahas.Mars.sign),
  };
}

export type MatchFacts = {
  v: 1;
  locale: BondLocale;
  relationship_kind: string;
  total: number;
  band: MatchResult["band"];
  approximate: boolean;
  kootas: { id: string; points: number; max: number; code: string; dosha?: boolean; dosha_cancelled?: boolean; cancel_rule?: string }[];
  kuja: { pair: string; note_code: string; a: { status: string; cancellations: string[]; approximate: boolean }; b: { status: string; cancellations: string[]; approximate: boolean } };
  a: { name: string; nakshatra: string; pada: number; moon_sign: string; gana: string; nadi: string; yoni: string; love: LoveStyle };
  b: { name: string; nakshatra: string; pada: number; moon_sign: string; gana: string; nadi: string; yoni: string; love: LoveStyle };
};

export function matchFacts(a: BondPerson, b: BondPerson, locale: BondLocale, relationshipKind = "prefer_not"): MatchFacts {
  const m = ashtakoota(a.star, b.star);
  const ka = kujaDosha(a.natal, rashiOfStar(a.star));
  const kb = kujaDosha(b.natal, rashiOfStar(b.star));
  const pk = pairKuja(ka, kb);
  const side = (p: BondPerson, s: MatchResult["a"]) => ({
    name: p.name,
    nakshatra: s.nak,
    pada: s.pada,
    moon_sign: RASHI_KEYS[s.rashi],
    gana: s.gana,
    nadi: s.nadi,
    yoni: s.yoni,
    love: loveStyle(p),
  });
  return {
    v: 1,
    locale,
    relationship_kind: relationshipKind,
    total: m.total,
    band: m.band,
    approximate: a.starApprox || b.starApprox,
    kootas: m.kootas,
    kuja: {
      pair: pk.status,
      note_code: pk.note_code,
      a: { status: ka.status, cancellations: ka.cancellations, approximate: ka.approximate },
      b: { status: kb.status, cancellations: kb.cancellations, approximate: kb.approximate },
    },
    a: side(a, m.a),
    b: side(b, m.b),
  };
}

// ------------------------------------------------------------------ month facts

export type MonthDay = { date: string; weekday: number; type: CoupleDayType; a_rank: number; b_rank: number };
export type MonthFacts = {
  v: 1;
  locale: BondLocale;
  month: string;
  a_name: string;
  b_name: string;
  counts: Record<CoupleDayType, number>;
  days: MonthDay[];
  key_days: { date: string; type: CoupleDayType }[];
  weeks: { week_key: string; from: string; to: string; counts: Partial<Record<CoupleDayType, number>> }[];
  notes: { who: "a" | "b"; code: "short_fuse" | "romance_lift"; from: string; to: string }[];
  band: MatchResult["band"];
};

export function monthFacts(a: BondPerson, b: BondPerson, month: string, locale: BondLocale, band: MatchResult["band"]): MonthFacts {
  const start = DateTime.fromISO(`${month}-01`, { zone: a.place.zone });
  const days: MonthDay[] = [];
  for (let d = start; d.month === start.month; d = d.plus({ days: 1 })) {
    const iso = d.toISODate()!;
    const qa = dayFacts(iso, a.place), qb = dayFacts(iso, b.place);
    if (!qa || !qb) continue;
    days.push({ date: iso, weekday: qa.weekday, type: coupleDayType(qa, qb), a_rank: qa.rank, b_rank: qb.rank });
  }
  const counts = { warm: 0, soft: 0, support_a: 0, support_b: 0, talk: 0, ordinary: 0 } as Record<CoupleDayType, number>;
  for (const d of days) counts[d.type]++;
  const warm = days.filter((d) => d.type === "warm").sort((x, y) => (y.a_rank + y.b_rank) - (x.a_rank + x.b_rank) || x.date.localeCompare(y.date)).slice(0, 4);
  const soft = days.filter((d) => d.type === "soft").slice(0, 4);
  const support = days.filter((d) => d.type === "support_a" || d.type === "support_b").slice(0, 3);
  const talk = days.filter((d) => d.type === "talk").slice(0, 2);
  const key_days = [...warm, ...soft, ...support, ...talk].map((d) => ({ date: d.date, type: d.type })).sort((x, y) => x.date.localeCompare(y.date));
  const weeks: MonthFacts["weeks"] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const c: Partial<Record<CoupleDayType, number>> = {};
    for (const d of chunk) c[d.type] = (c[d.type] ?? 0) + 1;
    weeks.push({ week_key: `w${weeks.length + 1}`, from: chunk[0].date, to: chunk[chunk.length - 1].date, counts: c });
  }
  const notes: MonthFacts["notes"] = [];
  for (const [who, p] of [["a", a], ["b", b]] as const) {
    const moon = rashiOfStar(p.star);
    let runMars: string | null = null, runVenus: string | null = null, last = "";
    for (const d of days) {
      const at = DateTime.fromISO(d.date, { zone: p.place.zone }).set({ hour: 12 }).toJSDate();
      const mars = Math.floor(siderealLon("Mars", at) / 30);
      const ven = houseFrom(moon, Math.floor(siderealLon("Venus", at) / 30));
      const onMars = mars === moon;
      const onVenus = ven === 5 || ven === 7;
      if (onMars && !runMars) runMars = d.date;
      if (!onMars && runMars) { notes.push({ who, code: "short_fuse", from: runMars, to: last }); runMars = null; }
      if (onVenus && !runVenus) runVenus = d.date;
      if (!onVenus && runVenus) { notes.push({ who, code: "romance_lift", from: runVenus, to: last }); runVenus = null; }
      last = d.date;
    }
    if (runMars) notes.push({ who, code: "short_fuse", from: runMars, to: last });
    if (runVenus) notes.push({ who, code: "romance_lift", from: runVenus, to: last });
  }
  return { v: 1, locale, month, a_name: a.name, b_name: b.name, counts, days, key_days, weeks, notes, band };
}

// ------------------------------------------------------------------ schemas

type Json = Record<string, unknown>;
const str = (max: number, desc: string): Json => ({ type: "string", description: `${desc} (max ${max} chars)` });
const arr = (items: Json, n: number | [number, number]): Json => ({
  type: "array", items, minItems: Array.isArray(n) ? n[0] : n, maxItems: Array.isArray(n) ? n[1] : n,
});
const obj = (props: Record<string, Json>): Json => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });

export const MATCH_LIMITS = { headline: 70, summary: 360, plain: 170, kuja: 300, line: 120, practise: 200, myth: 240, share: 110 };
export const MONTH_LIMITS = { headline: 70, body: 420, line: 120, week: 170, action: 120, push: 110, share: 110 };

export function matchSchema(): Json {
  const L = MATCH_LIMITS;
  const partner = obj({
    who: { type: "string", enum: ["a", "b"] },
    feels_loved: str(L.line, "what makes this person feel loved, from their love style codes"),
    pleases: arr(str(L.line, "one concrete thing the other partner can do"), 3),
    avoid: arr(str(L.line, "one thing to avoid with this person, kind wording"), 3),
    try_this_week: str(L.line, "one small, specific action for this week"),
  });
  return obj({
    headline: str(L.headline, "warm, honest one-line read of the match; no score number"),
    summary: str(L.summary, "2-3 sentences: what flows easily and what needs care"),
    kootas: arr(obj({ koota_id: { type: "string", enum: ["varna", "vashya", "tara", "yoni", "graha_maitri", "gana", "bhakoot", "nadi"] }, plain: str(L.plain, "what this koota means for the two of them in daily life, plain words") }), 8),
    kuja_note: str(L.kuja, "Kuja (Mangal) dosha in plain words; lead with any cancellation; calm, never scary"),
    strengths: arr(str(L.line, "a real strength of this pair"), 3),
    practise: str(L.practise, "one habit that turns the weaker kootas into teamwork"),
    partners: arr(partner, 2),
    myth_bust: str(L.myth, "one gentle myth-buster about scores (a number is not a verdict)"),
    share_line: str(L.share, "a short, upbeat line fit for a share card; no score number"),
  });
}

export function monthSchema(f: MonthFacts): Json {
  const L = MONTH_LIMITS;
  const dates = f.key_days.map((d) => d.date);
  return obj({
    headline: str(L.headline, "the month in one line for the couple"),
    body: str(L.body, "3-4 sentences on how the month flows for the two of them"),
    do: arr(str(L.line, "one thing to do together this month"), 3),
    dont: arr(str(L.line, "one thing to avoid this month, kind wording"), 3),
    weeks: arr(obj({ week_key: { type: "string", enum: f.weeks.map((w) => w.week_key) }, line: str(L.week, "what this week is good for as a couple") }), f.weeks.length),
    key_days: arr(obj({ date: { type: "string", enum: dates.length ? dates : [`${f.month}-01`] }, action: str(L.action, "what to do on this day together, fitting its type") }), [Math.min(3, dates.length), Math.max(1, dates.length)]),
    push: obj({ month_ready: str(L.push, "notification line announcing the guide; no dates") }),
    share_line: str(L.share, "short upbeat line for a share card"),
  });
}

// ------------------------------------------------------------------ prompts

const LANGUAGE_NAME: Record<BondLocale, string> = { en: "English", te: "Telugu (తెలుగు script)", hi: "Hindi (देवनागरी script)" };

/** Relationship-harm phrases are never allowed in any language. */
export const BOND_BANNED: Record<BondLocale, string[]> = {
  en: ["break up", "breakup", "divorce", "leave them", "not meant to be", "incompatible", "doomed", "should not marry", "shouldn't marry", "bad match", "toxic", "the universe", "stars align", "cosmic"],
  te: ["విడాకులు", "విడిపోవాలి", "విడిపోండి", "పెళ్లి వద్దు", "సరిపోరు", "విశ్వం"],
  hi: ["तलाक", "अलग हो जाएं", "शादी न करें", "मेल नहीं", "ब्रह्मांड"],
};

// ═══════════════════════════════════════════════════════════════════ TELUGU VOICE (isolated)
// The Telugu tone is being revamped separately; change ONLY this block for Telugu voice.
const TELUGU_VOICE =
  "Telugu voice: write the way young Telugu couples text each other — warm, casual, everyday Telugu in Telugu script, " +
  "with common English words (date, plan, mood, call, sorry) left in English where that is how people actually talk. " +
  "Respectful (meeru) when addressing the reader; never preachy, never Sanskrit-heavy.";
// ═══════════════════════════════════════════════════════════════════ end TELUGU VOICE

function voiceRules(locale: BondLocale): string {
  if (locale === "te") return TELUGU_VOICE;
  if (locale === "hi") return "Hindi voice: warm everyday Hindi in Devanagari, respectful aap form, never tum/tu; common English words are fine.";
  return "English voice: warm, plain, modern; short sentences.";
}

function baseRules(locale: BondLocale): string[] {
  const lang = LANGUAGE_NAME[locale];
  return [
    `Write EVERYTHING in ${lang}.` + (locale === "en" ? "" : ` Write natively in ${lang}, not a translation.`),
    voiceRules(locale),
    "Partner wording is neutral: it fits spouses, fiancés and lovers alike. Use the two first names given; 'a' is the reader, address them as you.",
    "Never fatalistic. Never suggest breaking up, divorce, not marrying, or that the pair is doomed or incompatible. Low kootas mean 'needs care and practice', never 'bad'.",
    "Kuja (Mangal) dosha: if any cancellation or balance applies, say that FIRST. If it is present, keep it calm and practical. If facts are approximate, say the check is approximate without a birth time.",
    "No guaranteed outcomes, no medical, legal or money advice, no gemstones or paid remedies. No clock times. No score numbers in headline or share_line.",
    `Never use these phrases: ${BOND_BANNED[locale].concat(locale === "en" ? [] : BOND_BANNED.en.slice(0, 8)).map((p) => `"${p}"`).join(", ")}.`,
    "Respect every max length. Be concrete; no filler.",
  ];
}

export function matchSystemPrompt(f: MatchFacts): string {
  return [
    "You explain a Vedic Ashtakoota (Guna Milan) match for two partners in the Muhurta app. The engine computed every fact; you explain them for daily life.",
    ...baseRules(f.locale),
    "kootas: one item for each of the 8 koota ids, in plain words about daily life (how they talk, rest, decide, show care). Mention a dosha cancellation where the facts give one.",
    "partners: one entry for a and one for b. Use their love codes: needs = what makes them feel loved (fire: appreciation and fun; earth: reliability and practical help; air: talk and space; water: closeness and reassurance), shows = how they express love, conflict = how they react in a fight (fire: quick flare, quick cool; earth: goes quiet, needs time; air: argues with words, needs logic; water: withdraws, needs reassurance).",
  ].join("\n");
}

export function monthSystemPrompt(f: MonthFacts): string {
  return [
    "You write a monthly couple guide for two partners in the Muhurta app, from day types the engine computed from both charts.",
    ...baseRules(f.locale),
    "Day types: warm = both feel good, plan time together; soft = moods run thin, go gentle and postpone big talks; support_a = the reader (a) may feel low, they can ask for space; support_b = partner (b) may feel low, the reader should check in; talk = good for a clear conversation.",
    "notes: short_fuse = that person may be quicker to anger during those dates; romance_lift = affection comes easier. Use them in body or weeks without giving planet names.",
    "key_days: one action for each listed date, fitting its type. weeks: one line per week from its counts. Do not write dates inside text.",
  ].join("\n");
}

export function factsPrompt(f: unknown): string {
  return "FACTS (JSON):\n" + JSON.stringify(f);
}

// ------------------------------------------------------------------ validation

const SCRIPT_RE: Record<BondLocale, RegExp | null> = { en: null, te: /[\u0C00-\u0C7F]/g, hi: /[\u0900-\u097F]/g };
const LETTER_RE = /\p{L}/gu;
const TIME_RE = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(am|pm)\b/i;

function texts(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) for (const v of x) texts(v, out);
  else if (x && typeof x === "object") for (const v of Object.values(x)) texts(v, out);
  return out;
}

export type BondValidation = { ok: boolean; fatal: string[]; flags: string[]; stats: Record<string, number> };

export function validateBond(content: unknown, locale: BondLocale, kind: "match" | "bond_month", f?: MonthFacts): BondValidation {
  const fatal: string[] = [];
  const flags: string[] = [];
  if (!content || typeof content !== "object") return { ok: false, fatal: ["no_content"], flags, stats: {} };
  const c = content as Record<string, unknown>;
  const all = texts(c).join(" \n ");
  const lower = all.toLowerCase();
  for (const p of BOND_BANNED[locale].concat(BOND_BANNED.en)) if (lower.includes(p.toLowerCase())) fatal.push(`banned:${p}`);
  if (TIME_RE.test(all)) flags.push("clock_time");
  const re = SCRIPT_RE[locale];
  let share = 1;
  if (re) {
    const letters = all.match(LETTER_RE)?.length ?? 0;
    share = letters ? (all.match(re)?.length ?? 0) / letters : 0;
    if (share < 0.6) fatal.push(`script_share:${share.toFixed(2)}`);
  }
  if (kind === "match") {
    const ids = new Set(((c.kootas as { koota_id: string }[]) ?? []).map((k) => k.koota_id));
    if (ids.size !== 8) fatal.push("kootas_incomplete");
    const who = new Set(((c.partners as { who: string }[]) ?? []).map((p) => p.who));
    if (!(who.has("a") && who.has("b"))) fatal.push("partners_incomplete");
  } else if (f) {
    const allowed = new Set(f.key_days.map((d) => d.date));
    for (const d of (c.key_days as { date: string }[]) ?? []) if (!allowed.has(d.date)) fatal.push(`key_day:${d.date}`);
  }
  if (/\b\d{1,2}(\.\d)?\s*\/\s*36\b/.test(String(c.headline ?? "") + String(c.share_line ?? ""))) flags.push("score_in_headline");
  return { ok: fatal.length === 0, fatal, flags, stats: { chars: all.length, script_share: Math.round(share * 100) / 100 } };
}

/** Trim strings to their limits (the strict schema does not carry maxLength). */
export function clipBond<T>(x: T, max = 600): T {
  if (typeof x === "string") {
    const t = x.replace(/\s+/g, " ").trim();
    return (t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t) as T;
  }
  if (Array.isArray(x)) return x.map((v) => clipBond(v, max)) as T;
  if (x && typeof x === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = clipBond(v, max);
    return o as T;
  }
  return x;
}
