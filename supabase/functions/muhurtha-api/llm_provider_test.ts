import { geminiSchema, parseGemini, providerOf, costUsd, geminiRequestSchema, modelForAttempt } from "./openai_responses.ts";

Deno.test("gemini schema drops length keywords but keeps structure", () => {
  const s = geminiSchema({ type: "object", properties: { a: { type: "string", maxLength: 40, description: "x" }, b: { type: "array", items: { type: "string", maxLength: 5 }, minItems: 1, maxItems: 2 } }, required: ["a", "b"], additionalProperties: false }) as Record<string, any>;
  if (s.properties.a.maxLength !== undefined || s.properties.b.items.maxLength !== undefined) throw new Error("maxLength kept");
  if (s.properties.b.minItems !== 1 || s.required.length !== 2 || s.additionalProperties !== false) throw new Error("structure lost");
});

Deno.test("parseGemini maps text, usage and finish reasons", () => {
  const ok = parseGemini({ candidates: [{ content: { parts: [{ text: "{\"a\":" }, { text: "1}" }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 1000, cachedContentTokenCount: 200, candidatesTokenCount: 500, thoughtsTokenCount: 100, totalTokenCount: 1600 }, modelVersion: "gemini-3.8-flash" }, "gemini-3.8-flash", "gem_1");
  if (ok.status !== "completed" || ok.output_text !== "{\"a\":1}") throw new Error(JSON.stringify(ok));
  if (ok.usage?.output_tokens !== 600 || ok.usage?.reasoning_tokens !== 100) throw new Error("usage");
  const cut = parseGemini({ candidates: [{ content: { parts: [{ text: "{" }] }, finishReason: "MAX_TOKENS" }] }, "gemini-3.8-flash", "gem_2");
  if (cut.status !== "incomplete") throw new Error("max tokens not incomplete");
  const empty = parseGemini({ promptFeedback: { blockReason: "SAFETY" } }, "gemini-3.8-flash", "gem_3");
  if (empty.status !== "failed") throw new Error("blocked not failed");
});

Deno.test("provider and gemini pricing", () => {
  if (providerOf("gemini-3.8-flash") !== "gemini" || providerOf("gpt-5.4-mini") !== "openai") throw new Error("provider");
  const c = costUsd("gemini-3.8-flash", { input_tokens: 1_000_000, cached_tokens: 0, output_tokens: 1_000_000, reasoning_tokens: 0, total_tokens: 2_000_000 });
  if (Math.abs(c - 4.5) > 1e-9) throw new Error(String(c));
});

Deno.test("gemini request schema drops array counts but keeps a property named minItems-free", () => {
  const s = geminiRequestSchema({ type: "object", properties: { days: { type: "array", minItems: 7, maxItems: 7, items: { type: "string", maxLength: 40 } } }, required: ["days"], additionalProperties: false });
  const j = JSON.stringify(s);
  if (j.includes("minItems") || j.includes("maxItems") || j.includes("maxLength")) throw new Error(j);
  if (!j.includes("\"days\"") || !j.includes("\"required\"")) throw new Error(j);
});

Deno.test("gemini primary gets two attempts before the OpenAI fallback", () => {
  const keep = { g: Deno.env.get("GEMINI_API_KEY"), o: Deno.env.get("OPENAI_API_KEY"), p: Deno.env.get("READING_PROVIDER") };
  Deno.env.set("GEMINI_API_KEY", "test"); Deno.env.set("OPENAI_API_KEY", "test"); Deno.env.delete("READING_PROVIDER");
  Deno.env.set("LLM_FALLBACK", "openai");
  try {
    const seq = [0, 1, 2].map((a) => providerOf(modelForAttempt(a)));
    if (seq.join(",") !== "gemini,gemini,openai") throw new Error(seq.join(","));
    Deno.env.set("GEMINI_FALLBACK_MODELS", "gemini-3.7-flash");
    if (modelForAttempt(1) !== "gemini-3.7-flash") throw new Error("fallback chain");
    Deno.env.delete("GEMINI_FALLBACK_MODELS");
    Deno.env.set("READING_PROVIDER", "openai");
    if (providerOf(modelForAttempt(0)) !== "openai") throw new Error("override");
  } finally {
    Deno.env.delete("LLM_FALLBACK");
    for (const [k, v] of [["GEMINI_API_KEY", keep.g], ["OPENAI_API_KEY", keep.o], ["READING_PROVIDER", keep.p]] as const) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
  }
});

Deno.test("Gemini-only by default: OpenAI is never chosen, even when forced or keyed", async () => {
  const { openAiAllowed, maxAttempts, retryBackoffMs } = await import("./llm_policy.ts");
  Deno.env.set("GEMINI_API_KEY", "test"); Deno.env.set("OPENAI_API_KEY", "test"); Deno.env.delete("LLM_FALLBACK");
  Deno.env.set("READING_PROVIDER", "openai");
  try {
    if (openAiAllowed()) throw new Error("allowed without LLM_FALLBACK=openai");
    const seq = [0, 1, 2, 3, 7].map((a) => providerOf(modelForAttempt(a)));
    if (seq.some((p) => p !== "gemini")) throw new Error(seq.join(","));
    if (maxAttempts() < 5) throw new Error("gemini-only should retry longer");
    if (retryBackoffMs(1) !== 15_000 || retryBackoffMs(10) !== 300_000) throw new Error("backoff");
  } finally {
    Deno.env.delete("READING_PROVIDER"); Deno.env.delete("OPENAI_API_KEY"); Deno.env.delete("GEMINI_API_KEY");
  }
});
