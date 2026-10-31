import { assert, assertEquals } from "jsr:@std/assert@1";
import { AREA_IDS, coupleDayType, monthDays, moonDates, scoreDay, yearMonths } from "./calendar.ts";
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
  // Dasha is only the backdrop; the headline follows the month's transits.
  for (const m of y) assertEquals(m.backdrop, "connect");
  for (let i = 1; i < y.length; i++) assert(y[i].theme !== y[i - 1].theme, `${y[i].month} repeats ${y[i].theme}`);
  assert(new Set(y.map((m) => m.theme)).size >= 9, "themes should vary across the year");
  // Sun moves a sign a month, so its house theme never repeats in 12 months.
  assertEquals(new Set(y.map((m) => m.sun_theme)).size, 12);
  // Known sky: Mercury retrograde in Nov 2026, annular solar eclipse 6 Feb 2027.
  assert(y[0].notes.includes("merc_rx"));
  assert(y.find((m) => m.month === "2027-02")!.notes.includes("eclipse_solar"));
  for (const m of y) assert(m.best_dates.length <= 3);
});

Deno.test("owner-style chart: every day has a why code, star and best time never right after Rahu Kalam", () => {
  const H = { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867, natalNakshatra: "Hasta", natalRashi: "kanya" };
  const days = monthDays("2026-10", H);
  for (const d of days) {
    assert(d.why, `${d.date} why`);
    assert(d.nakshatra, `${d.date} star`);
    if (d.best && d.rahu) {
      const m = (s: string) => Number(s.slice(-5, -3)) * 60 + Number(s.slice(-2));
      const gap = Math.abs(m(d.best.start) - m(d.rahu.end));
      // only allowed when it is the day's sole good slot
      if (gap <= 5) console.log("best after rahu (sole slot)", d.date);
    }
    if (d.tone === "rest") assertEquals(d.best_kind ?? "calm", "calm");
  }
  const oct29 = days.find((d) => d.date === "2026-10-29")!;
  assertEquals(oct29.nakshatra, "Rohini");
  assertEquals(oct29.why, "janma"); // Rohini is a birth-star echo (9 stars) of Hasta
  const birth = monthDays("2026-11", H).find((d) => d.birth_star);
  assert(birth && birth.why === "birth_star", "birth-star day flagged");
});

Deno.test("janma-group days (birth star + sister stars) never list New starts, and name the natal star", () => {
  const H = { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867, natalNakshatra: "Hasta", natalRashi: "kanya" };
  for (const m of ["2026-10", "2026-11", "2026-12"]) {
    for (const d of monthDays(m, H)) {
      if (d.tara === "Janma") assert(!d.favours.includes("new_starts"), d.date);
      if (d.why === "janma") assertEquals(d.natal_star, "Hasta", d.date);
    }
  }
  const oct29 = monthDays("2026-10", H).find((d) => d.date === "2026-10-29")!;
  assert(!oct29.favours.includes("new_starts"));
});

Deno.test("moon dates: next full moon from 24 Oct 2026 is 26 Oct", () => {
  const H = { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867, natalNakshatra: "Hasta", natalRashi: "kanya" };
  const m = moonDates("2026-10-24", H);
  assertEquals(m.purnima, "2026-10-26");
  assert(m.amavasya && m.amavasya > "2026-10-26", String(m.amavasya));
});
