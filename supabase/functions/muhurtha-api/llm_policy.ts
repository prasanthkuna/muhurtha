/**
 * LLM provider policy (owner decision 2026-10-24: Gemini only until further notice).
 * OpenAI is never called unless LLM_FALLBACK=openai is set (and DISABLE_OPENAI is not "true").
 * The OpenAI code paths stay in place so the fallback can be re-enabled with one secret.
 * Pure module: no imports, safe for tests.
 */
export function openAiAllowed(): boolean {
  if (Deno.env.get("DISABLE_OPENAI")?.trim().toLowerCase() === "true") return false;
  const fallback = (Deno.env.get("LLM_FALLBACK") ?? "none").trim().toLowerCase();
  return fallback === "openai" && Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
}

/** Background job attempts: a short budget when OpenAI can take over, a long one when Gemini is alone. */
export function maxAttempts(): number {
  return openAiAllowed() ? 3 : Number(Deno.env.get("GEMINI_MAX_ATTEMPTS") ?? "8");
}

/** Wait before re-submitting attempt n (1-based count of attempts already made): 15s, 30s, 60s ... capped at 5 min. */
export function retryBackoffMs(attemptsMade: number): number {
  if (attemptsMade <= 0) return 0;
  return Math.min(300_000, 15_000 * 2 ** (attemptsMade - 1));
}
