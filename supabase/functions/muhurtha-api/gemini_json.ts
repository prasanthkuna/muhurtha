import { groqGenerateJsonEnvelope } from "./groq_json.ts";
import { openRouterGenerateJsonEnvelope } from "./openrouter_json.ts";
import { type JsonGenerationEnvelope, openAiGenerateJsonEnvelope } from "./openai_json.ts";
import { logAppEvent } from "./engine.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

function resolveGeminiModel(modelEnvName?: string): string {
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("GEMINI_MODEL")?.trim() ||
    DEFAULT_GEMINI_MODEL;
}

export async function geminiGenerateJson(
  systemInstruction: string,
  userText: string,
  modelEnvName?: string,
): Promise<string | null> {
  const result = await geminiGenerateJsonEnvelope(
    systemInstruction,
    userText,
    { modelEnvName },
  );
  return result?.text ?? null;
}

export async function geminiGenerateJsonEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: {
    modelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
  },
): Promise<JsonGenerationEnvelope | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!apiKey) {
    if (opts?.supabase) {
      await logAppEvent(
        opts.supabase,
        opts.profileId ?? null,
        "gemini",
        "error",
        "GEMINI_API_KEY missing",
      );
    }
    return null;
  }
  const model = resolveGeminiModel(opts?.modelEnvName);
  const supabase = opts?.supabase;
  const profileId = opts?.profileId;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${
      encodeURIComponent(apiKey)
    }`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.72,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Gemini JSON HTTP (${model})`, res.status, errorText);
    if (supabase) {
      await logAppEvent(
        supabase,
        profileId ?? null,
        "gemini",
        "error",
        "Gemini JSON HTTP error",
        undefined,
        {
          model,
          status: res.status,
          error: errorText.slice(0, 1200),
        },
      );
    }
    return null;
  }
  const body = await res.json() as GeminiResponse;
  if (body.error?.message) {
    console.error(`Gemini JSON error (${model})`, body.error.message);
    return null;
  }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  if (text && supabase) {
    await logAppEvent(
      supabase,
      profileId ?? null,
      "gemini",
      "info",
      `Generated JSON with ${model}`,
      undefined,
      {
        model,
        promptLength: systemInstruction.length + userText.length,
      },
    );
  }
  return text ? { text, provider: "gemini", model } : null;
}

export async function generateJsonWithFallback(
  systemInstruction: string,
  userText: string,
  opts?: {
    geminiModelEnvName?: string;
    openRouterModelEnvName?: string;
    openAiModelEnvName?: string;
  },
): Promise<string | null> {
  const envelope = await generateJsonWithFallbackEnvelope(
    systemInstruction,
    userText,
    opts,
  );
  return envelope?.text ?? null;
}

export async function generateJsonWithFallbackEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: {
    geminiModelEnvName?: string;
    openRouterModelEnvName?: string;
    openAiModelEnvName?: string;
    groqModelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
    /** te/hi: prefer non-OpenAI providers first. */
    preferFastProviders?: boolean;
    /** Birth pack / large JSON: skip Groq (free tier TPM too small). */
    largePayload?: boolean;
    /** Ops/testing: skip OpenAI entirely. */
    skipOpenAi?: boolean;
  },
): Promise<JsonGenerationEnvelope | null> {
  const groundedSystem = `${systemInstruction}\n\n${runtimeContextLine()}`;
  const callOpts = {
    supabase: opts?.supabase,
    profileId: opts?.profileId,
  };
  const openAiDisabled = opts?.skipOpenAi ||
    Deno.env.get("DISABLE_OPENAI")?.trim().toLowerCase() === "true";

  const tryGroq = () =>
    groqGenerateJsonEnvelope(groundedSystem, userText, {
      ...callOpts,
      modelEnvName: opts?.groqModelEnvName,
    });
  const tryOpenAi = () =>
    openAiDisabled
      ? Promise.resolve(null)
      : openAiGenerateJsonEnvelope(groundedSystem, userText, {
        ...callOpts,
        modelEnvName: opts?.openAiModelEnvName,
      });
  const tryOpenRouter = () =>
    openRouterGenerateJsonEnvelope(groundedSystem, userText, {
      ...callOpts,
      modelEnvName: opts?.openRouterModelEnvName,
    });

  // Large birth-pack prompts (~50k tokens): Groq free tier rejects with 413.
  if (opts?.largePayload) {
    const openRouter = await tryOpenRouter();
    if (openRouter) return openRouter;
    const openAi = await tryOpenAi();
    if (openAi) return openAi;
    return null;
  }

  if (opts?.preferFastProviders) {
    const openRouter = await tryOpenRouter();
    if (openRouter) return openRouter;
    const groq = await tryGroq();
    if (groq) return groq;
    const openAi = await tryOpenAi();
    if (openAi) return openAi;
    return null;
  }

  const openRouter = await tryOpenRouter();
  if (openRouter) return openRouter;
  const groq = await tryGroq();
  if (groq) return groq;
  const openAi = await tryOpenAi();
  if (openAi) return openAi;

  if (opts?.supabase) {
    await logAppEvent(
      opts.supabase,
      opts.profileId ?? null,
      "llm",
      "error",
      "All JSON providers failed",
      undefined,
      {
        promptLength: groundedSystem.length + userText.length,
        preferFastProviders: opts.preferFastProviders ?? false,
      },
    );
  }
  return null;
}

function runtimeContextLine(): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `Runtime context: current date in Asia/Kolkata is ${today}. Use this date for any "today", "current date", "this week", or "this month" wording.`;
}
