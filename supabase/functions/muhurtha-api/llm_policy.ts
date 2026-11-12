/**
 * LLM provider policy (owner decision 2026-11-12): gpt-6-luna is the ONLY language model.
 * No Gemini, no OpenRouter, no other OpenAI model fallback. On failure: one bounded retry,
 * then deterministic or saved content (the caller decides what that is).
 * Pure module: no imports, safe for tests.
 */
export const LUNA_MODEL = "gpt-6-luna";

/** Luna runs whenever the OpenAI key is present (DISABLE_OPENAI=true is the kill switch). */
export function openAiAllowed(): boolean {
  if (Deno.env.get("DISABLE_OPENAI")?.trim().toLowerCase() === "true") return false;
  return Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
}

/** Background job attempts: the first try plus one bounded retry. */
export function maxAttempts(): number {
  return 2;
}

/** Wait before re-submitting attempt n (1-based count of attempts already made): 10s, capped at 60s. */
export function retryBackoffMs(attemptsMade: number): number {
  if (attemptsMade <= 0) return 0;
  return Math.min(60_000, 10_000 * 2 ** (attemptsMade - 1));
}

/** Account-level quota exhaustion (429 insufficient_quota): park the job, don't burn an attempt. */
export function isQuotaCap(err: string): boolean {
  return /429/.test(err) && /quota/i.test(err);
}

/** Short-lived overload (5xx, 429 rate limit, timeouts, stream stalls): worth the one retry. */
export function isTransientLlmError(err: string): boolean {
  if (isQuotaCap(err)) return false;
  return /(^|:)(429|500|502|503|504)(:|$)|overloaded|unavailable|stream_error|timeout|aborted/i.test(err);
}

export function quotaParkMs(): number {
  return 10 * 60_000;
}
