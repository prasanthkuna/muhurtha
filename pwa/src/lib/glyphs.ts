/**
 * Muhūrta glyph set — one source of truth for UI icons, notification art and share cards.
 * 24×24 grid, drawn as open strokes (1.75 at 24px, round caps/joins) so the same path data
 * renders through <svg> in React and through Path2D on the share-card canvas.
 */
export const GLYPHS = {
  // Rashi (sidereal signs)
  aries: "M12 20V10 M12 10C12 5 8.5 3 6.5 4.2C4.3 5.6 4.8 9 7.2 9.5 M12 10C12 5 15.5 3 17.5 4.2C19.7 5.6 19.2 9 16.8 9.5",
  taurus: "M7 16a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M4.5 4c1.5 4 4.2 6.2 7.5 6.2S18 8 19.5 4",
  gemini: "M5 4.5c4 1.5 10 1.5 14 0 M5 19.5c4-1.5 10-1.5 14 0 M9 5.6v12.8 M15 5.6v12.8",
  cancer: "M4.5 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M7 6.5C9.5 4 15.5 4 19 7 M14.5 15a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M17 17.5C14.5 20 8.5 20 5 17",
  leo: "M5 15a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M11 15C11 11.5 8 10 8 7a4 4 0 0 1 8 0c0 3.5-3 6.5-3 10a3 3 0 0 0 6 0",
  virgo: "M4 6v12 M4 8.5c0-2.7 4.5-2.7 4.5 0V18 M8.5 8.5c0-2.7 4.5-2.7 4.5 0v7.5c0 2.5 2 4 4.5 4 M13 12.5c1.8-3 6-2.3 6 .8 0 2.6-2.7 4.6-6.5 6.2",
  libra: "M4 20h16 M4 16h4.6a3.6 3.6 0 1 1 6.8 0H20",
  scorpio: "M4 6v12 M4 8.5c0-2.7 4.5-2.7 4.5 0V18 M8.5 8.5c0-2.7 4.5-2.7 4.5 0v8c0 1.9 1.3 3 3 3h3.5 M16.8 16.6l2.7 2.9-2.7 2.9",
  sagittarius: "M5 19L19 5 M12.5 5H19v6.5 M7.5 11.5l5 5",
  capricorn: "M4 6.5c2 0 3 1.8 3 4.5V18 M7 10.5c0-3 4.2-3.8 5-.8l1.2 7.3c.5 3 5 3.2 5.8.3.8-2.8-1.6-4.9-3.8-3.4-1.8 1.3-3 3.6-5.7 4.1",
  aquarius: "M3 10l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5 M3 16.5l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5",
  pisces: "M5.5 4c3.8 4 3.8 12 0 16 M18.5 4c-3.8 4-3.8 12 0 16 M6.5 12h11",
  // Graha
  surya: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2.5v2.2 M12 19.3v2.2 M2.5 12h2.2 M19.3 12h2.2 M5.3 5.3l1.5 1.5 M17.2 17.2l1.5 1.5 M5.3 18.7l1.5-1.5 M17.2 6.8l1.5-1.5",
  chandra: "M15.5 3.8A8.3 8.3 0 1 0 20.2 17 6.6 6.6 0 0 1 15.5 3.8Z",
  mangala: "M5 14.5a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M13.6 10.9L19.5 5 M14.5 5h5v5",
  budha: "M8.5 3c0 2 1.6 3.4 3.5 3.4S15.5 5 15.5 3 M8 10.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 14.5V21 M9 18h6",
  guru: "M5 6.5c2.6-2.2 6-.6 5.3 2.9C9.7 12.6 6.8 15.7 5 18h14 M15.5 4v17",
  shukra: "M7 9a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 14v7 M9 18h6",
  shani: "M8 3v12 M5 6h6 M8 11.5c1.6-3 7-3.2 7 .8 0 3.1-3 4.1-3 6.7 0 1.4.9 2 2 2",
  rahu: "M7 15.5V11a5 5 0 0 1 10 0v4.5 M5 17.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 17.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ketu: "M7 8.5V13a5 5 0 0 0 10 0V8.5 M5 6.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 6.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  // Day & window
  goodWindow: "M6 21V10.5a6 6 0 0 1 12 0V21 M3 21h18 M9.5 13a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M12 6.5v1.4",
  rahuKalam: "M4 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M10.5 7.2a6 6 0 0 1 9.5 6.6 6 6 0 0 1-6.8 4.1",
  yamagandam: "M7 3h10 M7 21h10 M8 3c0 5 8 4.5 8 9s-8 4-8 9 M16 3c0 5-8 4.5-8 9s8 4 8 9",
  gulika: "M12 12c-2-3-7.5-3-7.5 0s5.5 3 7.5 0 7.5-3 7.5 0-5.5 3-7.5 0Z",
  sunrise: "M3 18h18 M7 18a5 5 0 0 1 10 0 M12 4v4 M9.5 6.5L12 4l2.5 2.5 M4.6 11.6l1.5 1.1 M19.4 11.6l-1.5 1.1",
  brief: "M6 3.5h9l3 3V20.5H6Z M15 3.5v3h3 M9 11h6 M9 14.5h6 M9 18h3.5",
  week: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4 M8 14h.01 M12 14h.01 M16 14h.01 M8 17h.01 M12 17h.01",
  // Ceremony & life
  naming: "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7 M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2 M9.5 9h5 M9.5 12h5 M9.5 15h3",
  firstFood: "M4 12h16a8 8 0 0 1-16 0Z M8.5 12c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2 M14 5.5l2.5-2.5",
  haircut: "M3.5 7a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M3.5 17a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M8 8.6L20 18 M8 15.4L20 6",
  school: "M4 5h16v11H4Z M8 20l4-4 4 4 M8 9h4 M8 12h7",
  doctor: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z M12 8v8 M8 12h8",
  kalash: "M8 5.5h8 M9.2 5.5C5.5 8.3 4.7 13 7 17h10c2.3-4 1.5-8.7-2.2-11.5 M7 21h10 M7 17l-.5 4 M17 17l.5 4 M10 3.2c1 .9 3 .9 4 0",
  garland: "M4 5c2 8.5 14 8.5 16 0 M12 13.4v3.6 M10.5 18.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0 M6.6 9.8h.01 M17.4 9.8h.01 M9 12h.01 M15 12h.01",
  home: "M4 11l8-7 8 7 M6 9.5V20h12V9.5 M10 20v-5h4v5",
  travel: "M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10Z M10 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  work: "M4 8h16v11H4Z M9 8V5.5h6V8 M4 13h16",
  cake: "M5 12h14v8H5Z M5 15.5c2.3 1.4 4.7 1.4 7 0s4.7-1.4 7 0 M12 12V9 M12 6.5a1 1 0 0 0 1-1c0-.8-1-2-1-2s-1 1.2-1 2a1 1 0 0 0 1 1Z",
  chapter: "M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1Z M12 6v14",
  findDate: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4 M9 15l2 2 4-4",
  ask: "M4 5h16v10.5H10l-6 4.5Z M9 9h6 M9 12h4",
  decode: "M12 3l2.1 5.4L19.5 9l-4.2 3.6 1.4 5.6L12 15.2l-4.7 3 1.4-5.6L4.5 9l5.4-.6Z",
  friend: "M5 20c0-3.6 3-6 7-6s7 2.4 7 6 M8.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
  child: "M7.5 20c0-2.7 2-4.5 4.5-4.5s4.5 1.8 4.5 4.5 M9.5 10.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M12 8c0-2 1.2-3.5 3-4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z M10 20.5a2 2 0 0 0 4 0",
  share: "M12 3v12 M7.5 7.5L12 3l4.5 4.5 M5 12v8h14v-8",
  whatsapp: "M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8Z M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1.2-.5-2.2-1.5-2.7-2.7l.8-1-1-2Z",
  download: "M12 3v12 M7.5 10.5L12 15l4.5-4.5 M5 20h14",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  install: "M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z M12 7v7 M9.5 11.5L12 14l2.5-2.5 M10.5 18.5h3",
  bond: "M9 15.5a5.5 5.5 0 1 1 0-11a5.5 5.5 0 0 1 0 11Z M15 19.5a5.5 5.5 0 1 1 0-11a5.5 5.5 0 0 1 0 11Z",
  heart: "M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z",
  lotus: "M12 19c-3.5 0-7-2-8-5 3-1 6 0 8 2.5 2-2.5 5-3.5 8-2.5-1 3-4.5 5-8 5Z M12 16.5C10 14 10 9 12 5c2 4 2 9 0 11.5Z M8.3 15.1C7.3 12.6 7.6 10 9 8 M15.7 15.1c1-2.5.7-5.1-.7-7.1",
} as const;

export type GlyphName = keyof typeof GLYPHS;

export const RASHI_GLYPHS: GlyphName[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

export const GRAHA_GLYPHS: Record<string, GlyphName> = {
  sun: "surya", surya: "surya", moon: "chandra", chandra: "chandra",
  mars: "mangala", mangala: "mangala", mercury: "budha", budha: "budha",
  jupiter: "guru", guru: "guru", venus: "shukra", shukra: "shukra",
  saturn: "shani", shani: "shani", rahu: "rahu", ketu: "ketu",
};

/** Purpose / ceremony → glyph, falling back to the good-window arch. */
export function purposeGlyph(purpose: string | null | undefined): GlyphName {
  const p = (purpose ?? "").toLowerCase();
  if (p.includes("naming")) return "naming";
  if (p.includes("food") || p.includes("annaprashan")) return "firstFood";
  if (p.includes("hair") || p.includes("mundan")) return "haircut";
  if (p.includes("school") || p.includes("study") || p.includes("exam")) return "school";
  if (p.includes("doctor") || p.includes("surgery") || p.includes("health")) return "doctor";
  if (p.includes("marriage") || p.includes("wedding") || p.includes("engage")) return "garland";
  if (p.includes("house") || p.includes("griha") || p.includes("property") || p.includes("home")) return "home";
  if (p.includes("travel") || p.includes("journey")) return "travel";
  if (p.includes("job") || p.includes("business") || p.includes("work") || p.includes("interview")) return "work";
  if (p.includes("vehicle") || p.includes("puja") || p.includes("pooja")) return "kalash";
  return "goodWindow";
}

/** Graha name (lord / dasha) → glyph. */
export function grahaGlyph(name: string | null | undefined): GlyphName {
  const key = (name ?? "").toLowerCase().trim();
  return GRAHA_GLYPHS[key] ?? "chandra";
}
