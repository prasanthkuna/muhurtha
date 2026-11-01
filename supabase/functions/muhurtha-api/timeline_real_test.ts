// Scripted check on a real chart shape (Gadde's birth details) through the engine's own
// computeTimeline (Moon longitude -> Vimshottari), not the synthetic pada midpoint.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { lifeTimelineForBirth } from "./engine.ts";

const NOW = new Date("2026-11-01T06:30:00Z");

Deno.test("timeline window on Gadde's real birth details", () => {
  const bi = {
    id: "test", profile_id: "test", date_of_birth: "1993-07-21", exact_birth_time: "12:10:00", time_bucket: null,
    birth_input_mode: "exact_time", janma_nakshatra: "Ashlesha", nakshatra_pada: 4,
    birth_lat: 15.8492886, birth_lng: 80.3546764, birth_timezone: "Asia/Kolkata", birth_place: "Chirala, Andhra Pradesh",
  };
  // deno-lint-ignore no-explicit-any
  const rows = lifeTimelineForBirth(bi as any, "Asia/Kolkata", NOW);
  console.log("\n== Gadde (1993-07-21 12:10 Chirala, Ashlesha p4)");
  rows.forEach((r, i) => console.log(`${String(i).padStart(2)} ${r.kind.padEnd(7)} ${r.lords.padEnd(24)} ${r.period.padEnd(22)} ages ${r.ages}`));
  const full = rows.filter((r) => r.kind === "detail").length;
  console.log(`   full=${full} summary=${rows.length - full} total=${rows.length}`);
  assert(full <= 35);
  assertEquals(rows[0].kind, "summary");
  assert(Number(rows[rows.length - 1].ages.split("-")[1]) >= 79);
});

import { buildReadingFacts } from "./engine.ts";
import { buildReadingSchema, buildReadingView, buildSystemPrompt, sanitizeContent, validateContent, type V2Content } from "./reading_v2.ts";

const PROF = {
  id: "p", current_city: "Hyderabad", current_timezone: "Asia/Kolkata", current_lat: 17.385, current_lng: 78.4867,
  display_name: "Test", language_code: "en", explanation_mode: null, onboarding_intent: null,
};
const BI = {
  id: "b", profile_id: "p", date_of_birth: "1993-07-21", exact_birth_time: "12:10:00", time_bucket: null,
  birth_input_mode: "exact_time", janma_nakshatra: "Ashlesha", nakshatra_pada: 4,
  birth_lat: 15.8492886, birth_lng: 80.3546764, birth_timezone: "Asia/Kolkata", birth_place: "Chirala",
};

Deno.test("v2 facts carry summary rows; sanitize drops summary bodies; view exposes kind + ages", () => {
  // deno-lint-ignore no-explicit-any
  const facts = buildReadingFacts(PROF as any, BI as any, "en", "2026-11-01", null);
  const kinds = facts.chapters.map((c) => c.kind);
  assertEquals(facts.chapters.map((c) => c.chapter_id), facts.chapters.map((_, i) => i), "ids 0..n-1 in order");
  assert(kinds.includes("summary") && kinds.includes("detail"));
  const cur = facts.chapters.find((c) => c.chapter_id === facts.current_chapter_id)!;
  assertEquals(cur.kind, "detail");
  assertEquals(cur.tense, "current");
  assertEquals(facts.chapters[0].early, true);
  assertEquals(facts.chapters[0].age_from, 0);
  assert(buildSystemPrompt(facts).includes("5b."));
  assert(JSON.stringify(buildReadingSchema(facts, { withLengths: true })).includes("kind=summary"));
  // Every week/month still resolves to a chapter id.
  for (const w of facts.weeks) assert(w.chapter_id != null);
  const content = {
    profile: { title: "t", summary: "s", strengths: [], watchouts: [], work_style: "", relationship_style: "", share_line: "" },
    areas: [], days: [], weekdays: [], weeks: [], months: [], ask_starters: [], remedies: [],
    push: {} as V2Content["push"],
    chapters: facts.chapters.map((c) => ({ chapter_id: c.chapter_id, title: `T${c.chapter_id}`, highlight: "One line.", body: "Body sentence one. Two.", share_line: "share" })),
  } as V2Content;
  const clean = sanitizeContent(content, facts);
  for (const ch of clean.chapters) {
    const f = facts.chapters.find((x) => x.chapter_id === ch.chapter_id)!;
    assertEquals(ch.body === "", f.kind === "summary", `chapter ${ch.chapter_id}`);
  }
  assert(!validateContent(clean, facts).fatal.some((f) => f.startsWith("chapters")));
  const view = buildReadingView(clean, facts, { dateStr: "2026-11-01", tz: "Asia/Kolkata", locale: "en" });
  const phases = view.journey_phases as Record<string, unknown>[];
  assertEquals(phases.length, facts.chapters.length);
  assertEquals(phases[0].kind, "summary");
  assertEquals(phases.filter((p) => p.tense === "current").length, 1);
  console.log(`facts: ${facts.chapters.length} chapters (${kinds.filter((k) => k === "summary").length} summary), current=${facts.current_chapter_id}, prompt facts chars=${JSON.stringify(facts.chapters).length}`);
});
