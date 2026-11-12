/**
 * JSON-mode helper for the older prompt families (legacy birth pack phases, Today copy,
 * journey cards). gpt-6-luna only: one call plus one bounded retry on a transient error,
 * then null so the caller serves deterministic copy.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isTransientLlmError, openAiAllowed } from "./llm_policy.ts";
import { createResponse, readingModel } from "./openai_responses.ts";
import { logAppEvent } from "./engine.ts";

export type JsonGenerationEnvelope = { text: string; provider: string; model: string };

function runtimeContextLine(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return `Runtime context: current date in Asia/Kolkata is ${today}. Use this date for any "today", "this week" or "this month" wording. Return valid JSON only.`;
}

export async function lunaJsonEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: { supabase?: SupabaseClient; profileId?: string; largePayload?: boolean; birthPackPhase?: string; maxOutputTokens?: number },
): Promise<JsonGenerationEnvelope | null> {
  if (!openAiAllowed()) return null;
  const model = readingModel();
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await createResponse({
        model,
        system: `${systemInstruction}\n\n${runtimeContextLine()}`,
        user: userText,
        jsonObject: true,
        reasoningEffort: opts?.largePayload || opts?.birthPackPhase ? "low" : "none",
        maxOutputTokens: opts?.maxOutputTokens ?? (opts?.largePayload ? 32000 : 6000),
        timeoutMs: opts?.largePayload ? 120_000 : 45_000,
      });
      if (r.status === "completed" && r.output_text) return { text: r.output_text, provider: "openai", model: r.model ?? model };
      lastErr = `incomplete:${r.status}:${r.incomplete_reason ?? r.error ?? ""}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (!isTransientLlmError(lastErr)) break;
    }
  }
  if (opts?.supabase) {
    await logAppEvent(opts.supabase, opts.profileId ?? null, "llm", "error", "Luna JSON call failed", undefined, {
      model, error: lastErr.slice(0, 500), birthPackPhase: opts.birthPackPhase ?? null,
    }).catch(() => undefined);
  }
  return null;
}
