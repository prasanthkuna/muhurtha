import { assert, assertEquals } from "jsr:@std/assert@1";
import { groundingProblems, promptFacts, type V2DayCopy, type V2DayFact, type V2Facts } from "./reading_v2.ts";

const day = (over: Partial<V2DayCopy>): V2DayCopy => ({
  date: "2026-10-29", title: "Rest Your Mind", line: "", body: "", do: [], avoid: [], window_notes: [], ...over,
} as V2DayCopy);
const rohini = { date: "2026-10-29", weekday: "thu", tithi: "Shukla Chaturdashi", nakshatra: "Rohini", yoga: "x", moon_sign: "vrishabha", tara: "Janma", day_tone: "careful", windows: [] } as unknown as V2DayFact;

Deno.test("29 Oct regression: Hasta called the day's birth star on a Rohini day is flagged", () => {
  const d = day({ line: "Hasta (your birth star) recommends taking it easy today.", body: "With your birth star active alongside a careful tone, rest." });
  const p = groundingProblems(`${d.line} ${d.body}`, d, rohini, "Hasta", "en", "days");
  assert(p.includes("wrong_star"), p.join(","));
  assert(p.includes("tone_label"), p.join(","));
});

Deno.test("today's real star and natal context pass", () => {
  const d = day({ body: "Rohini, today's star, falls in your Hasta birth-star group, so keep plans light." });
  assertEquals(groundingProblems(d.body, d, rohini, "Hasta", "en", "days"), []);
});

Deno.test("weekday in title, missed full moon, Telugu wrong star", () => {
  const full = { ...rohini, tithi: "Purnima", nakshatra: "Ashwini" } as V2DayFact;
  const d = day({ title: "Low Key Friday", body: "Plan your week and call a friend." });
  const p = groundingProblems(d.body, d, full, "Hasta", "en", "days");
  assert(p.includes("weekday_in_title") && p.includes("tithi_missed"), p.join(","));
  const t = day({ title: "జాగ్రత్త", body: "ఈరోజు నక్షత్రం రేవతి కాబట్టి మెల్లగా చేయండి." });
  assert(groundingProblems(t.body, t, rohini, "Hasta", "te", "days").includes("wrong_star"));
  const ok = day({ title: "జాగ్రత్త", body: "ఈరోజు నక్షత్రం రోహిణి కాబట్టి మెల్లగా చేయండి." });
  assertEquals(groundingProblems(ok.body, ok, rohini, "Hasta", "te", "days"), []);
});

Deno.test("prompt facts carry per-day hints", () => {
  const f = { locale: "te", natal: { nakshatra: "Hasta" }, days: [rohini] } as unknown as V2Facts;
  const d = promptFacts(f).days[0] as unknown as Record<string, unknown>;
  assertEquals(d.nakshatra_te, "రోహిణి");
  assertEquals(d.is_birth_star, false);
  assert(String(d.tara_hint).startsWith("birth-star echo"));
});

Deno.test("free-tier quota cap is recognised (job is parked, not failed)", async () => {
  const { isQuotaCap } = await import("./reading_jobs.ts");
  if (!isQuotaCap("no_content:failed:gemini_create_failed:429:You exceeded your current quota, please check")) throw new Error("miss");
  if (isQuotaCap("gemini_stream_error:This model is currently experiencing high demand")) throw new Error("false positive");
});
