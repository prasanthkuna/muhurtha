import type { SupabaseClient } from "@supabase/supabase-js";
import { logAppEvent } from "./engine.ts";
import {
  resolveBirthPackMaxTokens,
  resolveBirthPackSectionMaxTokens,
} from "./openrouter_json.ts";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const BIRTH_PACK_TEMPERATURE = 0.55;

export type JsonGenerationEnvelope = {
  text: string;
  provider: string;
  model: string;
};

type OpenAiChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

function resolveModel(modelEnvName?: string): string {
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("CONTENT_LLM_MODEL")?.trim() ||
    Deno.env.get("OPENAI_MODEL")?.trim() ||
    DEFAULT_OPENAI_MODEL;
}

function maxCompletionTokens(
  modelEnvName?: string,
  birthPackPhase?: string,
): number | null {
  const isBirthPack = modelEnvName === "BIRTH_PACK_MODEL" || birthPackPhase != null;
  if (!isBirthPack) return null;
  if (birthPackPhase === "playbook" || birthPackPhase === "life_map_journey") {
    return resolveBirthPackMaxTokens();
  }
  if (birthPackPhase) {
    return resolveBirthPackSectionMaxTokens(birthPackPhase);
  }
  return resolveBirthPackMaxTokens();
}

export async function openAiGenerateJson(
  systemInstruction: string,
  userText: string,
  modelEnvName?: string,
): Promise<string | null> {
  const result = await openAiGenerateJsonEnvelope(
    systemInstruction,
    userText,
    modelEnvName,
  );
  return result?.text ?? null;
}

export async function openAiGenerateJsonEnvelope(
  systemInstruction: string,
  userText: string,
  optsOrModelEnvName?: string | {
    modelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
    birthPackPhase?: string;
  },
): Promise<JsonGenerationEnvelope | null> {
  const modelEnvName = typeof optsOrModelEnvName === "string"
    ? optsOrModelEnvName
    : optsOrModelEnvName?.modelEnvName;
  const supabase = typeof optsOrModelEnvName === "string"
    ? undefined
    : optsOrModelEnvName?.supabase;
  const profileId = typeof optsOrModelEnvName === "string"
    ? undefined
    : optsOrModelEnvName?.profileId;
  const birthPackPhase = typeof optsOrModelEnvName === "string"
    ? undefined
    : optsOrModelEnvName?.birthPackPhase;
  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!apiKey) return null;
  const model = resolveModel(modelEnvName);
  const isBirthPack = modelEnvName === "BIRTH_PACK_MODEL" || birthPackPhase != null;
  const maxTokens = maxCompletionTokens(modelEnvName, birthPackPhase);
  const payload: Record<string, unknown> = {
    model,
    temperature: isBirthPack ? BIRTH_PACK_TEMPERATURE : 0.72,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userText },
    ],
  };
  if (maxTokens != null) {
    payload.max_completion_tokens = maxTokens;
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`OpenAI JSON HTTP (${model})`, res.status, errorText);
    if (supabase) {
      await logAppEvent(
        supabase,
        profileId ?? null,
        "openai",
        "error",
        "OpenAI JSON HTTP error",
        undefined,
        {
          model,
          status: res.status,
          error: errorText.slice(0, 1200),
          modelEnvName,
        },
      );
    }
    return null;
  }
  const body = await res.json() as OpenAiChatResponse;
  if (body.error?.message) {
    console.error(`OpenAI JSON error (${model})`, body.error.message);
    if (supabase) {
      await logAppEvent(
        supabase,
        profileId ?? null,
        "openai",
        "error",
        body.error.message,
        undefined,
        {
          model,
          modelEnvName,
        },
      );
    }
    return null;
  }
  const text = body.choices?.[0]?.message?.content ?? null;
  if (text && supabase) {
    await logAppEvent(
      supabase,
      profileId ?? null,
      "openai",
      "info",
      `Generated JSON with ${model}`,
      undefined,
      {
        model,
        modelEnvName,
        birthPackPhase: birthPackPhase ?? null,
        promptLength: systemInstruction.length + userText.length,
        outputLength: text.length,
        maxCompletionTokens: maxTokens,
      },
    );
  }
  return text ? { text, provider: "openai", model } : null;
}
