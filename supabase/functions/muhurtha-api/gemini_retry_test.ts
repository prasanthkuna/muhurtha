import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { createResponse, GEMINI_BUSY_RETRY_MS } from "./openai_responses.ts";
import { readingChainDepth } from "./reading_jobs.ts";

Deno.test("busy primary is retried with backoff before stepping down; chainDepth keeps lite out", async () => {
  Deno.env.set("GEMINI_API_KEY", "test-key");
  Deno.env.delete("GEMINI_FALLBACK_MODELS");
  Deno.env.delete("GEMINI_LOWER_MODELS");
  Deno.env.delete("LLM_FALLBACK");
  const seen: string[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = ((url: string | URL | Request) => {
    const u = String(url instanceof Request ? url.url : url);
    const m = /models\/([^:]+):/.exec(u)?.[1] ?? "?";
    seen.push(m);
    return Promise.resolve(new Response(JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand." } }), { status: 503 }));
  }) as typeof fetch;
  try {
    await assertRejects(() =>
      createResponse({
        model: "gemini-3.6-flash", system: "s", user: "u", schemaName: "x",
        schema: { type: "object", properties: { a: { type: "string" } }, required: ["a"] },
        timeoutMs: 140_000, chainDepth: 2,
      })
    );
  } finally {
    globalThis.fetch = orig;
  }
  const primary = seen.filter((m) => m === "gemini-3.6-flash").length;
  assertEquals(primary, 1 + GEMINI_BUSY_RETRY_MS.length, seen.join(","));
  assert(seen.includes("gemini-3.5-flash"), seen.join(","));
  assert(!seen.some((m) => m.includes("lite")), seen.join(","));
});

Deno.test("reading attempts: first two stay on strong models, later ones may use the full chain", () => {
  assertEquals(readingChainDepth(0), 2);
  assertEquals(readingChainDepth(1), 2);
  assertEquals(readingChainDepth(2), undefined);
});
