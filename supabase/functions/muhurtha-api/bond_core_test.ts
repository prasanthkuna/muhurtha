import { assert, assertEquals } from "jsr:@std/assert@1";
import { type BondPerson, matchFacts, matchSchema, monthFacts, monthSchema, placeFor, validateBond } from "./bond_core.ts";
import { natalGrahas } from "./grahas.ts";
import { starFromLon } from "./koota.ts";
import { moonSiderealLongitudeDeg } from "./ephemeris.ts";

function person(name: string, iso: string, exact: boolean): BondPerson {
  const utc = new Date(iso);
  const star = starFromLon(moonSiderealLongitudeDeg(utc));
  return { name, star, starApprox: !exact, natal: natalGrahas(utc, 17.385, 78.4867, exact), place: placeFor(star, { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867 }) };
}
const A = person("Ravi", "1992-03-14T04:10:00Z", true);
const B = person("Divya", "1994-08-02T06:30:00Z", false);

Deno.test("match facts: swap keeps the total; approximate flag carried", () => {
  const ab = matchFacts(A, B, "en"), ba = matchFacts(B, A, "en");
  assertEquals(ab.total, ba.total);
  assert(ab.approximate);
  assertEquals(ab.kootas.length, 8);
  assertEquals(ab.kuja.b.approximate, true);
  const s = JSON.stringify(matchSchema());
  assert(s.includes("graha_maitri"));
});

Deno.test("month facts: day types, key days and weeks", () => {
  const t0 = performance.now();
  const f = monthFacts(A, B, "2026-11", "te", "good");
  console.log(`month facts ${(performance.now() - t0).toFixed(0)} ms`, JSON.stringify(f.counts), "key", f.key_days.length, "notes", JSON.stringify(f.notes));
  assertEquals(f.days.length, 30);
  assert(f.key_days.length >= 3);
  assertEquals(f.weeks.length, 5);
  const sch = JSON.stringify(monthSchema(f));
  assert(sch.includes(f.key_days[0].date));
});

Deno.test("validator rejects breakup advice and English-only Telugu", () => {
  const bad = { headline: "Maybe you should break up", kootas: [], partners: [] };
  const v = validateBond(bad, "en", "match");
  assert(!v.ok);
  assert(v.fatal.some((x) => x.startsWith("banned")));
  const te = validateBond({ headline: "This is all English text here" }, "te", "match");
  assert(te.fatal.some((x) => x.startsWith("script_share")));
});
