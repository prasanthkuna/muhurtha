/**
 * Live AI on gpt-6-luna: context builder, intent + safety classification, follow-up chips
 * (deterministic, from intent + screen, never a second model call), the streamed-answer
 * schema, an incremental JSON field reader and the pre-display stream guard.
 *
 * Grounding rule: dates, dashas, window ids and clock times come only from the engine. The
 * model picks ids/dates from enums; any prose sentence that names a date, month or year not
 * in the engine's allowed set, or a clock time, is withheld BEFORE the user sees it (never a
 * silent edit of text already on screen). Pure module (no Deno APIs beyond types).
 */
import { DATE_RULE, polishVoice, VOICE_BLOCK, type VoiceLocale } from "./voice.ts";
import type { V2Facts } from "./reading_v2.ts";
import { GLOSSARY, type GlossTerm } from "./glossary.ts";

export const LIVE_PROMPT_VERSION = "live-v1";
export type LiveLocale = VoiceLocale;
export type Screen = "decode" | "today" | "bond" | "calendar" | "timing" | "life" | "ask" | "other";
export type Intent = "should_i" | "when_best" | "why" | "concept" | "relationship" | "feelings" | "sensitive" | "other";
export type SensitiveCat = "job_quit" | "medical" | "pregnancy" | "gambling" | "legal" | "finance";

export function normalizeScreen(s: unknown): Screen {
  const v = String(s ?? "").toLowerCase();
  return (["decode", "today", "bond", "calendar", "timing", "life", "ask"] as const).includes(v as never) ? v as Screen : "other";
}

// ---------------------------------------------------------------- intent and safety

const SENSITIVE: [SensitiveCat, RegExp][] = [
  ["pregnancy", /pregnan|conceiv|\bivf\b|miscarriage|fertility|(have|having|try(ing)? for|plan(ning)?( for)?|start(ing)?) (a )?(baby|child|family)\b|baby plan|బేబీ ప్లాన్|పిల్లల(ని|ను)? (ప్లాన్|కనాల)|ప్రెగ్నెన్సీ|గర్భ|పిల్లలు పుడ|ఐవీఎఫ్|गर्भ|प्रेग्नेंसी|बच्चा होगा|बच्चे की (प्लानिंग|कोशिश)|बेबी प्लान|आईवीएफ/i],
  ["medical", /\b(medicine|medication|tablets?|surgery|operation|treatment|doctor|disease|cancer|bp|blood pressure|sugar|diabetes|therapy|depress\w*|hospital|chemo|illness|sick)\b|మందు|ఆపరేషన్|సర్జరీ|ట్రీట్‌మెంట్|డాక్టర్|హాస్పిటల్|జబ్బు|రోగం|షుగర్|బీపీ|दवा|दवाई|ऑपरेशन|सर्जरी|इलाज|डॉक्टर|अस्पताल|बीमारी|शुगर|बीपी/i],
  ["gambling", /\b(bet|betting|gambl\w*|lottery|casino|satta|rummy|dream11|teen patti|jackpot)\b|బెట్టింగ్|లాటరీ|జూదం|రమ్మీ|सट्टा|जुआ|लॉटरी|बेटिंग/i],
  ["legal", /\b(court|lawsuit|lawyer|legal|police|divorce|bail|fir|case hearing|litigation)\b|కోర్టు|కేసు|లాయర్|విడాకులు|పోలీస్|कोर्ट|वकील|तलाक|पुलिस|मुकदमा/i],
  ["finance", /\b(invest\w*|stocks?|shares?|crypto|bitcoin|loan|mortgage|property|trading|mutual funds?|ipo|buy (a |this |that |the )?(house|flat|land|plot|apartment|car))\b|పెట్టుబడి|స్టాక్|షేర్|క్రిప్టో|లోన్|ఇల్లు కొన|ప్లాట్|స్థలం|ట్రేడింగ్|निवेश|शेयर|स्टॉक|क्रिप्टो|लोन|प्रॉपर्टी|घर खरीद|ट्रेडिंग|प्लॉट/i],
  ["job_quit", /\b(quit|resign\w*|leave (my|the) job|switch jobs?|job switch|notice period|change (my )?job)\b|రాజీనామా|జాబ్ మానే|జాబ్ వదిలే|ఉద్యోగం మానే|జాబ్ స్విచ్|జాబ్ మార్చ|इस्तीफ़ा|इस्तीफा|नौकरी छोड़|जॉब छोड़|जॉब स्विच|नौकरी बदल/i],
];

const INTENT_RE: [Exclude<Intent, "sensitive" | "other">, RegExp][] = [
  ["concept", /\bwhat (is|are|does)\b|\bmeaning of\b|\bexplain\b|అంటే ఏమిటి|అంటే ఏంటి|అర్థం|అంటే ఏమి|क्या है|क्या होता|मतलब|समझाइए|समझाओ/i],
  ["when_best", /\bwhen\b|\bbest (day|time|date)\b|\bwhich day\b|ఎప్పుడు|ఏ రోజు|బెస్ట్ డే|మంచి రోజు|कब\b|कौन सा दिन|सबसे अच्छा दिन/i],
  ["should_i", /\bshould i\b|\bcan i\b|\bshall i\b|\bis it (ok|good|right)\b|చేయొచ్చా|చేయాలా|మంచిదా|ఓకేనా|करूँ|करूं|करना चाहिए|ठीक है क्या|ठीक रहेगा/i],
  ["relationship", /\b(partner|wife|husband|love|marriage|girlfriend|boyfriend|relationship|fight|spouse|in-laws)\b|పెళ్లి|భార్య|భర్త|లవ్|రిలేషన్|గొడవ|शादी|पत्नी|पति|प्यार|रिश्ता|झगड़ा/i],
  ["feelings", /\b(stuck|sad|anxious|stress\w*|tired|lonely|confused|worried|upset|low|overwhelm\w*)\b|బాధ|టెన్షన్|ఒత్తిడి|భయం|ఒంటరి|బోర్|उदास|तनाव|परेशान|अकेला|डर|थका/i],
  ["why", /\bwhy\b|ఎందుకు|क्यों/i],
];

export function classifyQuestion(q: string): { intent: Intent; sensitive: SensitiveCat | null } {
  for (const [cat, re] of SENSITIVE) if (re.test(q)) return { intent: "sensitive", sensitive: cat };
  for (const [intent, re] of INTENT_RE) if (re.test(q)) return { intent, sensitive: null };
  return { intent: "other", sensitive: null };
}

const SAFETY_RULE: Record<SensitiveCat, string> = {
  job_quit: "The user asks about quitting or switching a job. Never tell them to quit, resign or stay. Offer traditional timing as one perspective (e.g. which days suit a conversation or an application) and suggest real-world checks: savings runway, a written offer, talking to a mentor.",
  medical: "Health question. Astrology never replaces a doctor. Never advise starting, stopping or changing medicine or treatment, and never predict illness or recovery. Say clearly to follow their doctor; you may suggest a calm day/time for an appointment or a healthy habit.",
  pregnancy: "Pregnancy or fertility question. Never predict conception, the baby's sex or outcomes, and never suggest delaying medical care. Point to their doctor; you may share a gentle self-care or family-time tip.",
  gambling: "Gambling, betting or lottery question. Never give a lucky time, number or pick for betting, and never encourage it. Gently steer to safer ways to use the day.",
  legal: "Legal question. Never predict a verdict or advise on filing, settling or divorce. Suggest a qualified lawyer; you may share a calm day for paperwork or a conversation.",
  finance: "Money decision (investing, loans, property, trading). Never recommend buying, selling or investing and never predict returns. Suggest real checks (a written budget, a SEBI-registered adviser, comparing offers); you may mention which upcoming day suits a careful review.",
};

// ---------------------------------------------------------------- follow-up chips (deterministic)

export type Chip = { label: string; kind: "ask" | "save_event" | "explain" | "open"; value: string };

const CHIP_TEXT: Record<LiveLocale, Record<string, string>> = {
  en: {
    best_today: "What's my best time today?", better_day: "Which day this week is better?", watch: "What should I watch out for?",
    why_day: "Why that day?", prepare: "What should I prepare first?", remind: "Remind me the day before",
    eases: "When does this phase ease?", small_step: "One small step for today?", chapter: "Explain my current chapter simply",
    affects: "How does this affect me today?", trad: "What's the traditional view?", do_with: "What should I do with it?",
    talk_first: "What should we talk about first?", talk_day: "A good day for a serious talk?", match: "Explain our match factors",
    rest_time: "Best time today to rest?", plan_instead: "What can I plan instead?", calm_prep: "How do I prepare calmly?",
    my_day: "What's my day like?", strength: "What's my biggest strength?", next_chapter: "What changes in my next chapter?",
    date_good: "Why is this date good?", today_why: "Why is today like this?",
  },
  te: {
    best_today: "ఈరోజు నా బెస్ట్ టైమ్ ఏది?", better_day: "ఈ వారం ఏ రోజు బెటర్?", watch: "దేని గురించి జాగ్రత్తగా ఉండాలి?",
    why_day: "ఆ రోజే ఎందుకు?", prepare: "ముందు ఏం ప్రిపేర్ అవ్వాలి?", remind: "ముందు రోజు గుర్తు చేయండి",
    eases: "ఈ దశ ఎప్పుడు తేలికవుతుంది?", small_step: "ఈరోజు చేయగలిగే చిన్న స్టెప్?", chapter: "నా ఇప్పటి చాప్టర్ సింపుల్‌గా చెప్పండి",
    affects: "ఇది ఈరోజు నాకు ఎలా పనికొస్తుంది?", trad: "సంప్రదాయం ఏం చెబుతుంది?", do_with: "దీనితో నేనేం చేయాలి?",
    talk_first: "ముందు దేని గురించి మాట్లాడుకోవాలి?", talk_day: "సీరియస్ టాక్‌కి మంచి రోజు?", match: "మా మ్యాచ్ ఫ్యాక్టర్స్ చెప్పండి",
    rest_time: "ఈరోజు రెస్ట్‌కి బెస్ట్ టైమ్?", plan_instead: "బదులుగా ఏం ప్లాన్ చేయొచ్చు?", calm_prep: "ప్రశాంతంగా ఎలా ప్రిపేర్ అవ్వాలి?",
    my_day: "నా ఈరోజు ఎలా ఉంది?", strength: "నా బిగ్గెస్ట్ స్ట్రెంత్ ఏంటి?", next_chapter: "నా నెక్స్ట్ చాప్టర్‌లో ఏం మారుతుంది?",
    date_good: "ఈ డేట్ ఎందుకు మంచిది?", today_why: "ఈరోజు ఇలా ఎందుకు ఉంది?",
  },
  hi: {
    best_today: "आज मेरा सबसे अच्छा समय कब है?", better_day: "इस हफ़्ते कौन-सा दिन बेहतर है?", watch: "किस बात का ध्यान रखूँ?",
    why_day: "वही दिन क्यों?", prepare: "पहले क्या तैयारी करूँ?", remind: "एक दिन पहले याद दिलाइए",
    eases: "यह दौर कब हल्का होगा?", small_step: "आज का एक छोटा कदम?", chapter: "मेरा अभी का चैप्टर आसान शब्दों में",
    affects: "आज मुझ पर इसका क्या असर है?", trad: "परंपरा क्या कहती है?", do_with: "मैं इसका क्या करूँ?",
    talk_first: "पहले किस बारे में बात करें?", talk_day: "गंभीर बात के लिए अच्छा दिन?", match: "हमारे मिलान के पहलू समझाइए",
    rest_time: "आज आराम का सबसे अच्छा समय?", plan_instead: "इसकी जगह क्या प्लान करूँ?", calm_prep: "शांति से कैसे तैयारी करूँ?",
    my_day: "मेरा आज का दिन कैसा है?", strength: "मेरी सबसे बड़ी ताकत क्या है?", next_chapter: "मेरे अगले चैप्टर में क्या बदलेगा?",
    date_good: "यह तारीख अच्छी क्यों है?", today_why: "आज ऐसा क्यों है?",
  },
};

const INTENT_CHIPS: Record<Intent, string[]> = {
  should_i: ["best_today", "better_day", "watch"],
  when_best: ["why_day", "prepare", "remind"],
  why: ["eases", "small_step", "chapter"],
  concept: ["affects", "trad", "do_with"],
  relationship: ["talk_first", "talk_day", "match"],
  feelings: ["small_step", "eases", "rest_time"],
  sensitive: ["best_today", "plan_instead", "calm_prep"],
  other: ["my_day", "chapter", "best_today"],
};
const SCREEN_CHIP: Partial<Record<Screen, string>> = {
  decode: "strength", life: "next_chapter", bond: "match", calendar: "date_good", timing: "date_good", today: "today_why",
};

export function followupChips(intent: Intent, screen: Screen, locale: LiveLocale, opts: { suggestedDate?: string | null } = {}): Chip[] {
  const t = CHIP_TEXT[locale] ?? CHIP_TEXT.en;
  const keys = [...INTENT_CHIPS[intent]];
  const sc = SCREEN_CHIP[screen];
  if (sc && !keys.includes(sc)) keys[keys.length - 1 === keys.indexOf("remind") ? 1 : 2] = sc;
  const out: Chip[] = [];
  for (const k of keys) {
    if (k === "remind") {
      if (opts.suggestedDate) out.push({ label: t.remind, kind: "save_event", value: opts.suggestedDate });
      continue;
    }
    if (k === "match" && screen !== "bond") continue;
    out.push({ label: t[k], kind: "ask", value: t[k] });
  }
  if (out.length < 3) for (const k of ["best_today", "my_day", "chapter"]) if (out.length < 3 && !out.find((c) => c.value === t[k])) out.push({ label: t[k], kind: "ask", value: t[k] });
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- context

export type LiveWindow = { id: string; kind: "good" | "caution"; start: string; end: string; label?: string; best?: boolean };

export type LiveContextInput = {
  locale: LiveLocale;
  facts: V2Facts | null;
  /** Reading copy (profile/chapter/today) when a reading exists. */
  reading: {
    profileTitle?: string; profileSummary?: string; strengths?: string[]; watchouts?: string[];
    chapterTitle?: string; chapterHighlight?: string; chapterWhy?: string; chapterAction?: string; todayTitle?: string; todayLine?: string;
  } | null;
  subject: { name: string | null; isOwner: boolean; isChild: boolean };
  date: string;
  nowIst: string;
  windows: LiveWindow[];
  screen: Screen;
  dailySummary?: { headline?: string; line?: string } | null;
  memory: string[];
  history: { role: string; content: string }[];
  /** Days the model may pick for suggested_date (engine list). */
  upcomingDates: string[];
  /** Engine day verdict, the week's/month's best and light dates, the chapter's areas (ask_grounded.ts). */
  grounding?: Record<string, unknown> | null;
};

function monthYear(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[1]}-${m[2]}` : "";
}

function chartNotes(f: NonNullable<LiveContextInput["facts"]>): string[] {
  const ev = new Map(f.chart!.evidence.map((e) => [e.id, e.ref]));
  const ids = [...f.chart!.top.slice(0, 4)];
  const cur = f.chapters.find((x) => x.chapter_id === f.current_chapter_id);
  if (cur) ids.push(`md:${cur.md.toLowerCase()}`, `ad:${String(cur.ad ?? "").toLowerCase()}`, "md-ad");
  return [...new Set(ids)].map((id) => ev.get(id)).filter((x): x is string => Boolean(x)).slice(0, 6);
}

/** Engine-verified chart card: identical for every call that day, so it caches. */
export function chartCard(c: LiveContextInput): string {
  const f = c.facts;
  const natal = (f?.natal ?? {}) as Record<string, unknown>;
  const cur = f?.chapters.find((x) => x.chapter_id === f.current_chapter_id) ?? null;
  const idx = cur && f ? f.chapters.indexOf(cur) : -1;
  const next = idx >= 0 && f ? f.chapters.slice(idx + 1).find((x) => x.kind !== "summary") ?? f.chapters[idx + 1] ?? null : null;
  const days = (f?.days ?? []).filter((d) => d.date >= c.date).slice(0, 8).map((d) => ({
    date: d.date, weekday: d.weekday, tithi: d.tithi, nakshatra: d.nakshatra, tara: d.tara,
    verdict: d.verdict?.tone ?? (d.day_tone === "careful" ? "rest" : d.day_tone),
    favours: d.verdict?.favours ?? d.calendar?.favours ?? [], avoid: d.verdict?.avoid ?? d.calendar?.avoid ?? null,
  }));
  const card = {
    subject: c.subject,
    natal: { birth_star: natal.nakshatra ?? null, moon_sign: natal.moon_sign ?? natal.moonSign ?? null, lagna: natal.lagna ?? null },
    // v4 rule-engine facts (D1, Parashari): the few strongest placements/yogas, plus the current
    // dasha lords' natal role, so answers can say *why* without inventing chart facts.
    ...(f?.chart ? { chart_notes: chartNotes(f) } : {}),
    current_chapter: cur
      ? { md: cur.md, ad: cur.ad || null, from: monthYear(cur.start_iso), until: monthYear(cur.end_iso), domains: cur.domains, support: cur.support, pressure: cur.pressure, title: c.reading?.chapterTitle ?? null, highlight: c.reading?.chapterHighlight ?? null }
      : null,
    next_chapter: next ? { md: next.md, ad: next.ad || null, from: monthYear(next.start_iso) } : null,
    profile: c.reading ? { title: c.reading.profileTitle, summary: c.reading.profileSummary, strengths: c.reading.strengths, watchouts: c.reading.watchouts } : null,
    days,
    ...(c.grounding ? { verdicts: c.grounding } : {}),
  };
  return "CHART CARD (engine-verified facts; the only source for dates, dashas and stars):\n" + JSON.stringify(card);
}

const LANG: Record<LiveLocale, string> = { en: "English", te: "Telugu (తెలుగు script)", hi: "Hindi (देवनागरी script)" };

/** Static system block (same for every user of a language, so it stays cached). */
export function liveSystem(locale: LiveLocale, extra: string[] = []): string {
  const glossary = (["rahu_kalam", "mahadasha", "antardasha", "tara_bala", "nakshatra", "tithi", "good_slot", "koota"] as GlossTerm[])
    .map((t) => `${GLOSSARY[t][locale].title}: ${GLOSSARY[t][locale].simple}`).join(" | ");
  return [
    `You are Muhurta's live guide: a warm friend who knows Jyotisha. Reply in ${LANG[locale]} only.`,
    VOICE_BLOCK[locale],
    DATE_RULE,
    "One adaptive voice: warm, direct, specific. Respectful with elders. No slang that could offend, no teasing, no emoji except at most one in share lines.",
    "Lead with the answer itself (yes / not yet / better on <day>), then the plain why, then one concrete step. 2-4 short sentences. No 'Based on your chart' openers.",
    "Traditional terms stay (Rahu Kalam, Mahadasha, Tara Bala, nakshatra names) with a short plain gloss the first time; never replace them with English-only labels.",
    `Glossary (ground explanations in it): ${glossary}`,
    "Facts: use ONLY the CHART CARD and CONTEXT. Never invent planets, dashas, stars, dates, months, years or times. Never write clock times (the app shows them). Name a date only if the card lists it (days, verdicts.this_week, verdicts.rest_of_month), written like '19 Nov'; otherwise say 'today', 'tomorrow', a weekday, or the chapter's month-year. Pick suggested_date from its list.",
    "The day verdict is the engine's (card days[].verdict / verdicts.today_verdict: supportive, mixed or rest). Never call a mixed or rest day good for big starts, and never contradict it. For 'which day / this week / this month' questions, answer with verdicts.this_week or verdicts.rest_of_month best_days and say which to keep light. Tie the answer to the current chapter (title, chapter_areas, chapter_action) when the question is about life, work, money or plans.",
    "Traditional timing is one perspective, never a verdict. No fear, no doom, no curses, no guarantees. Never tell anyone to quit a job, start/stop/change medical treatment, try for or end a pregnancy, gamble, file or settle legal matters, or make a major financial decision. For those, give a timing-only view and suggest real-world checks (doctor, lawyer, adviser, savings plan).",
    "Remedies are free and simple (a habit, a prayer, kindness); never gemstones, paid pujas or purchases.",
    "remember: up to 2 short facts the USER explicitly said about themselves in this message (job, goal, family, upcoming event), written in the user's language; empty when none. Never guess.",
    ...extra,
  ].join("\n");
}

export function liveUserMessage(c: LiveContextInput, question: string, cls: { intent: Intent; sensitive: SensitiveCat | null }): string {
  const w = c.windows.map((x) => ({ id: x.id, kind: x.kind, ...(x.best ? { best: true } : {}) }));
  return [
    "CONTEXT:",
    JSON.stringify({
      now_ist: c.nowIst, today: c.date, screen: c.screen, intent: cls.intent,
      windows_today: w, daily_summary: c.dailySummary ?? null,
      remembered_about_user: c.memory.slice(0, 8),
      suggested_date_choices: c.upcomingDates,
    }),
    cls.sensitive ? `SAFETY: ${SAFETY_RULE[cls.sensitive]}` : "",
    c.history.length ? "RECENT CHAT:\n" + c.history.slice(-6).map((h) => `${h.role}: ${h.content.slice(0, 400)}`).join("\n") : "",
    "QUESTION:",
    question.slice(0, 900),
  ].filter(Boolean).join("\n");
}

/** Field order matters: small enum fields first (ready before the text streams), then answer. */
export function liveAskSchema(c: { windows: LiveWindow[]; upcomingDates: string[] }): Record<string, unknown> {
  const good = c.windows.filter((w) => w.kind === "good").map((w) => w.id);
  const caution = c.windows.filter((w) => w.kind === "caution").map((w) => w.id);
  const props = {
    topic: { type: "string", enum: ["work", "money", "relationship", "family", "health", "timing", "child", "self", "other"] },
    best_window: { type: "string", enum: [...good, "none"], description: "today's good time that fits, or none" },
    caution_window: { type: "string", enum: [...caution, "none"], description: "caution time to avoid for this, or none" },
    suggested_date: { type: "string", enum: [...c.upcomingDates, ""], description: "a clearly better upcoming day from the list, else empty" },
    answer: { type: "string", description: "the reply, 2-4 short sentences, max 600 characters" },
    action_line: { type: "string", description: "one concrete next step, max 150 characters" },
    remember: { type: "array", items: { type: "string" }, description: "0-2 facts the user stated about themselves" },
  };
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}

// ---------------------------------------------------------------- incremental JSON field reader

/**
 * Reads a streamed JSON object and emits the decoded text of one string field as it grows.
 * `prefixJson()` returns everything before that field as a parsable object (the enum fields).
 */
export class JsonFieldStream {
  private raw = "";
  private inField = false;
  private done = false;
  private esc = false;
  private uni: string | null = null;
  private fieldStart = -1;
  constructor(private field: string, private onText: (t: string) => void) {}
  push(delta: string) {
    const start = this.raw.length;
    this.raw += delta;
    if (this.done) return;
    if (!this.inField) {
      const key = `"${this.field}"`;
      const k = this.raw.indexOf(key, Math.max(0, start - key.length - 4));
      if (k < 0) return;
      const colon = this.raw.indexOf(":", k + key.length);
      if (colon < 0) return;
      const q = this.raw.indexOf('"', colon + 1);
      if (q < 0) return;
      this.inField = true;
      this.fieldStart = k;
      this.consume(this.raw.slice(q + 1));
      return;
    }
    this.consume(delta);
  }
  private consume(s: string) {
    let out = "";
    for (const ch of s) {
      if (this.done) break;
      if (this.uni !== null) {
        this.uni += ch;
        if (this.uni.length === 4) {
          out += String.fromCharCode(parseInt(this.uni, 16));
          this.uni = null;
        }
        continue;
      }
      if (this.esc) {
        this.esc = false;
        if (ch === "u") this.uni = "";
        else out += ch === "n" ? "\n" : ch === "t" ? " " : ch === "r" ? "" : ch;
        continue;
      }
      if (ch === "\\") { this.esc = true; continue; }
      if (ch === '"') { this.done = true; break; }
      out += ch;
    }
    if (out) this.onText(out);
  }
  get started() { return this.inField; }
  get finished() { return this.done; }
  /** Fields before the streamed one, e.g. {"topic":...,"best_window":...}. */
  prefixJson(): Record<string, unknown> | null {
    if (this.fieldStart < 0) return null;
    const head = this.raw.slice(0, this.fieldStart).replace(/,\s*$/, "");
    try {
      return JSON.parse(head + "}") as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  text() { return this.raw; }
}

// ---------------------------------------------------------------- pre-display stream guard

const MONTHS_ALL: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  "జనవరి": 1, "ఫిబ్రవరి": 2, "మార్చి": 3, "ఏప్రిల్": 4, "మే": 5, "జూన్": 6, "జూలై": 7, "ఆగస్టు": 8, "సెప్టెంబర్": 9, "అక్టోబర్": 10, "నవంబర్": 11, "డిసెంబర్": 12,
  "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6, "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "अक्टूबर": 10, "नवंबर": 11, "दिसंबर": 12,
};
const AMBIGUOUS_MONTHS = new Set(["may", "mar", "march", "మార్చి", "మే"]);
const MONTH_ALT = Object.keys(MONTHS_ALL).sort((a, b) => b.length - a.length).join("|");
const DAY_MONTH_RE = new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${MONTH_ALT})(?![\\p{L}])`, "giu");
const MONTH_DAY_RE = new RegExp(`(?<![\\p{L}])(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?!\\d)`, "giu");
const MONTH_ONLY_RE = new RegExp(`(?<![\\p{L}])(${MONTH_ALT})(?![\\p{L}])`, "giu");
const YEAR_RE = /\b(19|20)\d{2}\b/g;
const CLOCK_RE = /\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b|\d{1,2}\s*(?:గంటల|బజే|बजे)/i;
const ISO_RE = /\b\d{4}-\d{2}(-\d{2})?\b/;

const DIRECTIVE_RE: RegExp[] = [
  /(?<!\b(?:whether|if)\s)\b(you should|you must|go ahead and|definitely|just)\s+(quit|resign|stop (taking )?(your )?(medicine|medication|treatment|tablets)|invest|bet|gamble|buy (the )?(shares|stock|crypto|property|house)|sell|file (the )?(case|divorce)|get divorced)\b/i,
  /\byou will (get pregnant|conceive|win|recover|be cured|lose the case|win the case|get rich|definitely get)\b/i,
  /(జాబ్|ఉద్యోగం)\s*(మానేయండి|వదిలేయండి)|మందులు\s*(ఆపేయండి|మానేయండి)|ఇన్వెస్ట్ చేసేయండి|బెట్ కట్టండి/,
  /(नौकरी|जॉब)\s*छोड़ (दीजिए|दो|दें)|दवा(ई)?\s*बंद (कर दीजिए|करें|कर दो)|निवेश कर (दीजिए|दें)|सट्टा लगा(इए|ओ)/,
];

const WITHHELD: Record<LiveLocale, { time: string; date: string; safety: string }> = {
  en: { time: "The exact times are in the card below.", date: "Check the exact dates in the app's cards.", safety: "That decision is yours to make with real-world advice; tradition only offers a timing view." },
  te: { time: "ఖచ్చితమైన టైమ్స్ కింద కార్డ్‌లో ఉన్నాయి.", date: "ఖచ్చితమైన తేదీలు యాప్‌లోని కార్డ్‌లలో చూడండి.", safety: "ఆ నిర్ణయం మీదే, నిపుణుల సలహాతో తీసుకోండి. సంప్రదాయం కేవలం టైమింగ్ వైపు నుంచి చూపిస్తుంది." },
  hi: { time: "सही समय नीचे कार्ड में है।", date: "सही तारीखें ऐप के कार्ड में देखिए।", safety: "यह फ़ैसला आपका है, सही सलाह लेकर कीजिए; परंपरा सिर्फ़ समय के हिसाब से एक नज़रिया देती है।" },
};

export type GuardAllowed = { dayMonths: Set<string>; months: Set<number>; years: Set<number> };

/** Dates the engine stands behind: upcoming days, today, chapter boundaries. */
export function allowedDates(facts: V2Facts | null, date: string, upcoming: string[]): GuardAllowed {
  const dayMonths = new Set<string>();
  const months = new Set<number>();
  const years = new Set<number>();
  const add = (iso: string | null | undefined, withDay: boolean) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
    if (!m) return;
    years.add(Number(m[1]));
    months.add(Number(m[2]));
    if (withDay) dayMonths.add(`${Number(m[3])}-${Number(m[2])}`);
  };
  add(date, true);
  for (const d of upcoming) add(d, true);
  for (const d of facts?.days ?? []) add(d.date, true);
  const cur = facts?.chapters.find((x) => x.chapter_id === facts.current_chapter_id);
  const idx = cur && facts ? facts.chapters.indexOf(cur) : -1;
  for (const ch of idx >= 0 && facts ? facts.chapters.slice(Math.max(0, idx - 1), idx + 3) : []) {
    add(ch.start_iso, false);
    add(ch.end_iso, false);
  }
  // The whole current mahadasha (first and last chapter under the same lord) is engine-owned too.
  if (cur && facts) {
    const same = facts.chapters.filter((x) => x.md === cur.md || (x.md_lords ?? []).includes(cur.md));
    if (same.length) {
      add(same[0].start_iso, false);
      add(same[same.length - 1].end_iso, false);
    }
  }
  return { dayMonths, months, years };
}

export type GuardHit = { kind: "time" | "date" | "safety" | "iso" | "script"; text: string };

/** Letters from another Indic script in a te/hi answer (Luna sometimes drifts into Tamil or Kannada). */
const ALIEN_ASK: Partial<Record<LiveLocale, RegExp>> = {
  te: /[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C80-\u0CFF\u0D00-\u0D7F]/,
  hi: /[\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/,
};
export function alienScript(s: string, locale: LiveLocale): boolean {
  return Boolean(ALIEN_ASK[locale]?.test(s));
}

export function sentenceProblem(s: string, allowed: GuardAllowed, sensitive: boolean): GuardHit["kind"] | null {
  if (CLOCK_RE.test(s)) return "time";
  if (ISO_RE.test(s)) return "iso";
  for (const m of s.matchAll(DAY_MONTH_RE)) {
    const mo = MONTHS_ALL[m[2].toLowerCase()];
    if (mo && !allowed.dayMonths.has(`${Number(m[1])}-${mo}`)) return "date";
  }
  for (const m of s.matchAll(MONTH_DAY_RE)) {
    const mo = MONTHS_ALL[m[1].toLowerCase()];
    if (mo && !allowed.dayMonths.has(`${Number(m[2])}-${mo}`)) return "date";
  }
  for (const m of s.matchAll(MONTH_ONLY_RE)) {
    const key = m[1].toLowerCase();
    // Words that are also verbs ("may", "march", Telugu మార్చి = "changed", మే): a month only next to a number.
    if (AMBIGUOUS_MONTHS.has(key) && !new RegExp(`\\d\\s*${m[1]}|${m[1]}\\s*\\d`, "iu").test(s)) continue;
    const mo = MONTHS_ALL[key];
    if (mo && !allowed.months.has(mo)) return "date";
  }
  for (const m of s.matchAll(YEAR_RE)) if (!allowed.years.has(Number(m[0]))) return "date";
  if (sensitive || DIRECTIVE_RE.some((re) => re.test(s))) {
    if (DIRECTIVE_RE.some((re) => re.test(s))) return "safety";
  }
  return null;
}

/**
 * Holds streamed text until it is safe to show. Plain words flush quickly (first words
 * fast); anything with a digit or a month name waits for its sentence to end and is checked
 * against the engine's dates first. A withheld sentence is replaced by a neutral line before
 * display, so nothing on screen is ever edited afterwards.
 */
export class StreamGuard {
  private buf = "";
  private shown = "";
  /** Part of the current sentence already shown by an early flush. */
  private headShown = false;
  hits: GuardHit[] = [];
  private replaced = new Set<string>();
  constructor(
    private locale: LiveLocale,
    private allowed: GuardAllowed,
    private sensitive: boolean,
    private emit: (text: string) => void,
  ) {}
  private risky(s: string): boolean {
    return /\d/.test(s) || new RegExp(`(?<![\\p{L}])(${MONTH_ALT})`, "iu").test(s) || this.sensitive || alienScript(s, this.locale);
  }
  private out(t: string) {
    if (!t) return;
    const polished = polishVoice(t, this.locale);
    this.shown += polished;
    this.emit(polished);
  }
  private sentence(s: string) {
    const head = this.headShown;
    this.headShown = false;
    if (alienScript(s, this.locale)) {
      // Wrong script: drop it (never shown). If nothing else is shown, the caller shows the grounded answer.
      this.hits.push({ kind: "script", text: s.slice(0, 200) });
      if (head) this.out("…" + (/\s$/.test(s) ? " " : ""));
      return;
    }
    const p = sentenceProblem(s, this.allowed, this.sensitive);
    if (!p) return this.out(s);
    this.hits.push({ kind: p, text: s.slice(0, 200) });
    const w = WITHHELD[this.locale] ?? WITHHELD.en;
    const line = p === "safety" ? w.safety : p === "time" ? w.time : w.date;
    const tail = /\s$/.test(s) ? " " : "";
    if (this.replaced.has(line)) {
      // Close a half-shown sentence instead of leaving it hanging.
      if (head) this.out("…" + tail);
      return;
    }
    this.replaced.add(line);
    const lead = head ? "… " : /^\s/.test(s) ? " " : "";
    this.out(lead + line + tail);
  }
  push(delta: string) {
    this.buf += delta;
    for (;;) {
      const m = /[.!?।\n](?=\s|$)/u.exec(this.buf);
      if (m && m.index + 1 < this.buf.length) {
        const end = m.index + 1;
        let cut = end;
        while (cut < this.buf.length && /\s/.test(this.buf[cut])) cut++;
        this.sentence(this.buf.slice(0, cut));
        this.buf = this.buf.slice(cut);
        continue;
      }
      break;
    }
    // Early flush of plain words (no digits / months / sensitive topic) at a word boundary.
    if (!this.risky(this.buf) && this.buf.length >= 12) {
      const sp = this.buf.lastIndexOf(" ");
      if (sp > 0) {
        this.out(this.buf.slice(0, sp + 1));
        this.buf = this.buf.slice(sp + 1);
        this.headShown = true;
      }
    }
  }
  end(): string {
    if (this.buf.trim()) this.sentence(this.buf);
    this.buf = "";
    return this.shown.trim();
  }
  get text() { return this.shown; }
}

/** Same checks for short, non-streamed strings (action line, daily summary, explanations). */
export function guardText(s: string, locale: LiveLocale, allowed: GuardAllowed, sensitive = false): { text: string; hits: GuardHit[] } {
  let text = "";
  const g = new StreamGuard(locale, allowed, sensitive, (t) => (text += t));
  g.push(s);
  g.end();
  return { text: text.trim(), hits: g.hits };
}
