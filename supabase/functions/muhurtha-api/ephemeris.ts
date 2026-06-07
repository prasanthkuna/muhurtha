/**
 * Moon sidereal longitude (Lahiri) → nakshatra / pada for exact-time charts.
 * Uses astronomy-engine (tropical) + Lahiri ayanamsa; accurate enough for app-scale Vimshottari bands.
 */
import * as Astronomy from "astronomy-engine";
import { nakshatraIndex, NAKSHATRAS } from "./vimshottari.ts";

/** Lahiri ayanamsa (degrees), UT Julian Day. */
export function lahiriAyanamsaDeg(jdUt: number): number {
  const t = (jdUt - 2451545.0) / 36525;
  const a = 22.460148 + 1.3960423 * t + 3.065 / 1e5 * t * t + 8.7 / 1e8 * t * t * t;
  let x = a % 360;
  if (x < 0) x += 360;
  return x;
}

/** Julian day (UT), full precision (fractional day). */
function julianDayUt(utc: Date): number {
  const y = utc.getUTCFullYear();
  const m = utc.getUTCMonth() + 1;
  const d = utc.getUTCDate();
  const h = utc.getUTCHours();
  const min = utc.getUTCMinutes();
  const s = utc.getUTCSeconds() + utc.getUTCMilliseconds() / 1000;
  const dayFraction = (h + min / 60 + s / 3600) / 24;
  let Y = y;
  let M = m;
  if (m <= 2) {
    Y = y - 1;
    M = m + 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) + d + B - 1524.5 + dayFraction;
}

export function moonSiderealLongitudeDeg(utc: Date): number {
  const time = Astronomy.MakeTime(utc);
  const vec = Astronomy.GeoVector(Astronomy.Body.Moon, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  const tropical = ecl.elon;
  const jd = julianDayUt(utc);
  const aya = lahiriAyanamsaDeg(jd);
  let sid = tropical - aya;
  while (sid < 0) sid += 360;
  while (sid >= 360) sid -= 360;
  return sid;
}

export function sunTropicalLongitudeDeg(utc: Date): number {
  const time = Astronomy.MakeTime(utc);
  const vec = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  let lon = ecl.elon;
  while (lon < 0) lon += 360;
  while (lon >= 360) lon -= 360;
  return lon;
}

/** 27 nakshatras × 13°20′; each pada = 3°20′. */
export function nakshatraMetaFromSiderealLon(lonDeg: number): {
  idx: number;
  name: string;
  pada: number;
  withinFraction: number;
} {
  const span = 360 / 27;
  const idx = Math.min(26, Math.max(0, Math.floor(lonDeg / span)));
  const within = lonDeg - idx * span;
  const pada = Math.min(4, Math.floor(within / (span / 4)) + 1);
  return {
    idx,
    name: NAKSHATRAS[idx] as string,
    pada,
    withinFraction: Math.min(0.999999, Math.max(0, within / span)),
  };
}

export function nakshatraPadaFromSiderealLon(lonDeg: number): {
  idx: number;
  name: string;
  pada: number;
} {
  const meta = nakshatraMetaFromSiderealLon(lonDeg);
  return { idx: meta.idx, name: meta.name, pada: meta.pada };
}

/** User-provided nakshatra wins; else [moonLonDeg] from exact birth (full_chart). */
export function siderealMetaFromNameOrMoon(
  janmaName: string | null,
  padaStored: number | null,
  moonLonDeg: number | null,
): { idx: number; name: string; pada: number; withinFraction?: number } | null {
  const fromUser = nakshatraIndex(janmaName);
  if (fromUser != null) {
    const pada = Math.min(4, Math.max(1, padaStored ?? 2));
    return { idx: fromUser, name: NAKSHATRAS[fromUser] as string, pada };
  }
  if (moonLonDeg === null) return null;
  return nakshatraMetaFromSiderealLon(moonLonDeg);
}
