// Graha + Lagna positions vs the Swiss Ephemeris (Lahiri, Moshier) for 24 charts.
// Fixtures: grahas_fixtures.json (generated once with the `sweph` npm package).
import { assert } from "jsr:@std/assert@1";
import { GRAHA_KEYS, lagnaSidereal, siderealLon } from "./grahas.ts";

type Fx = { id: string; utc: string; lat: number; lng: number; ref: Record<string, number>; lagna: number };
const fixtures = JSON.parse(await Deno.readTextFile(new URL("./grahas_fixtures.json", import.meta.url))) as Fx[];
const diff = (a: number, b: number) => {
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return d;
};

Deno.test("graha longitudes within 0.2° of Swiss Ephemeris (Lahiri)", () => {
  let worst = 0;
  for (const f of fixtures) {
    for (const k of GRAHA_KEYS) {
      const d = diff(siderealLon(k, new Date(f.utc)), f.ref[k]);
      worst = Math.max(worst, d);
      assert(d < 0.2, `${f.id} ${k}: off by ${d.toFixed(3)}°`);
    }
  }
  console.log(`worst graha error ${worst.toFixed(3)}°`);
});

Deno.test("Lagna within 0.3° of Swiss Ephemeris and same sign", () => {
  let worst = 0;
  for (const f of fixtures) {
    const mine = lagnaSidereal(new Date(f.utc), f.lat, f.lng);
    const d = diff(mine, f.lagna);
    worst = Math.max(worst, d);
    assert(d < 0.3, `${f.id} lagna off by ${d.toFixed(3)}° (${mine.toFixed(2)} vs ${f.lagna.toFixed(2)})`);
  }
  console.log(`worst lagna error ${worst.toFixed(3)}°`);
});
