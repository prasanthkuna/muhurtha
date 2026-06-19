import type { SupabaseClient } from "@supabase/supabase-js";
import type { JsonGenerationEnvelope } from "./openai_json.ts";
import { logAppEvent } from "./engine.ts";

/** Default for Ask / Today / small JSON. */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

/** Birth pack dossier — Nano primary, Super secondary. */
export const DEFAULT_BIRTH_PACK_OPENROUTER_MODEL =
  "nvidia/nemotron-3-nano-30b-a3b:free";

export const OPENROUTER_BIRTH_PACK_ALTERNATES = [
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

/** Small-call fallback when Nano is unavailable. */
export const OPENROUTER_DEFAULT_ALTERNATES = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/owl-alpha",
] as const;

type OpenRouterChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number };
};

function resolveModel(modelEnvName?: string, birthPack = false): string {
  if (birthPack) {
    const fromEnv = modelEnvName
      ? Deno.env.get(modelEnvName)?.trim()
      : null;
    return fromEnv ||
      Deno.env.get("BIRTH_PACK_OPENROUTER_MODEL")?.trim() ||
      DEFAULT_BIRTH_PACK_OPENROUTER_MODEL;
  }
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("OPENROUTER_MODEL")?.trim() ||
    DEFAULT_OPENROUTER_MODEL;
}

export function resolveBirthPackMaxTokens(): number {
  const parsed = Number(
    Deno.env.get("BIRTH_PACK_MAX_COMPLETION_TOKENS") ?? "36000",
  );
  if (!Number.isFinite(parsed) || parsed < 4096) return 36000;
  return Math.floor(parsed);
}

/** Per multiturn phase cap (Nemotron section calls). */
export function resolveBirthPackSectionMaxTokens(phase?: string): number {
  if (!phase) return resolveBirthPackMaxTokens();
  if (phase === "life_map_journey" || phase === "playbook") {
    return resolveBirthPackMaxTokens();
  }
  const parsed = Number(
    Deno.env.get("BIRTH_PACK_SECTION_MAX_TOKENS") ?? "24576",
  );
  if (!Number.isFinite(parsed) || parsed < 4096) return 24576;
  return Math.floor(parsed);
}

export async function openRouterGenerateJsonEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: {
    modelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
    /** Birth pack: use BIRTH_PACK_OPENROUTER_MODEL + 36k max_tokens. */
    birthPack?: boolean;
    /** Multi-turn birth pack phase label (for logs + section token cap). */
    birthPackPhase?: string;
    maxTokens?: number;
    alternateModels?: readonly string[];
  },
): Promise<JsonGenerationEnvelope | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not found in environment");
    return null;
  }

  const birthPack = opts?.birthPack ?? false;
  const primaryModel = resolveModel(opts?.modelEnvName, birthPack);
  const alternates = opts?.alternateModels ??
    (birthPack
      ? OPENROUTER_BIRTH_PACK_ALTERNATES
      : OPENROUTER_DEFAULT_ALTERNATES);
  const maxTokens = opts?.maxTokens ??
    (opts?.birthPackPhase
      ? resolveBirthPackSectionMaxTokens(opts.birthPackPhase)
      : birthPack
      ? resolveBirthPackMaxTokens()
      : undefined);
  const supabase = opts?.supabase;
  const profileId = opts?.profileId;
  const retryOn429 = birthPack ? 3 : 1;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function tryModel(
    modelName: string,
  ): Promise<JsonGenerationEnvelope | null> {
    for (let attempt = 0; attempt < retryOn429; attempt++) {
      try {
        const payload: Record<string, unknown> = {
        model: modelName,
        temperature: 0.72,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userText },
        ],
      };
      if (maxTokens != null) {
        payload.max_tokens = maxTokens;
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://muhurta.app",
          "X-Title": "Muhurta",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        console.warn(
          `OpenRouter 429 (Rate Limit) for ${modelName} attempt ${attempt + 1}/${retryOn429}`,
        );
        if (attempt < retryOn429 - 1) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (supabase && birthPack) {
          await logAppEvent(
            supabase,
            profileId ?? null,
            "openrouter",
            "warn",
            "OpenRouter 429 rate limit",
            undefined,
            {
              model: modelName,
              birthPack,
              birthPackPhase: opts?.birthPackPhase ?? null,
            },
          );
        }
        return null;
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
              birthPack,
              maxTokens,
              birthPackPhase: opts?.birthPackPhase ?? null,
            },
          );
        }
        return null;
      }

      const body = await res.json() as OpenRouterChatResponse;
      if (body.error?.message) {
        if (body.error.code === 429) {
          console.warn(
            `OpenRouter 429 (Provider Rate Limit) for ${modelName}: ${body.error.message}`,
          );
          if (attempt < retryOn429 - 1) {
            await sleep(2000 * (attempt + 1));
            continue;
          }
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
              birthPack,
              birthPackPhase: opts?.birthPackPhase ?? null,
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
          "openrouter",
          "info",
          `Generated JSON with ${modelName}`,
          undefined,
          {
            model: modelName,
            promptLength: systemInstruction.length + userText.length,
            outputLength: text.length,
            maxTokens,
            birthPack,
            birthPackPhase: opts?.birthPackPhase ?? null,
          },
        );
      }
      return text ? { text, provider: "openrouter", model: modelName } : null;
      } catch (e) {
        console.error(`OpenRouter Fetch Error (${modelName}): ${e}`);
        if (attempt < retryOn429 - 1) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        return null;
      }
    }
    return null;
  }

  let result = await tryModel(primaryModel);
  if (result) return result;

  for (const alt of alternates) {
    if (alt === primaryModel) continue;
    console.info(`Retrying OpenRouter with alternate model: ${alt}`);
    result = await tryModel(alt);
    if (result) return result;
  }

  return null;
}
