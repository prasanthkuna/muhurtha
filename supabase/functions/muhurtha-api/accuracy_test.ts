/** Ephemeris accuracy against Swiss Ephemeris (40 charts, 1940-2024, 14 cities incl. high latitude). */
import { assert, assertEquals } from "jsr:@std/assert@1";
import fx from "./swe_fixtures.json" with { type: "json" };
import { GRAHA_KEYS, lahiriTrueDeg, natalGrahas } from "./grahas.ts";
import { moonSiderealLongitudeDeg, nakshatraMetaFromSiderealLon } from "./ephemeris.ts";

const diffSec = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) * 3600;
const NAK = 360 / 27;

Deno.test("accuracy: ayanamsa, Moon, Lagna, grahas vs Swiss Ephemeris", () => {
  let maxMoon = 0, maxAsc = 0, maxPl = 0;
  for (const c of fx.charts) {
    const d = new Date(c.utc);
    const jd = d.getTime() / 86400000 + 2440587.5;
    assert(diffSec(lahiriTrueDeg(jd), c.aya) < 0.5, `${c.id} ayanamsa`);
    const moon = moonSiderealLongitudeDeg(d);
    maxMoon = Math.max(maxMoon, diffSec(moon, c.g.Moon));
    const n = natalGrahas(d, c.lat, c.lng, true);
    maxAsc = Math.max(maxAsc, diffSec(n.lagna!.lon, c.asc));
    for (const k of GRAHA_KEYS) {
      if (k === "Ketu" || k === "Moon") continue;
      const ref = (c.g as Record<string, number>)[k];
      maxPl = Math.max(maxPl, diffSec(n.grahas[k].lon, ref));
      assertEquals(n.grahas[k].sign, Math.floor(ref / 30), `${c.id} ${k} sign`);
    }
    for (const [k, r] of Object.entries(c.retro)) assertEquals(n.grahas[k as keyof typeof n.grahas].retro, r, `${c.id} ${k} retro`);
    // Same nakshatra and pada, and the Vimshottari balance within half a day.
    const a = nakshatraMetaFromSiderealLon(moon), b = nakshatraMetaFromSiderealLon(c.g.Moon);
    assertEquals([a.idx, a.pada], [b.idx, b.pada], `${c.id} nakshatra/pada`);
    const years = [7, 20, 6, 10, 7, 18, 16, 19, 17][b.idx % 9];
    assert(Math.abs((moon - c.g.Moon) / NAK * years * 365.2425) < 0.5, `${c.id} dasha balance`);
    assertEquals(n.lagna!.sign, Math.floor(c.asc / 30), `${c.id} lagna sign`);
  }
  assert(maxMoon < 5, `Moon max ${maxMoon.toFixed(2)}"`);
  assert(maxAsc < 2, `Lagna max ${maxAsc.toFixed(2)}"`);
  assert(maxPl < 20, `grahas max ${maxPl.toFixed(2)}"`);
});
