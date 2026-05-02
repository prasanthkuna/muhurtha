/** Sidereal rāśi (12×30°). Labels + shareable glyph for UI. */
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

/** Decorative moon-adjacent emoji per sign (share-friendly, not doctrinal). */
export const RASHI_SYMBOL: Record<string, string> = {
  mesha: "🐏",
  vrishabha: "🐂",
  mithuna: "✦",
  karka: "🦀",
  simha: "🦁",
  kanya: "🌾",
  tula: "⚖",
  vrishchika: "✶",
  dhanu: "🏹",
  makara: "🐐",
  kumbha: "🏺",
  meena: "🐟",
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

export type AppLocale = "en" | "te" | "hi";

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
): { key: string; label: string; symbol: string } {
  const row = RASHI_LABEL[key] ?? RASHI_LABEL.mesha;
  return {
    key,
    label: row[loc] ?? row.en,
    symbol: RASHI_SYMBOL[key] ?? "☽",
  };
}
