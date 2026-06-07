import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiGenerateJsonEnvelope } from "./gemini_json.ts";
import { groqGenerateJsonEnvelope } from "./groq_json.ts";
import { openAiGenerateJsonEnvelope } from "./openai_json.ts";
import type { AppLocale } from "./vedic_labels.ts";

const PROMPT = `Return valid JSON only: {"greeting":string,"locale_check":string}
Write greeting in the requested language only. locale_check must echo the locale code.`;

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return "Telugu script only.";
  }
  if (loc === "hi") {
    return "Hindi Devanagari only.";
  }
  return "Plain Indian English only.";
}

export async function smokeTestLocaleLlm(
  locale: AppLocale,
  supabase?: SupabaseClient,
  profileId?: string | null,
): Promise<Record<string, unknown>> {
  const system = `${PROMPT}\n${localeLine(locale)}`;
  const user = JSON.stringify({ locale, task: "say hello as Sakha" });

  const results: Record<string, unknown> = { locale };

  const openAi = await openAiGenerateJsonEnvelope(system, user, {
    modelEnvName: "CONTENT_LLM_MODEL",
    supabase,
    profileId: profileId ?? undefined,
  });
  results.openai = openAi
    ? {
      ok: true,
      provider: openAi.provider,
      model: openAi.model,
      sample: openAi.text.slice(0, 200),
    }
    : { ok: false };

  const groq = await groqGenerateJsonEnvelope(system, user, {
    modelEnvName: "GROQ_MODEL",
    supabase,
    profileId: profileId ?? undefined,
  });
  results.groq = groq
    ? {
      ok: true,
      provider: groq.provider,
      model: groq.model,
      sample: groq.text.slice(0, 200),
    }
    : { ok: false };

  const gemini = await geminiGenerateJsonEnvelope(system, user, {
    modelEnvName: "GEMINI_MODEL",
    supabase,
    profileId: profileId ?? undefined,
  });
  results.gemini = gemini
    ? {
      ok: true,
      provider: gemini.provider,
      model: gemini.model,
      sample: gemini.text.slice(0, 200),
    }
    : { ok: false };

  return results;
}
