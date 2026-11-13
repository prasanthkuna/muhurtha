/**
 * Reading v4: astrology-first, context-compiled, progressive.
 *
 *  calculations (grahas.ts) -> rule engine (jyotisha.ts) -> evidence pack with ids (facts.chart)
 *  -> per-part context compiler (only the facts + evidence that part writes about, compact schema)
 *  -> Luna explains; the validator rejects any chart claim not backed by a cited evidence id.
 *
 * Initial parts: A = profile + life areas (Decode), B = previous/current/next chapter,
 * C = the first 7 days, D = weeks, months, ask starters, remedies, push lines.
 * Later: the other days in two background batches (F1, F2) after the reading is ready; other
 * chapters on demand (L) when opened. Until then Today/Calendar use engine cards and Life shows
 * engine chapter cards, so every screen works from the first second.
 */
import type { Evidence } from "./jyotisha.ts";
import { areaEvidence, type ChartPack, topEvidence } from "./jyotisha.ts";
import { SCREEN_JOB } from "./engine_copy.ts";
import type { ReadingLocale, SchemaScope, V2ChapterFact, V2Content, V2Facts } from "./reading_v2.ts";
import { promptFacts } from "./reading_v2.ts";

export const INITIAL_DAYS = 7;
export const FILL_BATCHES = 2;

export type EvidenceItem = Pick<Evidence, "id" | "kind" | "ref" | "meaning" | "grahas" | "houses" | "yoga">;
export type ChartFacts = {
  ref: ChartPack["ref"];
  ref_sign: string;
  confidence: ChartPack["confidence"];
  evidence: EvidenceItem[];
  /** area id -> evidence ids that area reads from. */
  areas: Record<string, string[]>;
  /** The most distinctive facts (opening insight). */
  top: string[];
};
export type ReadingStory = {
  /** Three distinct chart themes, each with its evidence id. Every screen draws from these. */
  themes: { id: string; line: string }[];
  now: { period: string; md: string; ad: string; brings: string[]; asks: string[] } | null;
  trait_budget: string;
  screens: Record<string, string>;
  avoid: string[];
};

/** Off switch for new readings (env READING_V4=0 keeps v3). */
/** Rollout switch: env READING_V4 ("1"/"0") wins; otherwise the code default below. */
export const READING_V4_DEFAULT = false;
export function readingV4Enabled(): boolean {
  const env = (Deno.env.get("READING_V4") ?? "").trim();
  return env ? env !== "0" : READING_V4_DEFAULT;
}

const AREA_ALIAS: Record<string, string> = {
  health_routine: "health", temperament: "health", learning: "education", sleep_rhythm: "spirituality",
  feeding_health: "health", bonding: "family",
};

export function chartFacts(pack: ChartPack, areaIds: string[]): ChartFacts {
  const slim = (e: Evidence): EvidenceItem => ({ id: e.id, kind: e.kind, ref: e.ref, meaning: e.meaning, grahas: e.grahas, houses: e.houses, ...(e.yoga ? { yoga: e.yoga } : {}) });
  return {
    ref: pack.ref,
    ref_sign: pack.ref_sign,
    confidence: pack.confidence,
    evidence: pack.evidence.map(slim),
    areas: Object.fromEntries(areaIds.map((a) => [a, areaEvidence(pack, AREA_ALIAS[a] ?? a, 4).map((e) => e.id)])),
    top: topEvidence(pack, 8).map((e) => e.id),
  };
}

export function buildStory(f: Pick<V2Facts, "chapters" | "current_chapter_id" | "is_child">, chart: ChartFacts, archetypePhrases: string[]): ReadingStory {
  const byId = new Map(chart.evidence.map((e) => [e.id, e]));
  // Three themes from different grahas (so screens do not all orbit one fact).
  const themes: ReadingStory["themes"] = [];
  const used = new Set<string>();
  for (const id of chart.top) {
    const e = byId.get(id);
    if (!e || e.kind === "lagna") continue;
    const g = e.grahas[0];
    if (used.has(g)) continue;
    used.add(g);
    themes.push({ id, line: e.meaning.split(";")[0] });
    if (themes.length === 3) break;
  }
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id);
  return {
    themes,
    now: cur ? { period: cur.period, md: cur.md, ad: cur.ad, brings: (cur.ad_theme?.support ?? cur.support).slice(0, 2), asks: (cur.ad_theme?.pressure ?? cur.pressure).slice(0, 2) } : null,
    trait_budget: "The birth-star personality (natal.archetype) may appear once in the profile, at most once across life areas, and on days only where angle.trait_ok is true.",
    screens: {
      decode: SCREEN_JOB.decode, life: SCREEN_JOB.life, today: SCREEN_JOB.today, calendar: SCREEN_JOB.calendar, ask: SCREEN_JOB.ask,
    },
    avoid: archetypePhrases.slice(0, 6),
  };
}

// ---------------------------------------------------------------- plans

export type V4PartKey = "A" | "B" | "C" | "D" | "F1" | "F2" | "L";
export type V4Plan = { key: V4PartKey; scope: SchemaScope; maxTokens: number; note: string };

export function chapterWindow(f: V2Facts): number[] {
  const ids = f.chapters.map((c) => c.chapter_id);
  const i = ids.indexOf(f.current_chapter_id ?? -1);
  if (i < 0) return ids.slice(0, 3);
  return ids.slice(Math.max(0, i - 1), i + 2);
}

export function requiredIdsV4(f: V2Facts): { days: string[]; chapters: number[] } {
  return { days: f.days.slice(0, INITIAL_DAYS).map((d) => d.date), chapters: chapterWindow(f) };
}

export function planPartsV4(f: V2Facts): V4Plan[] {
  const req = requiredIdsV4(f);
  return [
    { key: "A", scope: { profile: true, areas: f.area_ids }, maxTokens: 3000, note: "the personality profile and every life area" },
    { key: "B", scope: { chapters: req.chapters }, maxTokens: 3000, note: "the previous, current and next life chapters" },
    { key: "C", scope: { days: req.days }, maxTokens: 4000, note: "the first seven days" },
    { key: "D", scope: { weeks: f.weeks.map((w) => w.period_key), months: f.months.map((m) => m.period_key), extras: true }, maxTokens: 3000, note: "the weeks, the months, the ask starters, the remedies and the push lines" },
  ];
}

/** Background day batches for whatever days are not written yet. */
export function fillPlansV4(f: V2Facts, c: Partial<V2Content> | null): V4Plan[] {
  const have = new Set((c?.days ?? []).map((d) => d.date));
  const rest = f.days.map((d) => d.date).filter((d) => !have.has(d));
  if (!rest.length) return [];
  const per = Math.ceil(rest.length / FILL_BATCHES);
  const out: V4Plan[] = [];
  for (let i = 0; i < FILL_BATCHES; i++) {
    const ids = rest.slice(i * per, (i + 1) * per);
    if (ids.length) out.push({ key: i === 0 ? "F1" : "F2", scope: { days: ids }, maxTokens: 9000, note: "these days" });
  }
  return out;
}

/** On-demand chapters around one the user opened (that chapter first, then neighbours not yet written). */
export function chapterPlanV4(f: V2Facts, c: Partial<V2Content> | null, chapterId: number, batch = 5): V4Plan | null {
  const have = new Set((c?.chapters ?? []).map((x) => Number(x.chapter_id)));
  const ids = f.chapters.map((x) => x.chapter_id);
  const i = ids.indexOf(chapterId);
  if (i < 0) return null;
  const order = [0, -1, 1, -2, 2, -3, 3, 4, -4].map((d) => ids[i + d]).filter((x) => x != null && !have.has(x)) as number[];
  const pick = order.slice(0, batch).sort((a, b) => a - b);
  return pick.length ? { key: "L", scope: { chapters: pick }, maxTokens: 6000, note: "these life chapters" } : null;
}

// ---------------------------------------------------------------- context compiler

const compactChapter = (c: V2ChapterFact) => ({
  chapter_id: c.chapter_id, period: c.period, md: c.md, ad: c.ad, kind: c.kind ?? "detail",
  ...(c.kind === "summary" ? { md_lords: c.md_lords, early: c.early } : {}),
  age_from: c.age_from, age_to: c.age_to, tense: c.tense, domains: c.domains, support: c.support, pressure: c.pressure,
  ...(c.ad_theme ? { ad_theme: c.ad_theme } : {}), transition: c.transition,
});

function evidenceFor(f: V2Facts, ids: Iterable<string>): EvidenceItem[] {
  const want = new Set(ids);
  return (f.chart?.evidence ?? []).filter((e) => want.has(e.id)).map((e) => ({ id: e.id, kind: e.kind, ref: e.ref, meaning: e.meaning, grahas: e.grahas, houses: e.houses, ...(e.yoga ? { yoga: e.yoga } : {}) }));
}
const lordIds = (f: V2Facts, lords: string[]) => {
  const out = new Set<string>();
  for (const l of lords) {
    if (!l) continue;
    const k = l.toLowerCase();
    out.add(`p:${k}`);
    for (const e of f.chart?.evidence ?? []) {
      if (e.kind === "yoga" && e.grahas.map((g) => g.toLowerCase()).includes(k)) out.add(e.id);
      if (e.id === `md:${k}` || e.id === `ad:${k}` || e.id === `t:${k}`) out.add(e.id);
    }
  }
  return out;
};

function baseContext(f: V2Facts) {
  const n = f.natal as Record<string, unknown>;
  const arch = (n.archetype ?? null) as Record<string, string> | null;
  return {
    locale: f.locale,
    subject: f.subject,
    age: f.age,
    life_stage: f.life_stage,
    is_child: f.is_child,
    generation_date: f.generation_date,
    natal: {
      moon_sign: n.moon_sign, nakshatra: n.nakshatra, pada: n.pada, sun_sign: n.sun_sign, birth_time_known: n.birth_time_known,
      archetype: arch ? { core: arch.core, strength: arch.strength, shadow: arch.shadow } : null,
    },
    chart: f.chart ? { houses_from: f.chart.ref === "lagna" ? `Lagna ${f.chart.ref_sign}` : `Moon sign ${f.chart.ref_sign} (birth time not exact)`, confidence: f.chart.confidence } : null,
    story: f.story ?? null,
  };
}

export type Compiled = { user: string; evidenceIds: string[] };

/** The smallest complete context for one part. */
export function compileContext(f: V2Facts, p: V4Plan, c?: Partial<V2Content> | null): Compiled {
  const base = baseContext(f);
  const cur = f.chapters.find((x) => x.chapter_id === f.current_chapter_id);
  const curLite = cur ? { period: cur.period, md: cur.md, ad: cur.ad, ad_theme: cur.ad_theme ?? null } : null;
  let ctx: Record<string, unknown>;
  let ev: string[] = [];
  if (p.key === "A") {
    const ids = new Set<string>(["lagna", ...(f.chart?.top ?? [])]);
    for (const a of f.area_ids) for (const id of f.chart?.areas[a] ?? []) ids.add(id);
    if (cur) for (const id of lordIds(f, [cur.md, cur.ad])) ids.add(id);
    for (const id of ["md-ad", "t:saturn-moon", "t:jupiter-moon"]) ids.add(id);
    ev = [...ids];
    ctx = { ...base, current_chapter: curLite, area_evidence: f.chart?.areas ?? {}, area_ids: f.area_ids };
  } else if (p.key === "B" || p.key === "L") {
    const chs = f.chapters.filter((x) => (p.scope.chapters ?? []).includes(x.chapter_id));
    const ids = lordIds(f, chs.flatMap((x) => [x.md, x.ad, ...(x.md_lords ?? [])]));
    for (const id of ["md-ad", "t:saturn-moon", "t:jupiter-moon", "lagna"]) ids.add(id);
    ev = [...ids];
    const usedTitles = (c?.chapters ?? []).filter((x) => !(p.scope.chapters ?? []).includes(Number(x.chapter_id))).map((x) => x.title);
    ctx = {
      ...base,
      chapters: chs.map(compactChapter),
      chapter_ledger: f.chapters.map((x) => ({ id: x.chapter_id, period: x.period, md: x.md, ad: x.ad, tense: x.tense })),
      ...(usedTitles.length ? { titles_already_used: usedTitles } : {}),
    };
  } else if (p.key === "C" || p.key === "F1" || p.key === "F2") {
    const pf = promptFacts(f) as V2Facts & { meanings?: Record<string, Record<string, string>> };
    const days = pf.days.filter((d) => (p.scope.days ?? []).includes(d.date));
    const M = f.meanings ?? { stars: {}, tithis: {}, yogas: {}, taras: {}, horas: {} };
    const pick = (tbl: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(tbl).filter(([k]) => keys.includes(k)));
    const tithiKeys = days.map((d) => String(d.tithi).split(" ").slice(-1)[0]);
    const meanings = {
      stars: pick(M.stars, days.map((d) => d.nakshatra)), tithis: pick(M.tithis, tithiKeys),
      yogas: pick(M.yogas, days.map((d) => d.yoga)), taras: pick(M.taras, days.map((d) => d.tara ?? "")),
    };
    const written = (c?.days ?? []).filter((d) => !(p.scope.days ?? []).includes(d.date));
    ctx = {
      ...base, story: f.story ? { ...f.story, themes: undefined } : null, current_chapter: curLite, days, meanings,
      ...(written.length ? { titles_already_used: written.map((d) => d.title), openers_already_used: written.map((d) => (d.body ?? "").split(/\s+/).slice(0, 3).join(" ")) } : {}),
    };
  } else {
    ctx = { ...base, current_chapter: curLite, weeks: f.weeks, months: f.months, area_ids: f.area_ids };
  }
  const evidence = evidenceFor(f, ev);
  const user = [
    ...(evidence.length ? ["EVIDENCE (rule-engine output; the ONLY chart facts you may state; cite ids in evidence_ids):", JSON.stringify(evidence.map(({ id, ref, meaning }) => ({ id, ref, meaning }))), ""] : []),
    "FACTS (JSON):",
    JSON.stringify(ctx),
  ].join("\n");
  return { user, evidenceIds: evidence.map((e) => e.id) };
}

export function partInstructionV4(f: V2Facts, p: V4Plan): string {
  const ids: string[] = [];
  if (p.scope.profile) ids.push("profile");
  if (p.scope.areas?.length) ids.push(`areas ${JSON.stringify(p.scope.areas)}`);
  if (p.scope.chapters?.length) ids.push(`chapters ${JSON.stringify(p.scope.chapters)}`);
  if (p.scope.days?.length) ids.push(`days ${JSON.stringify(p.scope.days)}`);
  if (p.scope.weeks?.length) ids.push("all weeks");
  if (p.scope.months?.length) ids.push("all months");
  if (p.scope.extras) ids.push("ask_starters (4), remedies (3), push (five keys)");
  return [
    `PART ${p.key}: write ${p.note} (${ids.join("; ")}). Each listed id exactly once.`,
    p.key === "F1" || p.key === "F2" ? "Other days are already written: never reuse a title, body opener or chip from titles_already_used / openers_already_used." : "",
    p.key === "L" ? "Other chapters are already written: never reuse a title or its first word from titles_already_used." : "",
    `Language: ${f.locale}.`,
  ].filter(Boolean).join("\n");
}

export function v4SystemRules(f: V2Facts): string[] {
  const exact = f.chart?.ref === "lagna";
  return [
    "11. EVIDENCE: the profile, life areas and chapters are built on the EVIDENCE items (rule-engine output). Explain what they mean in everyday words; never state a chart fact (a graha's sign or house, a house lord, a yoga, exalted/debilitated/own sign, an aspect, a transit) that is not in an EVIDENCE item you list in evidence_ids. Planet names are allowed in profile, areas and chapters only when the cited evidence names that planet. Never invent a yoga.",
    "11a. Make the profile and every area SPECIFIC to this chart's evidence (house lords, placements, yogas), not to the birth-star personality alone: at least two of the six areas must rest on a different evidence item than the profile summary. The story.themes are the three threads shared by every screen; use them, do not invent new personality traits.",
    exact
      ? "11b. Houses are counted from the Lagna. Say houses in plain words (e.g. 'the house of career') more often than numbers."
      : "11b. The birth time is not exact: houses are counted from the Moon sign. Never mention a Lagna/ascendant and never claim precision; say 'from your Moon sign' when it matters.",
    "11c. Chapters: tie each chapter to its period lords' natal role from EVIDENCE (houses they rule and where they sit, md-ad link, current transit for the current chapter) and say what changes from the previous chapter.",
  ];
}

// ---------------------------------------------------------------- claims (validator)

const GRAHA_WORDS: Record<string, RegExp> = {
  Sun: /\b(sun|surya)\b|సూర్య|सूर्य/i,
  Moon: /\b(moon|chandra)\b|చంద్ర|चंद्र|चन्द्र/i,
  Mars: /\b(mars|mangal|kuja)\b|కుజ|మంగళ|मंगल/i,
  Mercury: /\b(mercury|budha)\b|బుధ|बुध(?!वार)/i,
  Jupiter: /\b(jupiter|guru)\b|బృహస్పతి|గురు(?!వారం)|बृहस्पति|गुरु(?!वार)/i,
  Venus: /\b(venus|shukra)\b|శుక్ర(?!వారం)|शुक्र(?!वार)/i,
  Saturn: /\b(saturn|shani)\b|శని(?!వారం)|शनि(?!वार)/i,
  Rahu: /\brahu\b(?!\s*kal)|రాహు(?!\s*కాల)|राहु(?!\s*काल)/i,
  Ketu: /\bketu\b|కేతు|केतु/i,
};
const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const HOUSE_RE = [
  /\b(\d{1,2})(?:st|nd|rd|th)\s+house\b/gi,
  /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+house\b/gi,
  /(\d{1,2})\s*(?:వ|వది|వ\s)?\s*(?:ఇల్లు|ఇంట|భావ|స్థాన)/g,
  /(\d{1,2})\s*(?:वें|वाँ|वां|वे)?\s*(?:भाव|घर)/g,
];
const YOGA_WORDS: [string, RegExp][] = [
  ["gajakesari", /gaja\s*-?kesari|గజకేసరి|गजकेसरी/i],
  ["budha_aditya", /budha\s*-?aditya|బుధాదిత్య|बुधादित्य/i],
  ["chandra_mangala", /chandra\s*-?mangala|చంద్రమంగళ|चंद्र\s*-?मंगल/i],
  ["ruchaka", /\bruchaka\b|రుచక|रुचक/i],
  ["bhadra", /\bbhadra yoga\b|భద్ర యోగ|भद्र योग/i],
  ["hamsa", /\bhamsa\b|హంస యోగ|हंस योग/i],
  ["malavya", /\bmalavya\b|మాలవ్య|मालव्य/i],
  ["sasa", /\bsasa\b|\bshasha\b|శశ యోగ|शश योग/i],
  ["raja", /\braja\s*yoga\b|\braj\s*yoga\b|రాజయోగ|రాజ యోగ|राजयोग|राज योग/i],
  ["yogakaraka", /yoga\s*-?karaka|యోగకారక|योगकारक/i],
  ["parivartana", /parivartana|exchange of signs|పరివర్తన|परिवर्तन योग/i],
  ["kemadruma", /kemadruma|కేమద్రుమ|केमद्रुम/i],
];
const DIGNITY_WORDS: [string, RegExp][] = [
  ["exalted", /\bexalted\b|\bexaltation\b|ఉచ్ఛ|उच्च/i],
  ["debilitated", /\bdebilitat\w*|నీచ|नीच/i],
  ["own", /\bown sign\b|స్వక్షేత్ర|स्वराशि/i],
  ["combust", /\bcombust\w*|అస్తంగత|अस्त ग्रह|अस्त है/i],
  ["retrograde", /\bretrograde\b|వక్ర|वक्री/i],
];

/** Chart claims in a text and the ones no cited evidence backs (graha:x, house:n, yoga:y, dignity:d). */
export function checkClaims(text: string, cited: string[], f: V2Facts, allowedGrahas: string[] = []): { claims: number; unsupported: string[] } {
  const ev = (f.chart?.evidence ?? []).filter((e) => cited.includes(e.id));
  const gr = new Set<string>([...ev.flatMap((e) => e.grahas as string[]), ...allowedGrahas]);
  const hs = new Set(ev.flatMap((e) => e.houses));
  const ys = new Set(ev.map((e) => e.yoga).filter(Boolean) as string[]);
  const refs = ev.map((e) => e.ref.toLowerCase()).join(" | ");
  const out: string[] = [];
  let claims = 0;
  for (const [g, re] of Object.entries(GRAHA_WORDS)) {
    if (!re.test(text)) continue;
    // "Moon sign" / birth star talk is natal basics, not a chart claim.
    if (g === "Moon" && /moon sign|చంద్ర రాశి|चंद्र राशि|janma rashi/i.test(text) && !/moon (in|with|sits|aspect)/i.test(text)) continue;
    claims++;
    if (!gr.has(g)) out.push(`graha:${g}`);
  }
  for (const re of HOUSE_RE) {
    for (const m of text.matchAll(re)) {
      const n = ORDINAL[m[1].toLowerCase()] ?? Number(m[1]);
      if (!(n >= 1 && n <= 12)) continue;
      claims++;
      if (!hs.has(n)) out.push(`house:${n}`);
    }
  }
  for (const [y, re] of YOGA_WORDS) {
    if (!re.test(text)) continue;
    claims++;
    if (!ys.has(y)) out.push(`yoga:${y}`);
  }
  for (const [d, re] of DIGNITY_WORDS) {
    if (!re.test(text)) continue;
    claims++;
    if (!refs.includes(d === "own" ? ", own" : d)) out.push(`dignity:${d}`);
  }
  if (/\b(lagna|ascendant|rising sign)\b|లగ్న|लग्न/i.test(text)) {
    claims++;
    if (f.chart?.ref !== "lagna") out.push("lagna:unknown_time");
  }
  return { claims, unsupported: [...new Set(out)] };
}

// ---------------------------------------------------------------- engine chapter card (not yet written)

const CAP = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export function engineChapterCopy(cf: V2ChapterFact, locale: ReadingLocale): { title: string; highlight: string; body: string } {
  const brings = cf.ad_theme?.support?.[0] ?? cf.support?.[0] ?? "";
  const asks = cf.ad_theme?.pressure?.[0] ?? cf.pressure?.[0] ?? "";
  if (locale !== "en") {
    // te/hi: the engine phrases are English; show the period label only (the app localizes lord names).
    return { title: cf.period, highlight: "", body: "" };
  }
  return {
    title: CAP(brings || cf.period).slice(0, 36),
    highlight: [brings && `Brings ${brings}`, asks && `asks for care with ${asks}`].filter(Boolean).join("; ") + ".",
    body: "",
  };
}
