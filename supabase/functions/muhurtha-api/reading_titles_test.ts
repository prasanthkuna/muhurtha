import { assert, assertEquals } from "jsr:@std/assert@1";
import { chapterTitleProblems } from "./reading_v2.ts";

Deno.test("chapter titles: repeated words and repeated lead words are flagged", () => {
  const seen = new Set<string>();
  assert(chapterTitleProblems("New Horizon Horizon", seen).includes("title_word_repeat"));
  assert(chapterTitleProblems("Deep Foundations & Master Mastery", seen).includes("title_word_repeat"));
  const s2 = new Set<string>();
  assertEquals(chapterTitleProblems("Refining Details", s2), []);
  assert(chapterTitleProblems("Refined Work & Rewards", s2).includes("title_lead_repeat"));
  assertEquals(chapterTitleProblems("Deep Roots & Hard-Won Skill", s2), []);
});

Deno.test("chapter titles: more than 4 words or 28 chars is too long", async () => {
  const { chapterTitleTooLong } = await import("./reading_v2.ts");
  assert(chapterTitleTooLong("Building Strong Foundations For Future Growth"));
  assert(chapterTitleTooLong("Steady Climb Through Responsibility"));
  assert(!chapterTitleTooLong("Deep Roots & Hard-Won Skill"));
  assert(!chapterTitleTooLong("మూలాలు గట్టిపడే టైమ్"));
});
