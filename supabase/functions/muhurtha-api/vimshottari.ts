export type MdSegment = {
  start: Date;
  end: Date;
  lord: string;
};

/** Antardasha (bhukti) nested inside one mahadasha slice. */
export type AdSegment = {
  mdLord: string;
  adLord: string;
  start: Date;
  end: Date;
};

const ORDER = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
] as const;

export const MAHADASHA_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export function nakshatraIndex(name: string | null): number | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  const i = NAKSHATRAS.findIndex((x) => x.toLowerCase() === n);
  return i >= 0 ? i : null;
}

function addYears(d: Date, years: number): Date {
  return new Date(d.getTime() + years * 365.2425 * 24 * 60 * 60 * 1000);
}

/** Vimshottari mahadasha sequence from birth; first balance uses pada midpoint within nakshatra. */
export function vimshottariMahadashas(
  birthDate: Date,
  nakshatraIdx: number,
  pada: number | null,
  fractionThroughNakshatra: number | null = null,
): MdSegment[] {
  const padaN = Math.min(4, Math.max(1, pada ?? 2));
  const thruNak = fractionThroughNakshatra != null
    ? Math.min(0.999999, Math.max(0, fractionThroughNakshatra))
    : (padaN - 0.5) / 4;
  let lordIdx = nakshatraIdx % 9;
  let cursor = new Date(birthDate.getTime());
  const segments: MdSegment[] = [];
  let guard = 0;
  const endLimit = birthDate.getTime() +
    120 * 365.2425 * 24 * 60 * 60 * 1000;
  while (guard < 200 && cursor.getTime() < endLimit) {
    guard++;
    const lord = ORDER[lordIdx] as string;
    const fullYears = MAHADASHA_YEARS[lord];
    const sliceYears = segments.length === 0
      ? fullYears * (1 - thruNak)
      : fullYears;
    const end = addYears(cursor, sliceYears);
    segments.push({ start: new Date(cursor.getTime()), end, lord });
    cursor = end;
    lordIdx = (lordIdx + 1) % 9;
  }
  return segments;
}

/** Nine antardashas inside one mahadasha; lengths proportional to Vimshottari year fractions (÷120). */
export function antardashasInMahadasha(md: MdSegment): AdSegment[] {
  const mdLordIdx = ORDER.findIndex((x) => x === md.lord);
  if (mdLordIdx < 0) throw new Error(`Unknown mahadasha lord: ${md.lord}`);
  const durationMs = md.end.getTime() - md.start.getTime();
  const out: AdSegment[] = [];
  let cursor = md.start.getTime();
  for (let k = 0; k < 9; k++) {
    const adLord = ORDER[(mdLordIdx + k) % 9] as string;
    const frac = MAHADASHA_YEARS[adLord] / 120;
    const adMs = durationMs * frac;
    let end = cursor + adMs;
    if (k === 8) end = md.end.getTime();
    out.push({
      mdLord: md.lord,
      adLord,
      start: new Date(cursor),
      end: new Date(end),
    });
    cursor = end;
  }
  return out;
}

export function allAntardashasFromMahadashas(mds: MdSegment[]): AdSegment[] {
  const out: AdSegment[] = [];
  for (const md of mds) out.push(...antardashasInMahadasha(md));
  return out;
}

/**
 * Antardashas overlapping [now - lookbackYears, now], optionally clipped to that window.
 * Omits segments entirely outside the window.
 */
export function recentAntardashasClipped(
  ads: AdSegment[],
  now: Date,
  lookbackYears: number,
): AdSegment[] {
  const yearMs = 365.2425 * 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() - lookbackYears * yearMs);
  const windowEnd = now;
  const clipped: AdSegment[] = [];
  for (const a of ads) {
    const s = Math.max(a.start.getTime(), windowStart.getTime());
    const e = Math.min(a.end.getTime(), windowEnd.getTime());
    if (s >= e) continue;
    clipped.push({
      mdLord: a.mdLord,
      adLord: a.adLord,
      start: new Date(s),
      end: new Date(e),
    });
  }
  return clipped.sort((x, y) => x.start.getTime() - y.start.getTime());
}

export function segmentAt(segments: MdSegment[], at: Date): MdSegment | null {
  const t = at.getTime();
  for (const s of segments) {
    if (t >= s.start.getTime() && t < s.end.getTime()) return s;
  }
  return null;
}

export function segmentAtAntardasha(ads: AdSegment[], at: Date): AdSegment | null {
  const t = at.getTime();
  for (const s of ads) {
    if (t >= s.start.getTime() && t < s.end.getTime()) return s;
  }
  return null;
}

/** Mahadasha + antardasha rulers active at [at]. */
export function vimshottariLordsAt(
  mahadashas: MdSegment[],
  at: Date,
): { mdLord: string; adLord: string } | null {
  const md = segmentAt(mahadashas, at);
  if (!md) return null;
  const ads = antardashasInMahadasha(md);
  const ad = segmentAtAntardasha(ads, at);
  if (!ad) return { mdLord: md.lord, adLord: md.lord };
  return { mdLord: md.lord, adLord: ad.adLord };
}

export function recentMahadashas(
  segments: MdSegment[],
  now: Date,
  lookbackYears: number,
  max: number,
): MdSegment[] {
  const from = now.getTime() - lookbackYears * 365.2425 * 24 * 60 * 60 * 1000;
  const filtered = segments.filter(
    (s) => s.end.getTime() > from && s.start.getTime() < now.getTime(),
  );
  return filtered.slice(-max);
}

export function journeyMahadashas(
  segments: MdSegment[],
  now: Date,
  cap: number,
): MdSegment[] {
  const filtered = segments.filter((s) => s.start.getTime() < now.getTime());
  if (filtered.length <= cap) return filtered;
  return filtered.slice(-cap);
}
