/**
 * Sidereal (Lahiri) positions of the nine grahas + Lagna, for Bond (Kuja dosha, love styles)
 * and the Tuning Calendar (slow transits). astronomy-engine (geocentric, apparent, of-date
 * ecliptic) + the app's Lahiri ayanamsa; Rahu = mean lunar node, Ketu = Rahu + 180°.
 * Lagna needs an exact birth time; callers must label anything Lagna-based as approximate
 * (or hide it) when the time is a bucket only.
 */
import * as Astronomy from "astronomy-engine";

export const GRAHA_KEYS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
export type GrahaKey = (typeof GRAHA_KEYS)[number];

export type GrahaPos = { lon: number; sign: number; deg: number; retro: boolean };
export type NatalGrahas = {
  at: string;
  grahas: Record<GrahaKey, GrahaPos>;
  lagna: GrahaPos | null;
  /** true when Lagna and houses come from an exact birth time */
  exact: boolean;
};

const norm = (d: number) => ((d % 360) + 360) % 360;

/**
 * Lahiri (Chitrapaksha) ayanamsa, fitted to the Swiss Ephemeris over 1900-2100 (error < 0.01").
 * NOTE: ephemeris.ts' older lahiriAyanamsaDeg uses the 1900 constant with a J2000 epoch and
 * reads about 1.4° low; it is kept as is for the existing readings until that is migrated.
 */
export function lahiriTrueDeg(jdUt: number): number {
  const t = (jdUt - 2451545.0) / 36525;
  return 23.857092351781226 + 1.3968879594616237 * t + 0.00030709079239774084 * t * t;
}

function julianDayUt(utc: Date): number {
  return utc.getTime() / 86400000 + 2440587.5;
}

const BODY: Partial<Record<GrahaKey, Astronomy.Body>> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus: Astronomy.Body.Venus,
  Saturn: Astronomy.Body.Saturn,
};

function tropicalLon(body: Astronomy.Body, utc: Date): number {
  const time = Astronomy.MakeTime(utc);
  const vec = Astronomy.GeoVector(body, time, true);
  return norm(Astronomy.Ecliptic(vec).elon);
}

/** Mean lunar node (Meeus 47.7), tropical, of date. */
export function meanNodeTropical(utc: Date): number {
  const T = (julianDayUt(utc) - 2451545.0) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000);
}

function pos(lon: number, retro = false): GrahaPos {
  const l = norm(lon);
  return { lon: Number(l.toFixed(4)), sign: Math.floor(l / 30), deg: Number((l % 30).toFixed(2)), retro };
}

export function siderealLon(key: GrahaKey, utc: Date): number {
  const aya = lahiriTrueDeg(julianDayUt(utc));
  if (key === "Rahu") return norm(meanNodeTropical(utc) - aya);
  if (key === "Ketu") return norm(meanNodeTropical(utc) + 180 - aya);
  return norm(tropicalLon(BODY[key]!, utc) - aya);
}

/** Sidereal ascendant for an instant and place (Lahiri). */
export function lagnaSidereal(utc: Date, latDeg: number, lngDeg: number): number {
  const time = Astronomy.MakeTime(utc);
  const gast = Astronomy.SiderealTime(time); // hours
  const ramc = norm(gast * 15 + lngDeg) * Math.PI / 180;
  const T = (julianDayUt(utc) - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const phi = latDeg * Math.PI / 180;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
  const tropical = norm(asc * 180 / Math.PI);
  return norm(tropical - lahiriTrueDeg(julianDayUt(utc)));
}

function isRetro(key: GrahaKey, utc: Date): boolean {
  if (key === "Sun" || key === "Moon") return false;
  if (key === "Rahu" || key === "Ketu") return true;
  const a = siderealLon(key, new Date(utc.getTime() - 12 * 3600_000));
  const b = siderealLon(key, new Date(utc.getTime() + 12 * 3600_000));
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

export function grahasAt(utc: Date): Record<GrahaKey, GrahaPos> {
  const out = {} as Record<GrahaKey, GrahaPos>;
  for (const k of GRAHA_KEYS) out[k] = pos(siderealLon(k, utc), isRetro(k, utc));
  return out;
}

/**
 * Natal positions. `utc` is the exact birth instant when known; otherwise pass local noon of
 * the birth date and exact=false (slow grahas are fine; the Moon may be off by up to ~6°).
 */
export function natalGrahas(utc: Date, lat: number | null, lng: number | null, exact: boolean): NatalGrahas {
  const grahas = grahasAt(utc);
  const lagna = exact && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? pos(lagnaSidereal(utc, lat, lng))
    : null;
  return { at: utc.toISOString(), grahas, lagna, exact: Boolean(lagna) };
}

/** Whole-sign house of `sign` counted from `fromSign` (1..12). */
export function houseFrom(fromSign: number, sign: number): number {
  return ((sign - fromSign + 12) % 12) + 1;
}
