/**
 * Vimshottari graha — canonical astronomical/astrological Unicode (same family as ♈–♓).
 * Matches what users see in mainstream astrology apps; Flutter Life cards use lord names only.
 */

export const GRAHA_KEYS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

export type GrahaKey = (typeof GRAHA_KEYS)[number] | "unknown";

/** Popular symbol set: Sun/Moon/planets + lunar nodes for Rahu/Ketu. */
export const GRAHA_SYMBOL: Record<GrahaKey, string> = {
  Sun: "\u2609",
  Moon: "\u263D",
  Mars: "\u2642",
  Mercury: "\u263F",
  Jupiter: "\u2643",
  Venus: "\u2640",
  Saturn: "\u2644",
  Rahu: "\u260A",
  Ketu: "\u260B",
  unknown: "\u263D",
};

export function normalizeGraha(lord?: string | null): GrahaKey {
  if (!lord) return "unknown";
  const s = lord.trim().toLowerCase();
  if (s.includes("sun") || s.includes("surya")) return "Sun";
  if (s.includes("moon") || s.includes("chandra")) return "Moon";
  if (s.includes("mars") || s.includes("mangal") || s.includes("kuja")) return "Mars";
  if (s.includes("mercury") || s.includes("budh")) return "Mercury";
  if (s.includes("jupiter") || s.includes("guru")) return "Jupiter";
  if (s.includes("venus") || s.includes("shukra")) return "Venus";
  if (s.includes("saturn") || s.includes("shani")) return "Saturn";
  if (s.includes("rahu")) return "Rahu";
  if (s.includes("ketu")) return "Ketu";
  return "unknown";
}

export function grahaSymbol(lord?: string | null): string {
  return GRAHA_SYMBOL[normalizeGraha(lord)];
}

const GRAHA_NAME: Record<"te" | "hi", Record<Exclude<GrahaKey, "unknown">, string>> = {
  te: {
    Sun: "సూర్యుడు",
    Moon: "చంద్రుడు",
    Mars: "కుజుడు",
    Mercury: "బుధుడు",
    Jupiter: "గురువు",
    Venus: "శుక్రుడు",
    Saturn: "శని",
    Rahu: "రాహువు",
    Ketu: "కేతువు",
  },
  hi: {
    Sun: "सूर्य",
    Moon: "चंद्र",
    Mars: "मंगल",
    Mercury: "बुध",
    Jupiter: "गुरु",
    Venus: "शुक्र",
    Saturn: "शनि",
    Rahu: "राहु",
    Ketu: "केतु",
  },
};

/** Display name for a dasha lord in the reader's language (engine sends English keys). */
export function grahaName(lord: string | null | undefined, locale: string): string {
  if (!lord) return "";
  const key = normalizeGraha(lord);
  if (key === "unknown" || (locale !== "te" && locale !== "hi")) return lord;
  return GRAHA_NAME[locale][key];
}
