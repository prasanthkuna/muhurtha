/**
 * Ask grounding (no LLM): the engine's day verdict, the month's best/light dates and the
 * current chapter, as (1) extra CHART CARD context, (2) source chips, and (3) a fallback
 * answer that answers the question actually asked when the model is down or busy.
 */
import type { V2Facts } from "./reading_v2.ts";
import { localizeGrahaNames } from "./planner.ts";

export type AskLocale = "en" | "te" | "hi";
export type AskTopic = "today" | "which_day" | "week" | "month" | "money" | "work" | "love" | "family" | "health" | "travel" | "life" | "general";
export type AskSource = "today" | "calendar" | "life" | "decode";

const WD: Record<AskLocale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  te: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};
const MON: Record<AskLocale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  te: ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జులై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};
/** "Thu 19 Nov" / "గురు 19 నవంబర్" / "गुरु 19 नवंबर" from an ISO date. */
export function dayLabel(iso: string, l: AskLocale): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WD[l][wd]} ${d} ${MON[l][m - 1]}`;
}
export function monthLabel(iso: string | null | undefined, l: AskLocale): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  return m ? `${MON[l][Number(m[2]) - 1]} ${m[1]}` : "";
}
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const TOPIC_RE: [AskTopic, RegExp][] = [
  ["life", /\bchapter|period|dasha|phase|future|life\b|దశ|జీవిత|భవిష్యత్|दशा|ज़िंदगी|जीवन|भविष्य|साल/i],
  ["month", /\b(this|next) month\b|\bmonth\b|నెల|महीने|महीना/i],
  ["week", /\b(this|next) week\b|\bweek\b|వారం|हफ़्ते|हफ्ते|सप्ताह/i],
  ["which_day", /\bwhich day\b|\bwhat day\b|\bbest day\b|\bwhen (should|can|is)\b|\bgood day\b|ఏ రోజు|ఎప్పుడు|कौन सा दिन|किस दिन|कब/i],
  ["today", /\btoday\b|\btonight\b|\bnow\b|ఈరోజు|ఇప్పుడు|आज|अभी/i],
  ["money", /\bmoney|invest|loan|salary|buy|purchase|savings?\b|డబ్బు|పెట్టుబడి|కొన|पैसा|पैसे|निवेश|खरीद/i],
  ["work", /\bjob|work|career|interview|boss|office|promotion|business\b|ఉద్యోగ|కెరీర్|ఆఫీస్|ఇంటర్వ్యూ|नौकरी|काम|करियर|इंटरव्यू|व्यापार/i],
  ["love", /\blove|partner|marriage|wife|husband|relationship|date\b|ప్రేమ|పెళ్లి|భార్య|భర్త|प्यार|शादी|पत्नी|पति|रिश्ते/i],
  ["family", /\bfamily|mother|father|parents|kids|children|son|daughter\b|కుటుంబ|అమ్మ|నాన్న|పిల్ల|परिवार|माँ|पिता|बच्च/i],
  ["health", /\bhealth|sleep|diet|exercise|gym|tired|stress\b|ఆరోగ్య|నిద్ర|ఒత్తిడి|सेहत|स्वास्थ्य|नींद|तनाव/i],
  ["travel", /\btravel|trip|journey|move|relocat\w*\b|ప్రయాణ|ట్రిప్|यात्रा|सफ़र/i],
];
export function askTopic(q: string): AskTopic {
  for (const [k, re] of TOPIC_RE) if (re.test(q)) return k;
  return "general";
}
/** The life area a question is about (money, work…), even when its topic is a time span. */
function askArea(q: string): string | undefined {
  for (const [k, re] of TOPIC_RE) if (AREA_OF[k] && re.test(q)) return AREA_OF[k];
  return undefined;
}
const AREA_OF: Partial<Record<AskTopic, string>> = { money: "money", work: "new_starts", love: "love", family: "talks", health: "health", travel: "travel" };

/** Which screens an answer draws on (shown as "From: …" chips). */
export function askSources(topic: AskTopic, intent: string): AskSource[] {
  const s = new Set<AskSource>();
  if (topic === "today" || intent === "should_i") s.add("today");
  if (["which_day", "week", "month", "money", "work", "love", "family", "health", "travel"].includes(topic) || intent === "when_best") s.add("calendar");
  if (topic === "life" || topic === "month" || topic === "general" || intent === "why") s.add("life");
  if (intent === "concept" || intent === "feelings") s.add("decode");
  if (!s.size) s.add("today");
  return [...s].slice(0, 3);
}

type Day = V2Facts["days"][number];
const tone = (d: Day) => d.verdict?.tone ?? (d.day_tone === "careful" ? "rest" : d.day_tone);
/** Best and keep-light dates in a range, from the engine verdict (optionally for one area). */
export function bestDays(f: V2Facts | null, from: string, to: string, area?: string, n = 2): { best: string[]; light: string[] } {
  const days = (f?.days ?? []).filter((d) => d.date >= from && d.date <= to);
  const fav = (d: Day) => (area ? (d.verdict?.favours ?? d.calendar?.favours ?? []).includes(area) : true);
  const avoidArea = (d: Day) => area && (d.verdict?.avoid ?? d.calendar?.avoid) === area;
  const best = days.filter((d) => tone(d) === "supportive" && fav(d) && !avoidArea(d)).map((d) => d.date);
  const okay = days.filter((d) => tone(d) !== "rest" && fav(d) && !avoidArea(d) && !best.includes(d.date)).map((d) => d.date);
  return { best: [...best, ...okay].slice(0, n), light: days.filter((d) => tone(d) === "rest").map((d) => d.date).slice(0, n) };
}

const endOfMonth = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const plusDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

/** Extra CHART CARD block: today's verdict, the month's dates and the chapter's own areas. */
export function verdictCard(f: V2Facts | null, date: string, reading: { chapterWhy?: string; chapterAction?: string } | null) {
  if (!f) return null;
  const today = f.days.find((d) => d.date === date);
  const month = bestDays(f, date, endOfMonth(date), undefined, 3);
  const week = bestDays(f, date, plusDays(date, 6), undefined, 2);
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id);
  return {
    today_verdict: today?.verdict ? { tone: today.verdict.tone, favours: today.verdict.favours, avoid: today.verdict.avoid, best_window_kind: today.verdict.best_kind } : null,
    this_week: { best_days: week.best, keep_light: week.light },
    rest_of_month: { best_days: month.best, keep_light: month.light },
    ...(cur ? { chapter_areas: cur.chapter_domains ?? cur.domains, chapter_why: reading?.chapterWhy ?? null, chapter_action: reading?.chapterAction ?? null } : {}),
  };
}

const T = {
  en: {
    tone: { supportive: "Today is a good day for you", mixed: "Today is a mixed day: good for steady work, not for big starts", rest: "Today is a keep-light day: rest, review and routine" },
    best: (t: string) => `Your best time is ${t}.`,
    calm: (t: string) => `Your calmest time is ${t}.`,
    days: (xs: string) => `Your best days coming up: ${xs}.`,
    light: (xs: string) => `Keep ${xs} light.`,
    noDays: "No strong days in that stretch, so keep big moves for later and use the good windows each day.",
    chapter: (md: string, ad: string, until: string, hi: string) => `You're in your ${md}–${ad} chapter until ${until}${hi ? `: ${hi}` : "."}`,
    action: (a: string) => `This stretch: ${a}`,
    and: " and ",
  },
  te: {
    tone: { supportive: "ఈరోజు మీకు మంచి రోజు", mixed: "ఈరోజు మిక్స్‌డ్ డే: మొదలుపెట్టిన పని పూర్తి చేయడానికి బాగుంది, కొత్త పెద్ద పనులకు కాదు", rest: "ఈరోజు తేలిగ్గా ఉంచండి: విశ్రాంతి, రివ్యూ, రొటీన్ పనులు" },
    best: (t: string) => `మీ బెస్ట్ టైమ్ ${t}.`,
    calm: (t: string) => `మీకు ప్రశాంతమైన టైమ్ ${t}.`,
    days: (xs: string) => `రాబోయే మంచి రోజులు: ${xs}.`,
    light: (xs: string) => `${xs} తేలిగ్గా ఉంచండి.`,
    noDays: "ఈ రోజుల్లో బలమైన రోజులు లేవు, పెద్ద నిర్ణయాలు తర్వాతకు ఉంచి, ప్రతి రోజు మంచి టైమ్ వాడుకోండి.",
    chapter: (md: string, ad: string, until: string, hi: string) => `${until} వరకు మీరు ${md}–${ad} చాప్టర్‌లో ఉన్నారు${hi ? `: ${hi}` : "."}`,
    action: (a: string) => `ఈ దశలో: ${a}`,
    and: ", ",
  },
  hi: {
    tone: { supportive: "आज आपके लिए अच्छा दिन है", mixed: "आज मिला-जुला दिन है: शुरू किया काम पूरा करने के लिए ठीक, बड़ी शुरुआत के लिए नहीं", rest: "आज दिन हल्का रखें: आराम, समीक्षा और रोज़ के काम" },
    best: (t: string) => `आपका सबसे अच्छा समय ${t} है।`,
    calm: (t: string) => `आपका सबसे शांत समय ${t} है।`,
    days: (xs: string) => `आने वाले अच्छे दिन: ${xs}।`,
    light: (xs: string) => `${xs} को हल्का रखें।`,
    noDays: "इन दिनों में कोई मज़बूत दिन नहीं है, बड़े फ़ैसले बाद में रखें और हर दिन का अच्छा समय इस्तेमाल करें।",
    chapter: (md: string, ad: string, until: string, hi: string) => `${until} तक आप ${md}–${ad} अध्याय में हैं${hi ? `: ${hi}` : "।"}`,
    action: (a: string) => `इस दौर में: ${a}`,
    and: ", ",
  },
} as const;

/**
 * A plain answer to the question asked, from engine facts only (used when the model is
 * unavailable). Never a random template: today's verdict for "today", dates for "when",
 * the chapter for "life", and the chapter + today for anything else.
 */
export function groundedFallback(
  question: string,
  locale: AskLocale,
  f: V2Facts | null,
  date: string,
  reading: { chapterHighlight?: string; chapterAction?: string } | null,
): string | null {
  if (!f) return null;
  const t = T[locale];
  const topic = askTopic(question);
  const today = f.days.find((d) => d.date === date);
  const v = today?.verdict;
  const out: string[] = [];
  const todayLine = () => {
    if (!v) return;
    out.push(t.tone[v.tone] + (locale === "hi" ? "।" : "."));
    if (v.best) out.push((v.best_kind === "calm" ? t.calm : t.best)(`${clock(v.best.start)} – ${clock(v.best.end)}`));
  };
  const datesLine = (to: string, area?: string) => {
    const from = plusDays(date, topic === "today" ? 0 : 1);
    let r = bestDays(f, from, to, area, 2);
    if (area && !r.best.length) r = bestDays(f, from, to, undefined, 2);
    if (r.best.length) out.push(t.days(r.best.map((d) => dayLabel(d, locale)).join(t.and)));
    else out.push(t.noDays);
    if (r.light.length) out.push(t.light(r.light.map((d) => dayLabel(d, locale)).join(t.and)));
  };
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id);
  const chapterLine = () => {
    if (!cur) return;
    const md = localizeGrahaNames(cur.md, locale), ad = localizeGrahaNames(cur.ad || cur.md, locale);
    out.push(t.chapter(md, ad, monthLabel(cur.end_iso, locale), (reading?.chapterHighlight ?? "").trim()));
    if (reading?.chapterAction) out.push(t.action(reading.chapterAction));
  };
  if (topic === "today") todayLine();
  else if (topic === "which_day" || topic === "week") datesLine(plusDays(date, 7), askArea(question));
  else if (topic === "month") {
    datesLine(endOfMonth(date) > plusDays(date, 3) ? endOfMonth(date) : plusDays(date, 21), askArea(question));
    chapterLine();
  } else if (AREA_OF[topic]) {
    datesLine(plusDays(date, 14), AREA_OF[topic]);
    todayLine();
  } else if (topic === "life") chapterLine();
  else {
    chapterLine();
    todayLine();
  }
  return out.length ? out.join(" ") : null;
}

/** A deterministic "for you today" line for the Explain sheet (no LLM). */
export function personalExplain(term: string, f: V2Facts | null, date: string, locale: AskLocale): string | null {
  if (!f) return null;
  const d = f.days.find((x) => x.date === date);
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id);
  const L = {
    en: {
      tara: (t: string, ok: string) => `For you today: ${t} tara, ${ok}.`, good: "so effort lands well", bad: "so keep big moves for another day",
      star: (s: string, b: boolean) => b ? `Today's Moon is in ${s}, your own birth star: a sensitive day, keep it light.` : `Today's Moon is in ${s}. Your birth star is ${f.natal.nakshatra ?? "—"}.`,
      md: (md: string, until: string) => `You are in your ${md} mahadasha until ${until}.`,
      ad: (ad: string, until: string) => `Your sub-period is ${ad}, until ${until}.`,
    },
    te: {
      tara: (t: string, ok: string) => `ఈరోజు మీకు: ${t} తార, ${ok}.`, good: "కాబట్టి కష్టపడ్డ పనికి ఫలితం బాగుంటుంది", bad: "కాబట్టి పెద్ద పనులు వేరే రోజుకు ఉంచండి",
      star: (s: string, b: boolean) => b ? `ఈరోజు చంద్రుడు మీ జన్మ నక్షత్రం ${s}లో ఉన్నాడు: సున్నితమైన రోజు, తేలిగ్గా ఉంచండి.` : `ఈరోజు చంద్రుడు ${s}లో ఉన్నాడు. మీ జన్మ నక్షత్రం ${f.natal.nakshatra ?? "—"}.`,
      md: (md: string, until: string) => `${until} వరకు మీరు ${md} మహాదశలో ఉన్నారు.`,
      ad: (ad: string, until: string) => `మీ అంతర్దశ ${ad}, ${until} వరకు.`,
    },
    hi: {
      tara: (t: string, ok: string) => `आज आपके लिए: ${t} तारा, ${ok}।`, good: "इसलिए मेहनत का फल अच्छा मिलेगा", bad: "इसलिए बड़े काम किसी और दिन रखें",
      star: (s: string, b: boolean) => b ? `आज चंद्रमा आपके जन्म नक्षत्र ${s} में है: संवेदनशील दिन, हल्का रखें।` : `आज चंद्रमा ${s} में है। आपका जन्म नक्षत्र ${f.natal.nakshatra ?? "—"} है।`,
      md: (md: string, until: string) => `${until} तक आप ${md} महादशा में हैं।`,
      ad: (ad: string, until: string) => `आपकी अंतर्दशा ${ad} है, ${until} तक।`,
    },
  }[locale];
  const GOOD_TARA = new Set(["Sampat", "Kshema", "Sadhana", "Mitra", "Parama Mitra"]);
  if (term === "tara_bala" && d?.tara) return L.tara(d.tara, GOOD_TARA.has(d.tara) ? L.good : L.bad);
  if (term === "nakshatra" && d) return L.star(d.nakshatra, d.nakshatra === f.natal.nakshatra);
  if (term === "mahadasha" && cur) return L.md(localizeGrahaNames(cur.md, locale), monthLabel(f.chapters.filter((c) => c.md === cur.md).slice(-1)[0]?.end_iso, locale));
  if (term === "antardasha" && cur?.ad) return L.ad(localizeGrahaNames(cur.ad, locale), monthLabel(cur.end_iso, locale));
  return null;
}
