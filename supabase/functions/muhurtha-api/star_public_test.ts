import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { panchangToday, STAR_LINES, starTeaser } from "./star_public.ts";

Deno.test("star lines: 27 per locale, non-empty", () => {
  for (const l of ["en", "te", "hi"] as const) {
    assertEquals(STAR_LINES[l].length, 27);
    assert(STAR_LINES[l].every((x) => x.trim().length > 10));
  }
});

Deno.test("star teaser: exact time gives pada, rough time is approximate; localized labels", () => {
  const a = starTeaser({ date_of_birth: "1990-01-01", time: "06:30", locale: "en" });
  assertEquals(a.approximate, false);
  assert(a.pada !== null);
  assert(a.dasha_end_year && a.dasha_end_year >= new Date().getUTCFullYear());
  const b = starTeaser({ date_of_birth: "1990-01-01", time_bucket: "morning", locale: "te" });
  assertEquals(b.approximate, true);
  assertEquals(b.pada, null);
  assert(/[\u0C00-\u0C7F]/.test(b.nakshatra_label));
  assertEquals(b.line, STAR_LINES.te[b.nak_index]);
});

Deno.test("star teaser rejects bad or future dates", () => {
  assertThrows(() => starTeaser({ date_of_birth: "nope" }));
  assertThrows(() => starTeaser({ date_of_birth: "2999-01-01" }));
});

Deno.test("today's panchang has tithi, star and rahu kalam", () => {
  const p = panchangToday({});
  assert(/^\d{4}-\d{2}-\d{2}$/.test(p.date));
  assert(p.tithi.length > 3 && p.nakshatra.length > 2);
  assert(p.rahu && /^\d{2}:\d{2}$/.test(p.rahu.start));
});
