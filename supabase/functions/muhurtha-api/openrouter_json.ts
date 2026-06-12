import type { SupabaseClient } from "@supabase/supabase-js";
import type { JsonGenerationEnvelope } from "./openai_json.ts";
import { logAppEvent } from "./engine.ts";

const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

const ALTERNATE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-3.3-70b-instruct:free",
];

type OpenRouterChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number };
};

function resolveModel(modelEnvName?: string): string {
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("OPENROUTER_MODEL")?.trim() ||
    DEFAULT_OPENROUTER_MODEL;
}

export async function openRouterGenerateJsonEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: {
    modelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
  },
): Promise<JsonGenerationEnvelope | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not found in environment");
    return null;
  }
  
  const primaryModel = resolveModel(opts?.modelEnvName);
  const supabase = opts?.supabase;
  const profileId = opts?.profileId;

  // Internal helper to try a specific model
  async function tryModel(modelName: string): Promise<JsonGenerationEnvelope | null> {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://muhurta.app",
          "X-Title": "Muhurta",
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.72,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userText },
          ],
        }),
      });

      if (res.status === 429) {
        console.warn(`OpenRouter 429 (Rate Limit) for ${modelName}`);
        return null; // Signals retry loop to try next
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`OpenRouter JSON HTTP (${modelName})`, res.status, errorText);
        if (supabase) {
          await logAppEvent(
            supabase,
            profileId ?? null,
            "openrouter",
            "error",
            "OpenRouter JSON HTTP error",
            undefined,
            {
              model: modelName,
              status: res.status,
              error: errorText.slice(0, 1200),
            },
          );
        }
        return null;
      }

      const body = await res.json() as OpenRouterChatResponse;
      if (body.error?.message) {
        // If the error is specifically a rate limit in the body
        if (body.error.code === 429) {
          console.warn(`OpenRouter 429 (Provider Rate Limit) for ${modelName}: ${body.error.message}`);
          return null;
        }
        console.error(`OpenRouter JSON error (${modelName})`, body.error.message);
        if (supabase) {
          await logAppEvent(
            supabase,
            profileId ?? null,
            "openrouter",
            "error",
            "OpenRouter JSON API error",
            undefined,
            {
              model: modelName,
              code: body.error.code,
              error: body.error.message.slice(0, 1200),
            },
          );
        }
        return null;
      }

      const text = body.choices?.[0]?.message?.content ?? null;
      if (text && supabase) {
        await logAppEvent(supabase, profileId ?? null, "openrouter", "info", `Generated JSON with ${modelName}`, undefined, {
          model: modelName,
          promptLength: systemInstruction.length + userText.length,
        });
      }
      return text ? { text, provider: "openrouter", model: modelName } : null;
    } catch (e) {
      console.error(`OpenRouter Fetch Error (${modelName}): ${e}`);
      return null;
    }
  }

  // 1. Try Primary
  let result = await tryModel(primaryModel);
  if (result) return result;

  // 2. If primary failed, try alternates (skip duplicate primary).
  for (const alt of ALTERNATE_MODELS) {
    if (alt === primaryModel) continue;
    console.info(`Retrying OpenRouter with alternate model: ${alt}`);
    result = await tryModel(alt);
    if (result) return result;
  }

  return null;
}
