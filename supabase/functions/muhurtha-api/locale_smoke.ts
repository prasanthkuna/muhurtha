import type { SupabaseClient } from "@supabase/supabase-js";
import { groqGenerateJsonEnvelope } from "./groq_json.ts";
import { openAiGenerateJsonEnvelope } from "./openai_json.ts";
import { openRouterGenerateJsonEnvelope } from "./openrouter_json.ts";
import type { AppLocale } from "./vedic_labels.ts";

const PROMPT = `Return valid JSON only: {"greeting":string,"locale_check":string}
Write greeting in the requested language only. locale_check must echo the locale code.`;

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return "Telugu script only. Example tone: స్నేహితుడిలా మాట్లాడు.";
  }
  if (loc === "hi") {
    return "Hindi Devanagari only.";
  }
  return "Plain Indian English only.";
}

function detectScript(text: string, locale: AppLocale): string {
  if (locale === "te") {
    if (/[\u0C00-\u0C7F]/.test(text)) return "telugu_script";
    if (/[A-Za-z]{4,}/.test(text)) return "english_latin";
    return "unknown";
  }
  if (locale === "hi") {
    if (/[\u0900-\u097F]/.test(text)) return "devanagari";
    if (/[A-Za-z]{4,}/.test(text)) return "english_latin";
    return "unknown";
  }
  if (/[A-Za-z]/.test(text)) return "english_latin";
  return "unknown";
}

function summarizeProvider(
  label: string,
  envelope: { text: string; provider: string; model: string } | null,
  locale: AppLocale,
) {
  if (!envelope) {
    return { ok: false, provider: label };
  }
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(envelope.text) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  const greeting = String(parsed?.greeting ?? envelope.text.slice(0, 120));
  return {
    ok: true,
    provider: envelope.provider,
    model: envelope.model,
    greeting,
    script: detectScript(greeting, locale),
    locale_check: parsed?.locale_check ?? null,
    sample: envelope.text.slice(0, 240),
  };
}

export async function smokeTestLocaleLlm(
  locale: AppLocale,
  supabase?: SupabaseClient,
  profileId?: string | null,
  opts?: { skipOpenAi?: boolean },
): Promise<Record<string, unknown>> {
  const system = `${PROMPT}\n${localeLine(locale)}`;
  const user = JSON.stringify({ locale, task: "say hello as Sakha" });
  const callOpts = {
    supabase,
    profileId: profileId ?? undefined,
  };

  const results: Record<string, unknown> = {
    locale,
    skipOpenAi: opts?.skipOpenAi ?? false,
  };

  results.groq = summarizeProvider(
    "groq",
    await groqGenerateJsonEnvelope(system, user, {
      ...callOpts,
      modelEnvName: "GROQ_MODEL",
    }),
    locale,
  );

  results.openrouter = summarizeProvider(
    "openrouter",
    await openRouterGenerateJsonEnvelope(system, user, {
      ...callOpts,
      modelEnvName: "OPENROUTER_MODEL",
    }),
    locale,
  );

  if (!opts?.skipOpenAi) {
    results.openai = summarizeProvider(
      "openai",
      await openAiGenerateJsonEnvelope(system, user, {
        ...callOpts,
        modelEnvName: "CONTENT_LLM_MODEL",
      }),
      locale,
    );
  }

  const working = Object.entries(results)
    .filter(([k, v]) => k !== "locale" && k !== "skipOpenAi" && (v as { ok?: boolean }).ok)
    .map(([k]) => k);

  results.working_providers = working;
  results.recommendation = working.includes("openrouter")
    ? "Use OpenRouter as primary; keep Groq for small Ask/today only."
    : working.length
    ? `Working: ${working.join(", ")}`
    : "No provider succeeded — check keys and model env vars.";

  return results;
}
