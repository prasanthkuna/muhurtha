import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import { lahiriAyanamsaDeg, legacyLahiriAyanamsaDeg, siderealMetaFromNameOrMoon, LEGACY_AYANAMSA_GAP_DEG } from "./ephemeris.ts";
const jd = (d: Date) => d.getTime() / 86400000 + 2440587.5;

Deno.test("Lahiri ayanamsa matches the Chitrapaksha reference", () => {
  // J2000.0 reference value 23°51'25" ≈ 23.857°
  assertAlmostEquals(lahiriAyanamsaDeg(jd(new Date(Date.UTC(2000, 0, 1, 12)))), 23.857, 0.01);
  // 1 Jan 2024 ≈ 24°11' (Indian Ephemeris)
  assertAlmostEquals(lahiriAyanamsaDeg(jd(new Date(Date.UTC(2024, 0, 1)))), 24.19, 0.03);
  // 1 Jan 1990 ≈ 23°43'
  assertAlmostEquals(lahiriAyanamsaDeg(jd(new Date(Date.UTC(1990, 0, 1)))), 23.72, 0.03);
});

Deno.test("old formula was ~1.397° low (the bug this fixes)", () => {
  const d = jd(new Date(Date.UTC(1995, 5, 1)));
  assertAlmostEquals(lahiriAyanamsaDeg(d) - legacyLahiriAyanamsaDeg(d), LEGACY_AYANAMSA_GAP_DEG, 0.01);
});

Deno.test("stored nakshatra cached with the old maths no longer overrides the corrected Moon", () => {
  // Moon at 160.5° sidereal (corrected) = Hasta? no: 160.5/13.333 = idx 12 (Hasta), pada 1.
  const moon = 160.5;
  const fresh = siderealMetaFromNameOrMoon("Hasta", 3, moon);
  assertEquals(fresh?.idx, 12);
  assert(fresh && fresh.pada !== 3 || moon + LEGACY_AYANAMSA_GAP_DEG > 165, "pada comes from the corrected Moon");
  // A user-entered star that disagrees with both maths is respected.
  const user = siderealMetaFromNameOrMoon("Rohini", 2, moon);
  assertEquals(user?.idx, 3);
  assertEquals(user?.pada, 2);
});
