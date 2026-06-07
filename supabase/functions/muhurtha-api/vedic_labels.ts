/** Sidereal rashi labels and premium glyph metadata for UI rendering. */
export const RASHI_KEYS = [
  "mesha",
  "vrishabha",
  "mithuna",
  "karka",
  "simha",
  "kanya",
  "tula",
  "vrishchika",
  "dhanu",
  "makara",
  "kumbha",
  "meena",
] as const;

/** Canonical zodiac glyphs. The app wraps these in custom medallions. */
export const RASHI_SYMBOL: Record<string, string> = {
  mesha: "\u2648",
  vrishabha: "\u2649",
  mithuna: "\u264A",
  karka: "\u264B",
  simha: "\u264C",
  kanya: "\u264D",
  tula: "\u264E",
  vrishchika: "\u264F",
  dhanu: "\u2650",
  makara: "\u2651",
  kumbha: "\u2652",
  meena: "\u2653",
};

const RASHI_LABEL: Record<string, Record<"en" | "te" | "hi", string>> = {
  mesha: { en: "Mesha (Aries)", te: "మేషం", hi: "मेष" },
  vrishabha: { en: "Vrishabha (Taurus)", te: "వృషభం", hi: "वृषभ" },
  mithuna: { en: "Mithuna (Gemini)", te: "మిథునం", hi: "मिथुन" },
  karka: { en: "Karka (Cancer)", te: "కర్కాటకం", hi: "कर्क" },
  simha: { en: "Simha (Leo)", te: "సింహం", hi: "सिंह" },
  kanya: { en: "Kanya (Virgo)", te: "కన్య", hi: "कन्या" },
  tula: { en: "Tula (Libra)", te: "తుల", hi: "तुला" },
  vrishchika: { en: "Vrishchika (Scorpio)", te: "వృశ్చికం", hi: "वृश्चिक" },
  dhanu: { en: "Dhanu (Sagittarius)", te: "ధనుస్సు", hi: "धनु" },
  makara: { en: "Makara (Capricorn)", te: "మకరం", hi: "मकर" },
  kumbha: { en: "Kumbha (Aquarius)", te: "కుంభం", hi: "कुम्भ" },
  meena: { en: "Meena (Pisces)", te: "మీనం", hi: "मीन" },
};

export const RASHI_STATS: Record<
  string,
  { luckyNumbers: string; luckyDays: string; goodColors: string }
> = {
  mesha: { luckyNumbers: "1, 9", luckyDays: "Tue, Sun", goodColors: "Red, Gold" },
  vrishabha: {
    luckyNumbers: "2, 7",
    luckyDays: "Fri, Wed",
    goodColors: "White, Pink",
  },
  mithuna: {
    luckyNumbers: "3, 5",
    luckyDays: "Wed, Fri",
    goodColors: "Green, Yellow",
  },
  karka: {
    luckyNumbers: "2, 7",
    luckyDays: "Mon, Fri",
    goodColors: "White, Silver",
  },
  simha: {
    luckyNumbers: "1, 9",
    luckyDays: "Sun, Tue",
    goodColors: "Gold, Orange",
  },
  kanya: {
    luckyNumbers: "3, 5",
    luckyDays: "Wed, Fri",
    goodColors: "Green, Grey",
  },
  tula: {
    luckyNumbers: "2, 7",
    luckyDays: "Fri, Wed",
    goodColors: "White, Blue",
  },
  vrishchika: {
    luckyNumbers: "1, 9",
    luckyDays: "Tue, Sun",
    goodColors: "Red, Maroon",
  },
  dhanu: {
    luckyNumbers: "3, 5, 9",
    luckyDays: "Thu, Sun",
    goodColors: "Yellow, Gold",
  },
  makara: {
    luckyNumbers: "6, 8",
    luckyDays: "Sat, Fri",
    goodColors: "Black, Blue",
  },
  kumbha: {
    luckyNumbers: "6, 8",
    luckyDays: "Sat, Fri",
    goodColors: "Blue, Grey",
  },
  meena: {
    luckyNumbers: "3, 7",
    luckyDays: "Thu, Mon",
    goodColors: "Yellow, White",
  },
};

export type AppLocale = "en" | "te" | "hi";

export type SignDisplay = {
  key: string;
  label: string;
  symbol: string;
  luckyNumbers: string;
  luckyDays: string;
  goodColors: string;
  dateRange?: string;
};

export function normalizeLocale(raw: string | undefined): AppLocale {
  const x = (raw ?? "en").toLowerCase();
  if (x === "te" || x === "hi") return x;
  return "en";
}

export function rashiKeyFromSiderealLon(lonDeg: number): string {
  const idx = Math.min(11, Math.max(0, Math.floor(lonDeg / 30)));
  return RASHI_KEYS[idx] as string;
}

export function rashiDisplay(
  key: string,
  loc: AppLocale,
): SignDisplay {
  const row = RASHI_LABEL[key] ?? RASHI_LABEL.mesha;
  const stats = RASHI_STATS[key] ?? RASHI_STATS.mesha;
  return {
    key,
    label: row[loc] ?? row.en,
    symbol: RASHI_SYMBOL[key] ?? "\u263D",
    ...stats,
  };
}

const WESTERN_SIGN_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

const WESTERN_SIGN_LABEL: Record<string, Record<AppLocale, string>> = {
  aries: { en: "Aries", te: "Aries", hi: "Aries" },
  taurus: { en: "Taurus", te: "Taurus", hi: "Taurus" },
  gemini: { en: "Gemini", te: "Gemini", hi: "Gemini" },
  cancer: { en: "Cancer", te: "Cancer", hi: "Cancer" },
  leo: { en: "Leo", te: "Leo", hi: "Leo" },
  virgo: { en: "Virgo", te: "Virgo", hi: "Virgo" },
  libra: { en: "Libra", te: "Libra", hi: "Libra" },
  scorpio: { en: "Scorpio", te: "Scorpio", hi: "Scorpio" },
  sagittarius: { en: "Sagittarius", te: "Sagittarius", hi: "Sagittarius" },
  capricorn: { en: "Capricorn", te: "Capricorn", hi: "Capricorn" },
  aquarius: { en: "Aquarius", te: "Aquarius", hi: "Aquarius" },
  pisces: { en: "Pisces", te: "Pisces", hi: "Pisces" },
};

const WESTERN_SIGN_DATE_RANGE: Record<string, Record<AppLocale, string>> = {
  aries: { en: "Mar 21 – Apr 19", te: "మార్చి 21 – ఏప్రిల్ 19", hi: "21 मार्च – 19 अप्रैल" },
  taurus: { en: "Apr 20 – May 20", te: "ఏప్రిల్ 20 – మే 20", hi: "20 अप्रैल – 20 मई" },
  gemini: { en: "May 21 – Jun 20", te: "మే 21 – జూన్ 20", hi: "21 मई – 20 जून" },
  cancer: { en: "Jun 21 – Jul 22", te: "జూన్ 21 – జులై 22", hi: "21 जून – 22 जुलाई" },
  leo: { en: "Jul 23 – Aug 22", te: "జులై 23 – ఆగస్టు 22", hi: "23 जुलाई – 22 अगस्त" },
  virgo: { en: "Aug 23 – Sep 22", te: "ఆగస్టు 23 – సెప్టెం 22", hi: "23 अगस्त – 22 सितंबर" },
  libra: { en: "Sep 23 – Oct 22", te: "సెప్టెం 23 – అక్టో 22", hi: "23 सितंबर – 22 अक्टूबर" },
  scorpio: { en: "Oct 23 – Nov 21", te: "అక్టో 23 – నవం 21", hi: "23 अक्टूबर – 21 नवंबर" },
  sagittarius: { en: "Nov 22 – Dec 21", te: "నవం 22 – డిసెం 21", hi: "22 नवंबर – 21 दिसंबर" },
  capricorn: { en: "Dec 22 – Jan 19", te: "డిసెం 22 – జన 19", hi: "22 दिसंबर – 19 जनवरी" },
  aquarius: { en: "Jan 20 – Feb 18", te: "జన 20 – ఫిబ్ర 18", hi: "20 जनवरी – 18 फरवरी" },
  pisces: { en: "Feb 19 – Mar 20", te: "ఫిబ్ర 19 – మార్చి 20", hi: "19 फरवरी – 20 मार्च" },
};

const WESTERN_SIGN_SYMBOL: Record<string, string> = {
  aries: "\u2648",
  taurus: "\u2649",
  gemini: "\u264A",
  cancer: "\u264B",
  leo: "\u264C",
  virgo: "\u264D",
  libra: "\u264E",
  scorpio: "\u264F",
  sagittarius: "\u2650",
  capricorn: "\u2651",
  aquarius: "\u2652",
  pisces: "\u2653",
};

const WEEKDAY_LABEL: Record<string, Record<AppLocale, string>> = {
  Mon: { en: "Monday", te: "సోమవారం", hi: "सोमवार" },
  Tue: { en: "Tuesday", te: "మంగళవారం", hi: "मंगलवार" },
  Wed: { en: "Wednesday", te: "బుధవారం", hi: "बुधवार" },
  Thu: { en: "Thursday", te: "గురువారం", hi: "गुरुवार" },
  Fri: { en: "Friday", te: "శుక్రవారం", hi: "शुक्रवार" },
  Sat: { en: "Saturday", te: "శనివారం", hi: "शनिवार" },
  Sun: { en: "Sunday", te: "ఆదివారం", hi: "रविवार" },
};

const COLOUR_HEX: Record<string, string> = {
  red: "#DC2626",
  gold: "#D4AF37",
  white: "#F5F5F4",
  pink: "#F472B6",
  green: "#2D6A4F",
  yellow: "#EAB308",
  silver: "#9CA3AF",
  grey: "#6B7280",
  gray: "#6B7280",
  blue: "#2563EB",
  orange: "#EA580C",
  maroon: "#7F1D1D",
  black: "#1F2937",
};

const COLOUR_LABEL: Record<string, Record<AppLocale, string>> = {
  red: { en: "Red", te: "ఎరుపు", hi: "लाल" },
  gold: { en: "Gold", te: "బంగారు", hi: "सुनहरा" },
  white: { en: "White", te: "తెలుపు", hi: "सफेद" },
  pink: { en: "Pink", te: "పింక్", hi: "गुलाबी" },
  green: { en: "Green", te: "ఆకుపచ్చ", hi: "हरा" },
  yellow: { en: "Yellow", te: "పసుపు", hi: "पीला" },
  silver: { en: "Silver", te: "వెండి", hi: "चांदी" },
  grey: { en: "Grey", te: "బూడిద", hi: "धूसर" },
  gray: { en: "Grey", te: "బూడిద", hi: "धूसर" },
  blue: { en: "Blue", te: "నీలం", hi: "नीला" },
  orange: { en: "Orange", te: "నారింజ", hi: "नारंगी" },
  maroon: { en: "Maroon", te: "మెరూన్", hi: "मैरून" },
  black: { en: "Black", te: "నలుపు", hi: "काला" },
};

export function parseLuckyNumbers(raw: string): string[] {
  return raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
}

export function luckyDaysLocalized(enDays: string, locale: AppLocale): string[] {
  return enDays.split(",").map((part) => {
    const key = part.trim().split(" ")[0] ?? part.trim();
    const row = WEEKDAY_LABEL[key];
    return row?.[locale] ?? row?.en ?? part.trim();
  }).filter(Boolean);
}

export function luckyColoursLocalized(
  enColors: string,
  locale: AppLocale,
): { key: string; label: string; hex: string }[] {
  return enColors.split(",").map((part) => {
    const key = part.trim().toLowerCase().replace(/\s+/g, "_");
    const simple = key.replace(/_/g, "");
    const labelRow = COLOUR_LABEL[simple] ?? COLOUR_LABEL[key];
    const label = labelRow?.[locale] ?? labelRow?.en ?? part.trim();
    const hex = COLOUR_HEX[simple] ?? COLOUR_HEX[key] ?? "#6B7280";
    return { key: simple || key, label, hex };
  }).filter((c) => c.label.length > 0);
}

export function westernSignDisplayFromTropicalLon(
  lonDeg: number,
  loc: AppLocale,
): SignDisplay {
  const idx = Math.min(11, Math.max(0, Math.floor(lonDeg / 30)));
  const key = WESTERN_SIGN_KEYS[idx] as string;
  const row = WESTERN_SIGN_LABEL[key] ?? WESTERN_SIGN_LABEL.aries;
  const range = WESTERN_SIGN_DATE_RANGE[key];
  return {
    key,
    label: row[loc] ?? row.en,
    symbol: WESTERN_SIGN_SYMBOL[key] ?? "\u263D",
    luckyNumbers: "",
    luckyDays: "",
    goodColors: "",
    dateRange: range?.[loc] ?? range?.en,
  };
}
