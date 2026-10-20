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
