import { assert, assertEquals } from "jsr:@std/assert@1";
import { jargonHits, voiceProblems } from "./voice.ts";

Deno.test("jargon lint: work-ticket words are flagged, everyday words are not", () => {
  assert(jargonHits("Focus on fixing backend operational glitches.", "en").length >= 2);
  assert(voiceProblems("Fix internal workflow bottlenecks before trying to scale up.", "en").some((p) => p.startsWith("jargon:")));
  assertEquals(jargonHits("Sort out what quietly slows your day before you try to grow.", "en"), []);
  assertEquals(jargonHits("Keep the operation of the house simple.", "en"), []);
  assert(jargonHits("ఆఫీసులో వర్క్‌ఫ్లో బాటిల్‌నెక్ క్లియర్ చేయండి", "te").length >= 1);
});
