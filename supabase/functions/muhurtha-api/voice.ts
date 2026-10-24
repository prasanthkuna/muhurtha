/**
 * Muhūrta voice (v2.3, 2026-10-24): one place for how the app talks in each language.
 * Used by the reading prompt, the Ask prompt, sanitizers and the voice lint tests.
 * Pure module (no Deno APIs) so tests and the PWA lint can import it.
 */
export type VoiceLocale = "en" | "te" | "hi";

export const ENGLISH_VOICE = [
  "ENGLISH VOICE: write like a friend on Twitter who knows astrology. Short, warm, everyday lines; contractions (you're, it's, don't); a little wit is fine.",
  "Plain words: say 'good time' or 'slot', never 'window'; 'good' or 'lucky', never 'auspicious' or 'favourable'; never 'energies', 'harness', 'navigate', 'delve', 'embark', 'journey', 'tapestry', 'realm', 'align', 'resonate', 'unlock your potential'.",
  "No LinkedIn or fortune-cookie lines (no 'clarity', 'momentum', 'follow-through', 'structure', 'steady' stacked together). Give one concrete, real-life example instead (a text you've been putting off, the bill, the gym, a call with mom).",
  "Astro words only when needed, with a 2-4 word gloss the first time: 'Jupiter–Saturn (your current planet period)', 'nakshatra (birth star)', 'Rahu Kalam (the daily ~90-min no-new-starts slot)'.",
  "Don't lean on pet words: 'routine', 'clean', 'practical', 'calm', 'gentle', 'clear' at most 3 times each across the whole reading. Vary them.",
  "No em-dash chains, no 'not X, but Y' templates, no rhetorical triplets, no fear, no doom.",
].join(" ");

export const TELUGU_VOICE = [
  "TELUGU VOICE: మాట్లాడే తెలుగు, ఫ్రెండ్ లాగా — Twitter/WhatsApp లో మనం రాసేలా. Respectful spoken మీరు (చేయండి, చూడండి, occasional అండీ); never bare నువ్వు commands (చేయి, చూడు, ఉంచు).",
  "About a quarter of the words can be everyday English, WRITTEN IN TELUGU SCRIPT: టైమ్, ఫోకస్, ప్లాన్, సేవ్, బ్రేక్, ఓకే, ఫ్రీ, జాబ్, మెసేజ్, కాల్. Keep sentences Telugu.",
  "Use spoken forms: చేయొచ్చు (not చేయవచ్చు), వద్దు/చేయకండి, అయిపోయింది, కాస్త, కొంచెం. Never use bookish words: మరియు (use commas), కిటికీ (use టైమ్), సమయ విండో, అనుకూలమైన కాలం, ప్రయత్నించండి (use ట్రై చేయండి), శుభప్రదమైన, దయచేసి, తదుపరి (use నెక్స్ట్), అధ్యాయం (use చాప్టర్).",
  "Neutral dialect, no regional slang. Short lines. One real-life example per idea (ఆఫీస్ మెయిల్, అమ్మకి కాల్, EMI, జిమ్).",
  "Astro words: plain Telugu names (గురువు, శని, రాహుకాలం, నక్షత్రం) with a 2-4 word gloss when it's a dasha: 'గురు–శని దశ (మీ ఇప్పటి గ్రహ దశ)'.",
].join(" ");

export const HINDI_VOICE = [
  "HINDI VOICE: casual spoken Hindi, like a friend texting; respectful aap (karein, dekhiye), never tum/tu commands.",
  "Everyday English words are fine in Devanagari (टाइम, प्लान, फोकस, ब्रेक, मैसेज). Avoid shuddh/bookish Hindi (शुभ फलदायी, अनुकूल अवधि, खिड़की, एवं, तथा).",
  "Short lines, one real-life example, no fear.",
].join(" ");

export const VOICE_BLOCK: Record<VoiceLocale, string> = { en: ENGLISH_VOICE, te: TELUGU_VOICE, hi: HINDI_VOICE };

export const DATE_RULE =
  "Dates: never write ISO dates (2026-10-24) or YYYY-MM. Write them like people do: '24 Oct', 'next Friday', 'mid-November', 'early 2027' (Telugu: '24 అక్టోబర్', Hindi: '24 अक्टूबर').";

/** Words the voice lint rejects in static strings and sampled LLM output (case-insensitive). */
export const VOICE_BANNED: Record<VoiceLocale, string[]> = {
  en: ["auspicious", "favourable", "favorable", "energies", "harness", "navigate", "delve", "tapestry", "embark", "the universe", "cosmic", "stars align", "manifest"],
  te: ["కిటికీ", "మరియు", "అధ్యాయం", "దయచేసి", "శుభప్రదమైన", "ఐచ్ఛికం", "విఫలమైంది", "ధృవీకరించబడింది"],
  hi: ["खिड़की", "ब्रह्मांड", "कॉस्मिक"],
};

/** Bare నువ్వు imperatives that must not appear on buttons / CTAs (word-final). */
export const TE_BARE_IMPERATIVE_RE = /(?:^|\s)(?:చేయి|చూడు|ఉంచు|పంపు|జోడించు|తొలగించు|దాచు|ఆపు|అడుగు|గుర్తించు|తెరువు|ఎంచుకో|రాయి|వెతుకు)(?=$|[\s.!?,])/u;

export const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{4}-\d{2}\b(?!-)/;

const MONTHS: Record<VoiceLocale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  te: ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};

/** "2026-10-24" -> "24 Oct" (year kept when it isn't `currentYear`). */
export function humanDate(iso: string, locale: VoiceLocale, currentYear = new Date().getUTCFullYear()): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) return iso;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return iso;
  const mon = MONTHS[locale][mo - 1];
  const yr = y === currentYear ? "" : ` ${y}`;
  if (!m[3]) return `${mon} ${y}`;
  return `${Number(m[3])} ${mon}${yr}`;
}

/** Replace any ISO date / year-month in prose with a human date. */
export function humanizeDates(text: string, locale: VoiceLocale, currentYear?: number): string {
  return text
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => humanDate(d, locale, currentYear))
    .replace(/\b(\d{4}-\d{2})\b(?!-)/g, (d) => humanDate(d, locale, currentYear));
}

const EN_FIX: [RegExp, string][] = [
  [/\btime windows\b/gi, "time slots"],
  [/\btime window\b/gi, "time slot"],
  [/\bwindows\b/g, "slots"],
  [/\bWindows\b/g, "Slots"],
  [/\bwindow\b/g, "slot"],
  [/\bWindow\b/g, "Slot"],
  [/\bauspicious\b/g, "lucky"],
  [/\bAuspicious\b/g, "Lucky"],
  [/\bfavou?rable\b/g, "good"],
  [/\bFavou?rable\b/g, "Good"],
  [/\benergies\b/g, "energy"],
  [/\bharness\b/g, "use"],
  [/\bnavigate\b/g, "handle"],
  [/\bnavigating\b/g, "handling"],
  [/\s+—\s+/g, ", "],
];
const TE_FIX: [RegExp, string][] = [
  [/\s*,?\s*మరియు\s+/g, ", "],
  [/కిటికీలు/g, "టైమ్స్"],
  [/కిటికీ/g, "టైమ్"],
  [/దయచేసి\s*/g, ""],
  [/([\u0c15-\u0c39])వచ్చు/g, "$1ొచ్చు"],
  [/ప్రయత్నించండి/g, "ట్రై చేయండి"],
  [/శుభప్రదమైన/g, "మంచి"],
  [/వాగ్దానం చేయడం/g, "మాట ఇచ్చేయడం"],
  [/వాగ్దానాలు/g, "మాటలు"],
  [/వాగ్దానం/g, "మాట"],
  [/అధ్యాయాలు/g, "చాప్టర్లు"],
  [/అధ్యాయం/g, "చాప్టర్"],
  [/అధ్యాయ/g, "చాప్టర్"],
];
const HI_FIX: [RegExp, string][] = [
  [/खिड़कियाँ/g, "समय"],
  [/खिड़की/g, "समय"],
];

/** Deterministic last-mile voice fixes applied to every model string. */
export function polishVoice(text: string, locale: VoiceLocale, currentYear?: number): string {
  if (!text) return text;
  let t = humanizeDates(text, locale, currentYear);
  const rules = locale === "en" ? EN_FIX : locale === "te" ? TE_FIX : HI_FIX;
  for (const [re, to] of rules) t = t.replace(re, to);
  return t.replace(/^,\s*/, "").replace(/\s+,/g, ",").replace(/,\s*,/g, ",");
}

/** Walk any JSON-ish value and polish every string (keys untouched). */
export function polishDeep<T>(v: T, locale: VoiceLocale, skipKeys: Set<string> = new Set(), currentYear?: number): T {
  const walk = (x: unknown, key?: string): unknown => {
    if (typeof x === "string") return key && skipKeys.has(key) ? x : polishVoice(x, locale, currentYear);
    if (Array.isArray(x)) return x.map((y) => walk(y, key));
    if (x && typeof x === "object") {
      return Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, y]) => [k, walk(y, k)]));
    }
    return x;
  };
  return walk(v) as T;
}

/** Lint one string; returns human-readable problems. */
export function voiceProblems(text: string, locale: VoiceLocale, opts: { isButton?: boolean } = {}): string[] {
  const out: string[] = [];
  const low = text.toLowerCase();
  for (const w of VOICE_BANNED[locale]) if (low.includes(w.toLowerCase())) out.push(`banned:${w}`);
  if (locale === "en" && /\bwindows?\b/i.test(text)) out.push("banned:window");
  if (ISO_DATE_RE.test(text)) out.push("iso_date");
  if (locale === "te" && opts.isButton && TE_BARE_IMPERATIVE_RE.test(text)) out.push("bare_imperative");
  return out;
}
