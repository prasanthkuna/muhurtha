import { type JsonGenerationEnvelope, openAiGenerateJsonEnvelope } from "./openai_json.ts";
import { logAppEvent } from "./engine.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  openRouterGenerateJsonEnvelope,
  resolveBirthPackMaxTokens,
  resolveBirthPackSectionMaxTokens,
} from "./openrouter_json.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
/** Gemini 3.5 Flash max output; birth pack needs most of this for the dossier JSON. */
export const DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS = 65536;

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    thoughtsTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
};

function resolveGeminiModel(modelEnvName?: string): string {
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("GEMINI_MODEL")?.trim() ||
    DEFAULT_GEMINI_MODEL;
}

function resolveGeminiMaxOutputTokens(modelEnvName?: string): number | undefined {
  if (modelEnvName === "BIRTH_PACK_GEMINI_MODEL" || modelEnvName === "BIRTH_PACK_MODEL") {
    const parsed = Number(
      Deno.env.get("BIRTH_PACK_MAX_COMPLETION_TOKENS") ??
        String(DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS),
    );
    if (!Number.isFinite(parsed) || parsed < 4096) {
      return DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS;
    }
    return Math.min(Math.floor(parsed), DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS);
  }
  return undefined;
}

function resolveGeminiThinkingConfig(
  modelEnvName?: string,
  explicitMaxOutput?: number,
): Record<string, string> | undefined {
  const isBirthPack = modelEnvName === "BIRTH_PACK_GEMINI_MODEL" ||
    modelEnvName === "BIRTH_PACK_MODEL" ||
    explicitMaxOutput != null;
  if (!isBirthPack) return undefined;
  const level = Deno.env.get("BIRTH_PACK_GEMINI_THINKING_LEVEL")?.trim().toUpperCase() ??
    "MINIMAL";
  return { thinkingLevel: level };
}

function resolveSectionMaxOutputTokens(phase?: string): number | undefined {
  if (!phase) return undefined;
  if (phase === "life_map_journey" || phase === "playbook") {
    return resolveGeminiMaxOutputTokens("BIRTH_PACK_GEMINI_MODEL");
  }
  const parsed = Number(
    Deno.env.get("BIRTH_PACK_SECTION_MAX_TOKENS") ?? "24576",
  );
  if (!Number.isFinite(parsed) || parsed < 4096) return 24576;
  return Math.min(Math.floor(parsed), DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS);
}

function isBirthPackCall(modelEnvName?: string, phase?: string): boolean {
  return modelEnvName === "BIRTH_PACK_GEMINI_MODEL" ||
    modelEnvName === "BIRTH_PACK_MODEL" ||
    phase != null;
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
    maxOutputTokens?: number;
    supabase?: SupabaseClient;
    profileId?: string;
    birthPackPhase?: string;
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
  const maxOutputTokens = opts?.maxOutputTokens ??
    (opts?.birthPackPhase
      ? resolveSectionMaxOutputTokens(opts.birthPackPhase)
      : resolveGeminiMaxOutputTokens(opts?.modelEnvName));
  const supabase = opts?.supabase;
  const profileId = opts?.profileId;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
  };
  if (!isBirthPackCall(opts?.modelEnvName, opts?.birthPackPhase)) {
    generationConfig.temperature = 0.72;
  }
  if (maxOutputTokens != null) {
    generationConfig.maxOutputTokens = maxOutputTokens;
  }
  const thinkingConfig = resolveGeminiThinkingConfig(
    opts?.modelEnvName,
    maxOutputTokens,
  );
  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig,
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
          maxOutputTokens,
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
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? null;
  const finishReason = candidate?.finishReason ?? null;
  if (text && supabase) {
    await logAppEvent(
      supabase,
      profileId ?? null,
      "gemini",
      finishReason === "MAX_TOKENS" ? "warn" : "info",
      finishReason === "MAX_TOKENS"
        ? `Generated JSON truncated at token cap (${model})`
        : `Generated JSON with ${model}`,
      undefined,
      {
        model,
        promptLength: systemInstruction.length + userText.length,
        outputLength: text.length,
        maxOutputTokens,
        finishReason,
        thinkingLevel: thinkingConfig?.thinkingLevel ?? null,
        birthPackPhase: opts?.birthPackPhase ?? null,
        thoughtsTokenCount: body.usageMetadata?.thoughtsTokenCount ?? null,
        candidatesTokenCount: body.usageMetadata?.candidatesTokenCount ?? null,
        totalTokenCount: body.usageMetadata?.totalTokenCount ?? null,
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
    openAiModelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
    /** Birth pack / large JSON dossier. */
    largePayload?: boolean;
    /** Multi-turn birth pack phase label. */
    birthPackPhase?: string;
    /** Ops/testing: skip OpenAI fallback. */
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

  const isBirthPack = Boolean(opts?.birthPackPhase || opts?.largePayload);
  const birthPackPrimary = (Deno.env.get("BIRTH_PACK_PRIMARY") ?? "openai")
    .trim()
    .toLowerCase();

  const tryOpenRouterBirthPack = () =>
    openRouterGenerateJsonEnvelope(groundedSystem, userText, {
      ...callOpts,
      modelEnvName: "BIRTH_PACK_OPENROUTER_MODEL",
      birthPack: true,
      birthPackPhase: opts?.birthPackPhase,
      maxTokens: opts?.birthPackPhase
        ? resolveBirthPackSectionMaxTokens(opts.birthPackPhase)
        : resolveBirthPackMaxTokens(),
    });
  const tryGemini = () =>
    geminiGenerateJsonEnvelope(groundedSystem, userText, {
      ...callOpts,
      modelEnvName: opts?.geminiModelEnvName,
      birthPackPhase: opts?.birthPackPhase,
      maxOutputTokens: opts?.birthPackPhase
        ? resolveSectionMaxOutputTokens(opts.birthPackPhase)
        : opts?.largePayload
        ? resolveGeminiMaxOutputTokens(opts?.geminiModelEnvName ?? "BIRTH_PACK_GEMINI_MODEL")
        : undefined,
    });
  const tryOpenAi = () =>
    openAiDisabled
      ? Promise.resolve(null)
      : openAiGenerateJsonEnvelope(groundedSystem, userText, {
        ...callOpts,
        modelEnvName: opts?.openAiModelEnvName ?? "BIRTH_PACK_MODEL",
        birthPackPhase: opts?.birthPackPhase,
      });

  if (isBirthPack) {
    if (birthPackPrimary === "openrouter") {
      const openRouter = await tryOpenRouterBirthPack();
      if (openRouter) return openRouter;
    }
    const openAi = await tryOpenAi();
    if (openAi) return openAi;
    const gemini = await tryGemini();
    if (gemini) return gemini;
    if (birthPackPrimary !== "openrouter") {
      const openRouter = await tryOpenRouterBirthPack();
      if (openRouter) return openRouter;
    }
    if (opts?.supabase) {
      await logAppEvent(
        opts.supabase,
        opts.profileId ?? null,
        "openai",
        "error",
        "Birth pack failed: OpenAI + Gemini (+ OpenRouter if configured)",
        undefined,
        {
          birthPackPhase: opts?.birthPackPhase ?? null,
          promptLength: groundedSystem.length + userText.length,
        },
      );
    }
    return null;
  } else {
    const gemini = await tryGemini();
    if (gemini) return gemini;
    const openAi = await tryOpenAi();
    if (openAi) return openAi;
  }

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
        largePayload: opts?.largePayload ?? false,
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
