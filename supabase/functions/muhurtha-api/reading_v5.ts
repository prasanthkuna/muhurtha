/**
 * Reading v5: one story across screens.
 *
 * Same progressive v4 pipeline (evidence pack, context compiler, claim validator), with:
 *  - Life as a story: each mahadasha is an arc with a one-line theme; each sub-period is a beat
 *    with its own life areas (from its lords' houses, not one person-level list), framed by the
 *    life stage for those ages. Past chapters describe what the chart suggests for that age,
 *    never assert events. Current and future chapters carry one plain action.
 *  - A plain-language "why" on profile, areas and chapters; the chart detail stays in evidence.
 *  - Day cards written to the engine's one day verdict (calendar.ts scoreDay).
 *  - All chapters written up front (B around now, then L batches in the background).
 *  - A clean prompt: no legacy weekday rules, no lord-chain mandate, one rule per job.
 */
import type { ChartFacts } from "./reading_v4.ts";
import type { ReadingLocale, V2ChapterFact, V2Content, V2Facts } from "./reading_v2.ts";

/** Rollout switch, per locale. env READING_V5 wins: "0" off, "1" all locales, or a list
 * ("en,hi"). Otherwise the default: on for en and hi (both passed the eval gate); Telugu stays
 * on v4 until its script-drift rate passes the gate. */
export const READING_V5_DEFAULT_LOCALES: readonly string[] = ["en", "hi"];
export function readingV5Enabled(locale?: string): boolean {
  const env = (Deno.env.get("READING_V5") ?? "").trim().toLowerCase();
  if (env === "0" || env === "false") return false;
  if (env === "1" || env === "true" || env === "all") return true;
  const list = env ? env.split(",").map((x) => x.trim()) : [...READING_V5_DEFAULT_LOCALES];
  return locale ? list.includes(locale) : list.length > 0;
}
export const isV5 = (f: Pick<V2Facts, "facts_version" | "chart">) => f.facts_version === 5 && Boolean(f.chart);

export const V5_LIMITS = {
  why: 170,
  action: 140,
  arcLine: 180,
  lifeStory: 320,
  chapterTitle: 40,
  beat: 140,
  /** Body budget by tense: the current chapter gets room; past ones stay short. */
  body: { past: 420, current: 900, future: 520 },
} as const;

// ---------------------------------------------------------------- life stage

export type StageKey =
  | "early_childhood" | "childhood" | "teens" | "college" | "twenties" | "thirties" | "forties" | "fifties" | "sixties" | "later";

export function stageKey(ageFrom: number | null | undefined, ageTo: number | null | undefined): StageKey | null {
  if (ageFrom == null && ageTo == null) return null;
  const a = ageFrom ?? ageTo ?? 0;
  const b = ageTo ?? a;
  const mid = (a + b) / 2;
  if (mid < 5) return "early_childhood";
  if (mid < 12) return "childhood";
  if (mid < 17.5) return "teens";
  if (mid < 22.5) return "college";
  if (mid < 30) return "twenties";
  if (mid < 40) return "thirties";
  if (mid < 50) return "forties";
  if (mid < 60) return "fifties";
  if (mid < 70) return "sixties";
  return "later";
}

/** What people that age are usually dealing with: the frame a chapter is written in (English facts). */
const STAGE_FRAME: Record<StageKey, string> = {
  early_childhood: "early childhood: home, parents, first habits",
  childhood: "school years: learning, friends, family rhythm",
  teens: "teenage school years: exams, identity, first independence",
  college: "college and first steps into adult life: study choices, first work",
  twenties: "twenties: early career, income, friendships, partnership questions",
  thirties: "thirties: building years: career footing, family, savings, health routines",
  forties: "forties: peak responsibility at work and home",
  fifties: "fifties: seniority, children growing up, health and security",
  sixties: "sixties: elder years: guidance, family, health, slowing down",
  later: "later life: health, family ties, meaning and rest",
};
export const STAGE_LABEL: Record<ReadingLocale, Record<StageKey, string>> = {
  en: {
    early_childhood: "Early childhood", childhood: "School years", teens: "Teen years", college: "College years",
    twenties: "Twenties", thirties: "Thirties", forties: "Forties", fifties: "Fifties", sixties: "Sixties", later: "Later years",
  },
  te: {
    early_childhood: "చిన్నతనం", childhood: "స్కూల్ రోజులు", teens: "టీనేజ్", college: "కాలేజీ రోజులు",
    twenties: "ఇరవైల్లో", thirties: "ముప్పైల్లో", forties: "నలభైల్లో", fifties: "యాభైల్లో", sixties: "అరవైల్లో", later: "తర్వాతి ఏళ్లు",
  },
  hi: {
    early_childhood: "बचपन", childhood: "स्कूल के दिन", teens: "किशोर उम्र", college: "कॉलेज के दिन",
    twenties: "बीस की उम्र", thirties: "तीस की उम्र", forties: "चालीस की उम्र", fifties: "पचास की उम्र", sixties: "साठ की उम्र", later: "आगे के साल",
  },
};
export function lifeStageFrame(ageFrom: number | null | undefined, ageTo: number | null | undefined): string | undefined {
  const k = stageKey(ageFrom, ageTo);
  return k ? STAGE_FRAME[k] : undefined;
}

// ---------------------------------------------------------------- per-chapter life areas

/** House -> plain life-area key (the PWA localizes the key). */
export const HOUSE_AREA: Record<number, string> = {
  1: "self", 2: "family_money", 3: "effort", 4: "home", 5: "studies_children", 6: "daily_work",
  7: "partner", 8: "change", 9: "teachers_fortune", 10: "career", 11: "gains_friends", 12: "expenses_abroad",
};
export const AREA_WORDS_EN: Record<string, string> = {
  self: "yourself and health", family_money: "family and savings", effort: "effort, siblings and skills", home: "home, mother and property",
  studies_children: "studies, creativity and children", daily_work: "daily work, health habits and rivals", partner: "partner and close ties",
  change: "sudden change and shared money", teachers_fortune: "teachers, fortune and higher learning", career: "career and standing",
  gains_friends: "income, gains and friends", expenses_abroad: "expenses, distant places and rest",
};

/** A sub-period's own areas: the ad lord's house and the houses it rules, then the md lord's house. */
export function chapterAreas(chart: ChartFacts | undefined, md: string, ad: string, n = 3): string[] {
  if (!chart) return [];
  const byId = new Map(chart.evidence.map((e) => [e.id, e]));
  const out: string[] = [];
  const add = (h: number | undefined) => {
    const k = h ? HOUSE_AREA[h] : undefined;
    if (k && !out.includes(k)) out.push(k);
  };
  const p = (g: string) => byId.get(`p:${(g ?? "").toLowerCase()}`);
  const adP = p(ad);
  if (adP) for (const h of adP.houses) add(h);
  const mdP = p(md);
  if (mdP) add(mdP.houses[0]);
  return out.slice(0, n);
}

/** Attach life stage, per-chapter areas and arc to each chapter fact. */
export function enrichChapters(chapters: V2ChapterFact[], chart: ChartFacts | undefined): V2ChapterFact[] {
  return chapters.map((c) => {
    const areas = c.kind === "summary" ? [] : chapterAreas(chart, c.md, c.ad);
    return {
      ...c,
      life_stage: lifeStageFrame(c.age_from, c.age_to) ?? "",
      ...(areas.length ? { chapter_domains: areas } : {}),
      arc_md: c.early ? "early" : c.md,
    };
  });
}

export type Arc = { md: string; from: number | null; to: number | null; tense: V2ChapterFact["tense"]; chapter_ids: number[] };

/** Mahadasha arcs in order (summary rows and detail rows grouped by md lord; childhood rows = "early"). */
export function arcsOf(chapters: V2ChapterFact[]): Arc[] {
  const out: Arc[] = [];
  for (const c of chapters) {
    const key = c.early ? "early" : c.md;
    const last = out[out.length - 1];
    if (last && last.md === key) {
      last.chapter_ids.push(c.chapter_id);
      last.to = c.age_to ?? last.to;
      if (c.tense === "current") last.tense = "current";
      else if (last.tense === "past" && c.tense === "future") last.tense = "current";
    } else out.push({ md: key, from: c.age_from ?? null, to: c.age_to ?? null, tense: c.tense, chapter_ids: [c.chapter_id] });
  }
  return out;
}

// ---------------------------------------------------------------- prompt

const CAUSAL: Record<ReadingLocale, string> = {
  en: "because / so / which means",
  te: "కాబట్టి / అందుకే / కావడంతో",
  hi: "क्योंकि / इसलिए / की वजह से",
};

/** The v5 system prompt rules (replace rules 1-11 of v2/v4: one rule per job, no legacy weekday rules). */
export function v5Rules(f: V2Facts, openersLine: string, banned: string[]): string[] {
  const exact = f.chart?.ref === "lagna";
  const child = f.is_child;
  const te = f.locale === "te";
  const hi = f.locale === "hi";
  return [
    "Rules:",
    "G1. The engine owns every fact: dates, times, ages, periods, planets, houses and the day verdict come from FACTS/EVIDENCE. Never write clock times. Years and ages only in chapters, and only as given.",
    "G2. EVIDENCE is the only source of chart claims. Never state a graha's sign or house, a house lord, a yoga, a dignity, an aspect or a transit that is not in an EVIDENCE item you list in evidence_ids. Never invent a yoga.",
    exact
      ? "G3. Houses are counted from the Lagna. Say houses as life areas ('your house of career'), rarely as numbers."
      : "G3. The birth time is not exact: houses are counted from the Moon sign. Never mention a Lagna/ascendant; say 'from your Moon sign' when it matters.",
    "G4. Plain words first. Every Sanskrit or astrology term (nakshatra, tithi, dasha, yoga names) appears at most once per item and is explained in the same sentence. No chains like 'X lord in Y links A with B' or 'connects your house of A with B': say what it means for the person.",
    `G5. Every 'why' field is ONE plain sentence a friend would say, naming at most one chart fact, and giving the reason with ${CAUSAL[f.locale]}.`,
    child
      ? "G6. This is a child's chart: speak to the parent about the child. No career, money, romance or marriage. No fear, no medical claims, never suggest delaying care."
      : "G6. No fear, no guaranteed outcomes, no medical, legal or financial certainty. Remedies are simple habits, prayers or kindness, never purchases or gemstones.",
    "G7. A personal reading, not a work ticket: no corporate or tech jargon, never assume a profession. Every text ends on a complete sentence; respect max lengths by writing less, never by cutting off.",
    `G8. Never use: ${banned.map((p) => `"${p}"`).join(", ")}. Emoji only in push and share_line (max one).`,
    "A1. profile: who this person is, built on story.themes and the cited evidence, not on the birth-star personality alone. summary = 3 short sentences in everyday words; why = the single chart fact behind the summary. strengths/watchouts = 3 short phrases each (2-5 words), no sentences.",
    "A2. areas: each area for the CURRENT chapter, on its own evidence (at least two areas rest on a different evidence item than the profile). headline = the plain verdict; summary = 2 sentences with one concrete thing to do; why = the chart fact in one plain sentence.",
    "L1. Life is one story: each mahadasha is an arc and its sub-periods are beats inside it. arcs[].line = that whole stretch's theme in one sentence for that time of life. life_story = 2 short sentences: where the story has been and what this stretch is building toward (no events).",
    "L2. Every detail chapter is written for its life_stage (the ages given): say what that stage of life usually holds and what this sub-period adds to it, using the chapter's chapter_domains, brings and asks. Put the age frame first ('In your late teens …', 'At thirty-two …').",
    "L3. Past chapters describe what the chart suggests that stretch favoured or tested for someone that age ('this stretch favoured…', 'the chart points to…'). Never state an event as fact (no 'you got married/moved/were promoted'), and never guess ('you may have', 'perhaps you'). 2-3 sentences.",
    "L4. Current chapter: 4-6 sentences: what this stretch builds, what it costs, and what comes next and when (the next chapter's period). Future chapters: 2-3 sentences on what to prepare for.",
    "L5. highlight = the beat: one short sentence (max 14 words) a person could repeat. why = one plain sentence naming the sub-period lord's role for this person from EVIDENCE. action = for current and future detail chapters ONE concrete thing to do in that stretch (a verb first); empty \"\" for past and summary chapters.",
    "L6. Titles: 2-4 words, concrete to the chapter's areas, no planet names, unique, and no two chapters share a first word or main noun. Summary chapters (kind=summary) get title, highlight and share_line only; body, why and action are \"\".",
    "L7. No two chapters may open with the same three words; vary how each opens (age frame, the area, a contrast, the person).",
    "D1. Day cards follow the engine's verdict for that date (verdict.tone, verdict.favours, verdict.avoid). line = the verdict in one sentence; on a rest day it says to keep the day light, in different words each rest day; on a mixed day never suggest starting something big unless favours has new_starts; never recommend what verdict.avoid names.",
    "D2. Write the day ABOUT angle.area, suggest angle.action, in angle.tone, opening the way angle.opener says (" + openersLine + "). The reason comes from angle.lead: star -> MEANINGS.stars, tithi -> MEANINGS.tithis, tara -> MEANINGS.taras, yoga -> MEANINGS.yogas; say it in fresh everyday words (" + CAUSAL[f.locale] + "), name the lead fact once mid-sentence, never as a stock line ('<star> is a … star', 'today's star is …'" + (te ? ", 'ఈరోజు నక్షత్రం …'" : hi ? ", 'आज का नक्षत्र …'" : "") + ").",
    "D3. title, line, body, do/avoid and the slot note each take a different job: line = verdict; body = the why + one concrete example; do/avoid = two other actions; the note = what the best window suits. Never repeat a task across them. Titles 2-5 words, fresh each day. Mention the natal trait only when angle.trait_ok is true.",
    "D4. window_notes: exactly ONE note, for the window whose writer is \"llm\" (the verdict's best window). Never write times; never start with 'Use this slot', 'A good slot', 'Good for' or 'This slot'.",
    "D5. Name the tithi or star by its own name once; never use frames like 'the lunar day for', 'the mixed/supportive/rest day favours' or 'this day\'s verdict' (the tone is shown by the app, do not label it). Words like 'gentle', 'simple', 'steady', 'quiet', 'small step' at most once per five days; never reuse a sentence frame more than twice in the reading.",
    "P1. weeks/months: talk about the stretch itself using best_days and light_days (weekday + star), never dates; do not restate the chapter theme or day tasks. ask_starters: 4 questions this person would actually ask, tied to the current chapter and the coming weeks. push lines: short, no times.",
  ];
}

/** Per-part language line (stronger than the global one: parts are written separately). */
export const V5_LANGUAGE_LINE: Record<ReadingLocale, string> = {
  en: "Language: English, plain and warm.",
  te: "Language: Telugu (తెలుగు script) in every text field: casual but respectful, the way a caring elder talks (మీరు, not నువ్వు); everyday words, English only where Telugu speech uses it (career, office, plan), never whole English sentences. Only Telugu letters: never Tamil, Kannada or Malayalam letters or words.",
  hi: "Language: natural Hindi (देवनागरी) in every text field: warm and respectful (आप), everyday spoken Hindi rather than Sanskrit-heavy words; English only where Hindi speech uses it, never whole English sentences.",
};

// ---------------------------------------------------------------- validator (v5 flags)

const LORD_CHAIN: Record<ReadingLocale, RegExp> = {
  en: /\b(links?|linking|connects?|connecting|ties|tying|joins?)\b[^.]{0,60}\b(with|to|and)\b[^.]{0,40}\b(house|lord)s?\b|\blord of (the )?\d+(st|nd|rd|th)\b|\b\d+(st|nd|rd|th)[- ]lord\b|\blord in (the|your) \d+(st|nd|rd|th)\b/i,
  te: /అధిపతి[^.]{0,40}(కలుపు|లింక్)|\d+వ భావాధిపతి|భావాన్ని[^.]{0,30}భావంతో/,
  hi: /स्वामी[^।]{0,40}जोड़|\d+वें भाव का स्वामी|भाव को[^।]{0,30}भाव से जोड़/,
};
const PAST_ASSERT: Record<ReadingLocale, RegExp> = {
  en: /\byou (got|were|became) (married|engaged|promoted|fired|divorced|pregnant)\b|\byou (moved|lost|met|bought|changed jobs|left home)\b/i,
  te: /(పెళ్లి అయింది|పెళ్లి చేసుకున్నారు|ఉద్యోగం మారారు|ప్రమోషన్ వచ్చింది|ఇల్లు మారారు)/,
  hi: /(शादी हुई|शादी की|नौकरी बदली|प्रमोशन मिला|घर बदला)/,
};
const PAST_HEDGE: Record<ReadingLocale, RegExp> = {
  en: /\b(may|might|could) have (been|felt|had|seen|found|faced)\b|\bperhaps you\b|\bprobably you\b/i,
  te: /(అయి ఉండొచ్చు|జరిగి ఉండొచ్చు|ఏమో)/,
  hi: /(हुआ होगा|रहा होगा|शायद आप)/,
};
const STAGE_WORDS: Record<ReadingLocale, RegExp> = {
  en: /\b(teen\w*|twent\w+|thirt\w+|fort\w+|fift\w+|sixt\w+|sevent\w+|school\w*|college|childhood|child|kid|career|mid-?\d0s|\d0s|age|aged|years old|young|youth|adult\w*|elder\w*|retire\w*|later (life|years)|senior|grandparent\w*|eight\w+|nine\w+|mid-?life|middle years|grown|\d{1,2})\b/i,
  te: /(వయసు|ఏళ్ల|ఏళ్లు|బాల్య|చిన్నతన|చిన్నప్పు|స్కూల్|కాలేజ|టీనేజ్|యవ్వన|ఇరవై|ముప్పై|నలభై|యాభై|అరవై|డెబ్బై|ఎనభై|తొంభై|వృద్ధాప్య|పెద్ద వయసు|తర్వాతి ఏళ్ల|మలి వయసు|పెద్దయ్యా|కెరీర్|\d{1,2})/,
  hi: /(उम्र|साल|बचपन|स्कूल|कॉलेज|किशोर|जवानी|युवा|बीस|तीस|चालीस|पचास|साठ|सत्तर|अस्सी|नब्बे|बुढ़ाप|वृद्धावस्था|बाद के वर्ष|बाद के साल|ढलती उम्र|करियर|\d{1,2})/,
};
const START_WORDS: Record<ReadingLocale, RegExp> = {
  en: /\b(start|begin|launch|sign|kick off)\w*/i,
  te: /(ప్రారంభ|మొదలుపెట్ట|స్టార్ట్|సంతకం)/,
  hi: /(शुरू|शुरुआत|आरंभ|हस्ताक्षर|लॉन्च)/,
};
const NEGATION: Record<ReadingLocale, RegExp> = {
  en: /\b(not|no|don't|avoid|skip|hold off|wait|later|instead|finish|already)\b/i,
  te: /(వద్దు|కాదు|ఆపండి|తర్వాత|బదులు|కండి|మానుకోండి|మానండి|పూర్తి|ఆగండి|వాయిదా|కాకుండా)/,
  hi: /(नहीं|न करें|ना|मत|टालें|टाल|बाद में|बजाय|रुकें|पूरा|पूरी)/,
};
const SCRIPT_RE: Record<"te" | "hi", RegExp> = { te: /[\u0C00-\u0C7F]/g, hi: /[\u0900-\u097F]/g };
const ALIEN_RE: Record<"te" | "hi", RegExp> = { te: /[\u0B80-\u0BFF\u0C80-\u0CFF\u0D00-\u0D7F]/, hi: /[\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF]/ };

const PAIR_STEM: Record<ReadingLocale, Record<string, string>> = {
  en: { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
  te: { Sun: "సూర్య", Moon: "చంద్ర", Mars: "కుజ", Mercury: "బుధ", Jupiter: "గురు", Venus: "శుక్ర", Saturn: "శని", Rahu: "రాహు", Ketu: "కేతు" },
  hi: { Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" },
};
const PAIR_ALT: Record<string, string> = {
  Sun: "Sun|surya|సూర్య(?:ుడు)?|सूर्य", Moon: "Moon|chandra|చంద్ర(?:ుడు)?|चंद्र|चन्द्र", Mars: "Mars|mangal|kuja|కుజ(?:ుడు)?|మంగళ|मंगल",
  Mercury: "Mercury|budha|బుధ(?:ుడు)?|बुध", Jupiter: "Jupiter|guru|బృహస్పతి|గురు(?:వు)?|बृहस्पति|गुरु", Venus: "Venus|shukra|శుక్ర(?:ుడు)?|शुक्र",
  Saturn: "Saturn|shani|శని|शनि", Rahu: "Rahu|రాహు(?:వు)?|राहु", Ketu: "Ketu|కేతు(?:వు)?|केतु",
};
const PAIR_ANY = Object.values(PAIR_ALT).join("|");
const PAIR_RE = new RegExp(`(${PAIR_ANY})(\\s*[–—-]\\s*)(${PAIR_ANY})`, "gi");
const grahaOf = (w: string) => Object.entries(PAIR_ALT).find(([, alt]) => new RegExp(`^(?:${alt})$`, "i").test(w))?.[0] ?? null;
/** A chapter that names its own or a neighbouring period as "X–Y" must use the engine's lords:
 * when only the first lord is wrong (seen: "Jupiter–Saturn" for a Venus–Saturn period), it is
 * corrected to the period whose sub-lord matches; anything else is left for the validator. */
export function fixLordPairs(text: string, valid: [string, string][], locale: ReadingLocale): string {
  if (!text || !valid.length) return text;
  return text.replace(PAIR_RE, (m, a: string, dash: string, b: string) => {
    const ga = grahaOf(a), gb = grahaOf(b);
    if (!ga || !gb || valid.some(([x, y]) => x === ga && y === gb)) return m;
    const fix = valid.find(([, y]) => y === gb);
    return fix ? `${PAIR_STEM[locale][fix[0]] ?? a}${dash}${b}` : m;
  });
}

/** Telugu/Hindi copy with stray Tamil/Kannada/Malayalam/Bengali letters (model script drift):
 * drop the drifted sentences so a user never sees another script. "" when nothing clean is left. */
export function stripAlien(text: string, locale: ReadingLocale): string {
  if (locale === "en" || !text || !ALIEN_RE[locale as "te" | "hi"].test(text)) return text;
  const re = ALIEN_RE[locale as "te" | "hi"];
  return text.split(/(?<=[.!?।])\s+/).filter((x) => !re.test(x)).join(" ").trim();
}
export function hasAlien(text: string, locale: ReadingLocale): boolean {
  return locale !== "en" && Boolean(text) && ALIEN_RE[locale as "te" | "hi"].test(text);
}

/** True when text ends mid-sentence (cut off) rather than on terminal punctuation. */
export function looksTruncated(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return /…$|\.\.\.$/.test(t) || !/[.!?।॥"')\]]$/.test(t);
}
export function wrongScript(text: string, locale: ReadingLocale): boolean {
  if (locale === "en" || !text.trim()) return false;
  const l = locale as "te" | "hi";
  if (ALIEN_RE[l].test(text)) return true;
  const native = (text.match(SCRIPT_RE[l]) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return native + latin > 20 && native / (native + latin) < 0.6;
}
const opener3 = (t: string) => (t ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 3).join(" ");

export type V5Flag = { section: "chapters" | "days" | "areas" | "profile"; id: string | number; reason: string };

export function v5Flags(c: Partial<V2Content>, f: V2Facts): V5Flag[] {
  const L = f.locale;
  const out: V5Flag[] = [];
  const chFact = new Map(f.chapters.map((x) => [x.chapter_id, x]));
  const openSeen = new Map<string, number>();
  for (const ch of c.chapters ?? []) {
    const id = Number(ch.chapter_id);
    const fx = chFact.get(id);
    if (!fx) continue;
    const text = [ch.highlight, ch.body, ch.why].filter(Boolean).join(" ");
    if (LORD_CHAIN[L].test(text)) out.push({ section: "chapters", id, reason: "lord_chain" });
    if (wrongScript(text, L)) out.push({ section: "chapters", id, reason: "wrong_script" });
    if (fx.kind === "summary") continue;
    if (ch.body && looksTruncated(ch.body)) out.push({ section: "chapters", id, reason: "truncated" });
    const op = opener3(ch.body);
    if (op) {
      openSeen.set(op, (openSeen.get(op) ?? 0) + 1);
      if ((openSeen.get(op) ?? 0) > 1) out.push({ section: "chapters", id, reason: "opener_repeat" });
    }
    if (fx.life_stage && ch.body && !STAGE_WORDS[L].test(`${ch.highlight} ${ch.body}`)) out.push({ section: "chapters", id, reason: "stage_missing" });
    if (fx.tense === "past") {
      if (PAST_ASSERT[L].test(text)) out.push({ section: "chapters", id, reason: "past_asserted" });
      if (PAST_HEDGE[L].test(text)) out.push({ section: "chapters", id, reason: "past_hedge" });
    } else if (!String(ch.action ?? "").trim()) out.push({ section: "chapters", id, reason: "action_missing" });
    if (!String(ch.why ?? "").trim()) out.push({ section: "chapters", id, reason: "why_missing" });
  }
  for (const a of c.areas ?? []) {
    const text = `${a.headline} ${a.summary} ${a.why ?? ""}`;
    if (LORD_CHAIN[L].test(text)) out.push({ section: "areas", id: a.area_id, reason: "lord_chain" });
    if (!String(a.why ?? "").trim()) out.push({ section: "areas", id: a.area_id, reason: "why_missing" });
    if (a.summary && looksTruncated(a.summary)) out.push({ section: "areas", id: a.area_id, reason: "truncated" });
  }
  const dayFact = new Map(f.days.map((d) => [d.date, d]));
  for (const d of c.days ?? []) {
    const v = dayFact.get(d.date)?.verdict;
    if (!v) continue;
    if (v.tone !== "supportive" && !v.favours.includes("new_starts")) {
      const bad = [d.line, ...(d.do ?? [])].some((t) => t && START_WORDS[L].test(t) && !NEGATION[L].test(t));
      if (bad) out.push({ section: "days", id: d.date, reason: "verdict_mismatch" });
    }
    if (d.body && looksTruncated(d.body)) out.push({ section: "days", id: d.date, reason: "truncated" });
  }
  return out;
}

/** Sentence-safe trim: whole sentences that fit; a word cut with an ellipsis only if no sentence fits. */
export function clipSentences(s: unknown, max: number): string {
  const t = typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
  if (t.length <= max) return t;
  const parts = t.match(/[^.!?।]+[.!?।]+["')\]]*\s*/g) ?? [];
  let out = "";
  for (const p of parts) {
    if ((out + p).trim().length > max) break;
    out += p;
  }
  out = out.trim();
  if (out.length >= Math.min(60, max * 0.3)) return out;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim().replace(/[,;:–-]+$/, "") + "…";
}
