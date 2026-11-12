import { costUsd, modelForAttempt, providerOf, readingModel } from "./openai_responses.ts";

Deno.test("Luna is the only model, for every attempt", () => {
  for (const a of [0, 1, 2, 5]) if (modelForAttempt(a) !== "gpt-6-luna") throw new Error(modelForAttempt(a));
  Deno.env.set("LUNA_MODEL", "gpt-5.4-mini");
  try {
    if (readingModel() !== "gpt-6-luna") throw new Error("non-Luna pin accepted");
  } finally {
    Deno.env.delete("LUNA_MODEL");
  }
  if (providerOf("gpt-6-luna") !== "openai") throw new Error("provider");
});

Deno.test("Luna pricing: $0.10 in, $0.01 cached, $0.50 out per 1M", () => {
  const c = costUsd("gpt-6-luna", { input_tokens: 1_000_000, cached_tokens: 400_000, output_tokens: 1_000_000, reasoning_tokens: 0, total_tokens: 2_000_000 });
  // 600k * 0.10 + 400k * 0.01 + 1M * 0.50 = 0.06 + 0.004 + 0.5
  if (Math.abs(c - 0.564) > 1e-9) throw new Error(String(c));
  // Historical rows keep their own price.
  const g = costUsd("gemini-3.6-flash", { input_tokens: 1_000_000, cached_tokens: 0, output_tokens: 0, reasoning_tokens: 0, total_tokens: 1_000_000 });
  if (Math.abs(g - 0.75) > 1e-9) throw new Error(String(g));
});

Deno.test("policy: key gates Luna, one bounded retry", async () => {
  const { openAiAllowed, maxAttempts } = await import("./llm_policy.ts");
  const keep = Deno.env.get("OPENAI_API_KEY");
  Deno.env.set("OPENAI_API_KEY", "test");
  try {
    if (!openAiAllowed()) throw new Error("key present but not allowed");
    Deno.env.set("DISABLE_OPENAI", "true");
    if (openAiAllowed()) throw new Error("kill switch ignored");
    if (maxAttempts() !== 2) throw new Error("attempts");
  } finally {
    Deno.env.delete("DISABLE_OPENAI");
    keep === undefined ? Deno.env.delete("OPENAI_API_KEY") : Deno.env.set("OPENAI_API_KEY", keep);
  }
});
