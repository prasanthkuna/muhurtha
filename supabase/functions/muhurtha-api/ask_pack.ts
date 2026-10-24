import type { BirthIntelligencePackContent } from "./birth_intelligence_pack.ts";
import type { AppLocale } from "./vedic_labels.ts";

export type AskAnswerCopy = {
  direct_answer: string;
  best_time: string;
  caution_time: string;
  better_option: string;
  simple_why: string;
  action_line: string;
  share_hook: string;
};

export type NormalizedAskTemplate = {
  key: string;
  question: string;
  topics: string[];
  directAnswer: string;
  bestFor: string;
  caution: string;
  betterOption: string;
  actionLine: string;
  shareLine: string;
};

type Window = { start: string; end: string; label?: string };

const LEGACY_STRING_KEYS = ["work", "pending", "money", "relationship"] as const;

const TOPIC_ALIASES: Record<string, string[]> = {
  career: [
    "work", "job", "career", "office", "manager", "boss", "interview", "promotion",
    "project", "deadline", "పని", "ఇంటర్వ్యూ", "మేనేజర్", "ఆఫీస్", "కెరీర్",
    "काम", "नौकरी", "इंटरव्यू", "मैनेजर",
  ],
  money: [
    "money", "salary", "loan", "invest", "finance", "property", "emi", "savings",
    "డబ్బు", "ఆస్తి", "ఫైనాన్స్", "జీతం", "पैसा", "पैसे", "प्रॉपर्टी",
  ],
  relationship: [
    "relationship", "partner", "marriage", "love", "dating", "spouse", "wedding",
    "సంబంధం", "పెళ్లి", "प्रेम", "रिश्ता", "शादी",
  ],
  family: [
    "family", "parent", "mother", "father", "in-law", "kids", "child",
    "కుటుంబం", "తల్లి", "తండ్రి", "परिवार", "माता-पिता",
  ],
  travel: [
    "travel", "trip", "journey", "flight", "ప్రయాణం", "यात्रा",
  ],
  study: [
    "study", "exam", "college", "course", "learn", "చదువు", "పరీక్ష", "पढ़ाई", "एग्जाम",
  ],
  health: [
    "health", "doctor", "hospital", "आरोग्य", "ఆరోగ్యం",
  ],
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function mapRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function clock12(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = Number(m[1]);
  const min = m[2];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}

export function formatAskWindow(
  window: Window,
  caution = false,
): string {
  const label = caution && window.label ? ` (${window.label})` : "";
  return `${clock12(window.start)} – ${clock12(window.end)}${label}`;
}

export function askFallbackCopy(
  locale: AppLocale,
  good: Window[],
  caution: Window[],
): AskAnswerCopy {
  const best = good[0] ? formatAskWindow(good[0]) : "";
  const careful = caution[0] ? formatAskWindow(caution[0], true) : "";
  if (locale === "te") {
    return {
      direct_answer: best
        ? "అవును, చేయొచ్చు — మాట షార్ట్‌గా, ప్లాన్ క్లియర్‌గా ఉంచండి."
        : "చేయొచ్చు, కానీ చిన్న స్టెప్‌తో స్టార్ట్ చేయండి.",
      best_time: best ? `మంచి టైమ్: ${best}` : "ఈరోజు పెద్ద మంచి టైమ్ ఏమీ లేదు. చిన్నగా స్టార్ట్ చేయండి.",
      caution_time: careful ? `జాగ్రత్త టైమ్: ${careful}` : "రాహుకాలంలో పెద్ద నిర్ణయం పెట్టుకోకండి.",
      better_option: "ముందు రెండు పాయింట్లు రాసుకోండి, తర్వాత మాట్లాడండి.",
      simple_why: "ఈరోజు టైమింగ్ బట్టి, వేగం కంటే ఆర్డర్ ముఖ్యం.",
      action_line: "పని చిన్నగా, మాట సూటిగా, నిర్ణయం కూల్‌గా.",
      share_hook: "ఈరోజు తొందర వద్దు — సరైన టైమ్ చూసి స్టెప్ వేయండి.",
    };
  }
  if (locale === "hi") {
    return {
      direct_answer: best
        ? "हाँ, कर सकते हैं — बस बात छोटी और साफ रखें."
        : "कर सकते हैं, लेकिन कदम छोटा रखें.",
      best_time: best ? `अच्छा समय: ${best}` : "अच्छा समय साफ नहीं है. छोटा कदम रखें.",
      caution_time: careful ? `सावधानी समय: ${careful}` : "राहु काल हो तो बड़ा फैसला न रखें.",
      better_option: "पहले दो पॉइंट्स लिखें, फिर बात करें.",
      simple_why: "आज जल्दबाजी से ज्यादा साफ क्रम काम आएगा.",
      action_line: "काम छोटा, बात सीधी, फैसला शांत रखें.",
      share_hook: "आज जल्दबाजी नहीं; सही समय देखकर कदम बढ़ाएं.",
    };
  }
  return {
    direct_answer: best
      ? "Yes, go for it. Keep the ask clear and the plan small."
      : "You can, but start with one small step.",
    best_time: best ? `Good time: ${best}` : "No standout good time today. Start small.",
    caution_time: careful
      ? `Careful time: ${careful}`
      : "Don't put your biggest decision in Rahu Kalam.",
    better_option: "Jot down two points first, then talk or act.",
    simple_why: "Today rewards doing things in order, not pushing hard.",
    action_line: "Small task, straight words, calm call.",
    share_hook: "No rush today. Pick the better time and keep it light.",
  };
}

function packSlice(content: BirthIntelligencePackContent) {
  const identity = mapRecord(content.user_identity) ?? mapRecord(content.me_profile);
  const guidance = mapRecord(content.today_guidance);
  const timing = mapRecord(content.timing_plan);
  const week = mapRecord(timing?.week);
  const month = mapRecord(timing?.month);
  const phase = mapRecord(timing?.current_phase);
  const knowledge = mapRecord(content.ask_knowledge);
  const todayCards = asArray<Record<string, unknown>>(content.today_cards);
  const todayOne = todayCards[0];
  return {
    identity,
    guidance,
    week,
    month,
    phase,
    knowledge,
    todayOne,
    compactSummary: safeString(knowledge?.compact_summary) ||
      safeString(knowledge?.body) ||
      safeString(knowledge?.headline),
    shareHook: safeString(identity?.share_hook) ||
      safeString(mapRecord(content.me_profile)?.share_hook),
  };
}

function legacyTopicsForKey(key: string): string[] {
  return TOPIC_ALIASES[key] ?? TOPIC_ALIASES.career;
}

function composeFromPackKey(
  key: string,
  content: BirthIntelligencePackContent,
  locale: AppLocale,
): Omit<NormalizedAskTemplate, "key" | "question" | "topics"> {
  const slice = packSlice(content);
  const { identity, guidance, week, month, phase, todayOne, compactSummary, shareHook } =
    slice;

  const todayAdvice = safeString(guidance?.main_advice) ||
    safeString(todayOne?.one_line) ||
    safeString(todayOne?.body);
  const workMoney = safeString(identity?.work_money_pattern);
  const relationship = safeString(identity?.relationship_pattern);
  const weekFocus = safeString(week?.action_focus) || safeString(week?.headline);
  const weekCaution = safeString(week?.caution);
  const monthStrategy = safeString(month?.strategy) || safeString(month?.headline);
  const monthCaution = safeString(month?.caution);
  const phaseUse = safeString(phase?.use_it_for) || safeString(phase?.headline);
  const phaseAvoid = safeString(phase?.avoid);
  const actionRemedy = safeString(guidance?.one_remedy);

  switch (key) {
    case "money":
      return {
        directAnswer: workMoney || monthStrategy || compactSummary,
        bestFor: monthStrategy || weekFocus,
        caution: monthCaution || weekCaution,
        betterOption: safeString(week?.share_line) ||
          (locale === "te"
            ? "ఈ వారం ఎక్కువ ఖర్చులు, ఊహల మీద ఆఫర్లు వద్దు."
            : locale === "hi"
            ? "अधिक खर्च और जल्दबाजी वाले फैसले इस हफ्ते टालें."
            : "Skip impulse buys and rushed money calls this week."),
        actionLine: actionRemedy ||
          (locale === "te"
            ? "ఈరోజు ఒక్క చిన్న డబ్బు నిర్ణయం మాత్రమే."
            : locale === "hi"
            ? "आज सिर्फ एक छोटा पैसे का फैसला लें."
            : "Just one small money decision today."),
        shareLine: safeString(month?.share_line) || shareHook,
      };
    case "relationship":
    case "family":
      return {
        directAnswer: relationship || compactSummary,
        bestFor: phaseUse || weekFocus,
        caution: phaseAvoid || weekCaution,
        betterOption: locale === "te"
          ? "ముందు మీ ఫీలింగ్ చెప్పండి, కంప్లైంట్ తర్వాత."
          : locale === "hi"
          ? "पहले इरादा बताएं, आलोचना बाद में रखें."
          : "Say how you feel first. Save the criticism for later.",
        actionLine: locale === "te"
          ? "ఒక్క క్లియర్ లైన్‌తో మాట స్టార్ట్ చేయండి."
          : locale === "hi"
          ? "एक साफ वाक्य से बात शुरू करें."
          : "Open with one clear sentence.",
        shareLine: shareHook,
      };
    case "pending":
    case "week":
      return {
        directAnswer: weekFocus || todayAdvice || compactSummary,
        bestFor: safeString(week?.headline) || todayAdvice,
        caution: weekCaution,
        betterOption: locale === "te"
          ? "పెండింగ్ లిస్ట్ చిన్నది చేసి, ఒక్కటి పూర్తి చేయండి."
          : locale === "hi"
          ? "पेंडिंग लिस्ट छोटी करके एक काम पूरा करें."
          : "Shrink the pending list and finish one thing.",
        actionLine: todayAdvice || actionRemedy,
        shareLine: safeString(week?.share_line) || shareHook,
      };
    case "travel":
      return {
        directAnswer: todayAdvice || weekFocus || compactSummary,
        bestFor: weekFocus,
        caution: weekCaution,
        betterOption: locale === "te"
          ? "టికెట్స్, పేమెంట్స్ మంచి టైమ్‌లో చేయండి."
          : locale === "hi"
          ? "टिकट और फॉर्मैलिटी अच्छे समय में करें."
          : "Book tickets and do paperwork in the better time slot.",
        actionLine: actionRemedy || todayAdvice,
        shareLine: shareHook,
      };
    case "study":
      return {
        directAnswer: todayAdvice || weekFocus || compactSummary,
        bestFor: weekFocus,
        caution: weekCaution,
        betterOption: locale === "te"
          ? "ఒక సబ్జెక్ట్, ఒక గోల్ — ఈ వారం అదే పట్టుకోండి."
          : locale === "hi"
          ? "एक विषय, एक लक्ष्य — इस हफ्ते उसी पर टिके रहें."
          : "One subject, one goal. Stick with it this week.",
        actionLine: todayAdvice,
        shareLine: shareHook,
      };
    default:
      return {
        directAnswer: todayAdvice || compactSummary,
        bestFor: weekFocus || phaseUse,
        caution: weekCaution || phaseAvoid,
        betterOption: locale === "te"
          ? "ముందు ఒక్క ప్రయారిటీ ఫిక్స్ చేసుకోండి."
          : locale === "hi"
          ? "पहले एक प्राथमिकता तय करें."
          : "Pick one priority before you push.",
        actionLine: actionRemedy || todayAdvice,
        shareLine: safeString(todayOne?.share_hook) || shareHook,
      };
  }
}

function normalizeTemplateItem(
  raw: unknown,
  index: number,
  content: BirthIntelligencePackContent,
  locale: AppLocale,
): NormalizedAskTemplate | null {
  if (typeof raw === "string") {
    const question = raw.trim();
    if (!question) return null;
    const key = LEGACY_STRING_KEYS[index] ?? "career";
    const composed = composeFromPackKey(key, content, locale);
    return {
      key,
      question,
      topics: [...legacyTopicsForKey(key), question.toLowerCase()],
      ...composed,
    };
  }

  if (typeof raw !== "object" || !raw || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const key = safeString(row.key) ||
    LEGACY_STRING_KEYS[index] ||
    "career";
  const question = safeString(row.question) ||
    safeString(row.title) ||
    safeString(row.label);
  const topics = asArray<unknown>(row.topics)
    .map((t) => safeString(t).toLowerCase())
    .filter(Boolean);
  const aliases = legacyTopicsForKey(key);
  const composed = composeFromPackKey(key, content, locale);

  return {
    key,
    question,
    topics: [...new Set([...topics, ...aliases, key, question.toLowerCase()])]
      .filter(Boolean),
    directAnswer: safeString(row.direct_answer) ||
      safeString(row.answer_frame) ||
      composed.directAnswer ||
      safeString(row.body),
    bestFor: safeString(row.best_for) || composed.bestFor,
    caution: safeString(row.caution) || composed.caution,
    betterOption: safeString(row.better_option) || composed.betterOption,
    actionLine: safeString(row.action_line) || composed.actionLine,
    shareLine: safeString(row.share_line) || safeString(row.share_hook) ||
      composed.shareLine,
  };
}

export function normalizeAskTemplates(
  content: BirthIntelligencePackContent,
  locale: AppLocale,
): NormalizedAskTemplate[] {
  const raw = asArray<unknown>(content.ask_templates);
  const out = raw
    .map((item, idx) => normalizeTemplateItem(item, idx, content, locale))
    .filter((item): item is NormalizedAskTemplate => item != null &&
      item.directAnswer.length > 0);

  if (out.length > 0) return out;

  const slice = packSlice(content);
  if (!slice.compactSummary) return out;

  return [{
    key: "general",
    question: "",
    topics: ["general"],
    ...composeFromPackKey("career", content, locale),
    directAnswer: slice.compactSummary,
  }];
}

function scoreTemplate(question: string, template: NormalizedAskTemplate): number {
  const q = question.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;

  if (template.question && q === template.question.toLowerCase()) {
    score += 100;
  }
  if (template.question && q.includes(template.question.toLowerCase())) {
    score += 40;
  }

  for (const topic of template.topics) {
    const t = topic.toLowerCase().trim();
    if (!t || t.length < 2) continue;
    if (q.includes(t)) score += t.length >= 4 ? 14 : 8;
  }

  for (const [key, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (template.key !== key) continue;
    for (const alias of aliases) {
      if (q.includes(alias.toLowerCase())) score += 10;
    }
  }

  return score;
}

function matchCommonAnswer(
  question: string,
  content: BirthIntelligencePackContent,
): string {
  const knowledge = mapRecord(content.ask_knowledge);
  const normalized = question.toLowerCase();
  const commons = asArray<Record<string, unknown>>(knowledge?.common_answers);
  for (const row of commons) {
    const topic = safeString(row.topic).toLowerCase();
    if (topic && normalized.includes(topic)) {
      return safeString(row.answer);
    }
  }
  const examples = asArray<unknown>(knowledge?.examples);
  for (const example of examples) {
    const text = safeString(example).toLowerCase();
    if (text && (normalized.includes(text) || text.includes(normalized))) {
      return safeString(example);
    }
  }
  return "";
}

export function resolveAskFromPack(
  content: BirthIntelligencePackContent | null | undefined,
  question: string,
  locale: AppLocale,
  goodWindows: Window[],
  cautionWindows: Window[],
): AskAnswerCopy {
  const timing = askFallbackCopy(locale, goodWindows, cautionWindows);
  if (!content) return timing;

  const templates = normalizeAskTemplates(content, locale);
  const ranked = templates
    .map((template) => ({ template, score: scoreTemplate(question, template) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const template = best && best.score > 0
    ? best.template
    : ranked[0]?.template;
  const strongMatch = Boolean(best && best.score >= 12);

  const commonAnswer = matchCommonAnswer(question, content);
  const slice = packSlice(content);

  if (!template && !commonAnswer && !slice.compactSummary) {
    return timing;
  }

  const direct = commonAnswer ||
    (strongMatch ? template?.directAnswer : "") ||
    template?.directAnswer ||
    slice.compactSummary ||
    timing.direct_answer;

  const bestTime = strongMatch && template?.bestFor
    ? `${timing.best_time}${timing.best_time ? " — " : ""}${template.bestFor}`
    : timing.best_time;

  return {
    direct_answer: direct,
    best_time: bestTime,
    caution_time: template?.caution
      ? `${locale === "te" ? "జాగ్రత్త: " : locale === "hi" ? "सावधानी: " : "Watch: "}${template.caution}`
      : timing.caution_time,
    better_option: template?.betterOption || timing.better_option,
    simple_why: template?.bestFor
      ? `${locale === "te" ? "ఎందుకంటే: " : locale === "hi" ? "क्यों: " : "Why: "}${template.bestFor}`
      : timing.simple_why,
    action_line: (strongMatch && template?.actionLine) || template?.actionLine || timing.action_line,
    share_hook: template?.shareLine || slice.shareHook || timing.share_hook,
  };
}

export function askSuggestionQuestions(
  content: BirthIntelligencePackContent | null | undefined,
  locale: AppLocale,
): string[] {
  if (!content) return [];
  return normalizeAskTemplates(content, locale)
    .map((t) => t.question)
    .filter((q) => q.length > 0);
}
