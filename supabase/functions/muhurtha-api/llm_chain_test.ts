import { assert, assertEquals } from "jsr:@std/assert@1";
import { geminiCapped, geminiChain, geminiHopReason, markGeminiCapped } from "./openai_responses.ts";

Deno.test("Gemini chain: primary first, then lower models, no duplicates, never OpenAI", () => {
  Deno.env.delete("GEMINI_FALLBACK_MODELS");
  Deno.env.delete("GEMINI_LOWER_MODELS");
  const c = geminiChain("gemini-3.6-flash");
  assertEquals(c[0], "gemini-3.6-flash");
  assert(c.length >= 3, c.join(","));
  assertEquals(new Set(c).size, c.length);
  assert(c.every((m) => m.startsWith("gemini-")));
  assert(c.some((m) => m.includes("flash-lite")));
  Deno.env.set("GEMINI_LOWER_MODELS", "gemini-x-lite");
  assertEquals(geminiChain("gemini-3.6-flash"), ["gemini-3.6-flash", "gemini-x-lite"]);
  Deno.env.delete("GEMINI_LOWER_MODELS");
});

Deno.test("hop reasons: day cap, busy, unsupported; schema errors are not hopped", () => {
  assertEquals(geminiHopReason("gemini_create_failed:429:You exceeded your current quota"), "cap");
  assertEquals(geminiHopReason("gemini_create_failed:429:Resource exhausted, retry"), "busy");
  assertEquals(geminiHopReason("gemini_create_failed:503:high demand"), "busy");
  assertEquals(geminiHopReason("gemini_create_failed:404:no longer available to new users"), "unsupported");
  assertEquals(geminiHopReason("gemini_create_failed:400:Thinking level is not supported for this model."), "unsupported");
  assertEquals(geminiHopReason("gemini_create_failed:400:Invalid JSON schema"), null);
  assertEquals(geminiHopReason("gemini_stream_error:cut"), null);
});

Deno.test("a capped model is skipped until the Pacific quota day resets", () => {
  const now = Date.parse("2026-10-24T16:00:00Z"); // 09:00 PDT
  markGeminiCapped("gemini-test", now);
  assert(geminiCapped("gemini-test", now + 3600_000));
  assert(!geminiCapped("gemini-test", Date.parse("2026-10-25T07:30:00Z")));
});
