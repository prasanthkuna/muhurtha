import { assert, assertEquals } from "jsr:@std/assert@1";
import { AREA_IDS, coupleDayType, monthDays, scoreDay, yearMonths } from "./calendar.ts";
import { quickDayFacts } from "./panchanga.ts";

const P = { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867, natalNakshatra: "Rohini", natalRashi: "vrishabha" };

Deno.test("a month has one card per date with valid codes, deterministic", () => {
  const t0 = performance.now();
  const a = monthDays("2026-11", P);
  const ms = performance.now() - t0;
  const b = monthDays("2026-11", P);
  assertEquals(a.length, 30);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  for (const d of a) {
    assert(d.favours.length >= 1 && d.favours.length <= 2, d.date);
    for (const f of d.favours) assert((AREA_IDS as readonly string[]).includes(f));
    assert(!d.avoid || !d.favours.includes(d.avoid));
    if (d.chandrashtama) assertEquals(d.tone, "rest");
  }
  console.log(`month computed in ${ms.toFixed(1)} ms; tones`, JSON.stringify(a.reduce((m, d) => ({ ...m, [d.tone]: (m[d.tone] ?? 0) + 1 }), {} as Record<string, number>)));
});

Deno.test("Chandrashtama days favour rest and avoid big starts", () => {
  const days = monthDays("2026-11", P).filter((d) => d.chandrashtama);
  assert(days.length >= 2);
  for (const d of days) {
    assertEquals(d.favours[0], "rest");
    assert(d.scores.new_starts < 1.5);
  }
});

Deno.test("couple day types are symmetric in kind", () => {
  const a = quickDayFacts({ date: "2026-11-05", zone: P.zone, latitude: P.lat, longitude: P.lng, natalNakshatra: "Rohini", natalRashi: "vrishabha" })!;
  const b = quickDayFacts({ date: "2026-11-05", zone: P.zone, latitude: P.lat, longitude: P.lng, natalNakshatra: "Magha", natalRashi: "simha" })!;
  const x = coupleDayType(a, b), y = coupleDayType(b, a);
  const flip: Record<string, string> = { support_a: "support_b", support_b: "support_a" };
  assertEquals(flip[x] ?? x, y === "talk" || x === "talk" ? (flip[x] ?? x) : y);
  assert(scoreDay(a).date === "2026-11-05");
});

Deno.test("year view: 12 months with themes", () => {
  const t0 = performance.now();
  const y = yearMonths("2026-11", P, () => ({ ad: "Venus" }));
  console.log(`year computed in ${(performance.now() - t0).toFixed(0)} ms`);
  assertEquals(y.length, 12);
  assertEquals(y[0].theme, "connect");
  for (const m of y) assert(m.best_dates.length <= 3);
});
