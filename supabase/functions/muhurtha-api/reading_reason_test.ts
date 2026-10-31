import { assert, assertEquals } from "jsr:@std/assert@1";
import { panchangReason } from "./reading_v2.ts";

// deno-lint-ignore no-explicit-any
const fx = (nakshatra: string, tithi: string) => ({ date: "2026-11-01", nakshatra, tithi } as any);
// deno-lint-ignore no-explicit-any
const day = (line: string, body: string) => ({ date: "2026-11-01", title: "t", line, body, do: [], avoid: [], window_notes: [] } as any);

Deno.test("panchang reason: star or tithi plus a causal link counts", () => {
  assert(panchangReason(day("", "Pushya is a nourishing star, so it suits a slow family lunch."), fx("Pushya", "Krishna Saptami"), "en"));
  assert(panchangReason(day("Ekadashi asks for discipline.", "Keep food light because the fast-day rhythm helps focus."), fx("Hasta", "Shukla Ekadashi"), "en"));
  assert(panchangReason(day("", "పుష్యమి రోజు కావడంతో ఇంట్లో పనులు సాఫీగా సాగుతాయి."), fx("Pushya", "Krishna Saptami"), "te"));
  assert(panchangReason(day("", "Uttara Bhadrapada settles things, which means paperwork moves."), fx("Uttara Bhadrapada", "Shukla Dashami"), "en"));
});

Deno.test("panchang reason: a mood line or a star without a reason does not count", () => {
  assertEquals(panchangReason(day("A good day.", "Call your mother and clear your inbox."), fx("Pushya", "Krishna Saptami"), "en"), false);
  assertEquals(panchangReason(day("", "Today's star is Pushya. Call your mother."), fx("Pushya", "Krishna Saptami"), "en"), false);
  assertEquals(panchangReason(day("", "Rohini is calm, so rest."), fx("Pushya", "Krishna Saptami"), "en"), false);
});
