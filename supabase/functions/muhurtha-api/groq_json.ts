import type { SupabaseClient } from "@supabase/supabase-js";
import type { JsonGenerationEnvelope } from "./openai_json.ts";
import { logAppEvent } from "./engine.ts";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

// Pro-grade fallback list (Updated May 2026 for active models only)
const ALTERNATE_GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
];

type GroqChatResponse = {
  choices?: { 
    message?: { content?: string };
    finish_reason?: string;
  }[];
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  error?: { message?: string; code?: string; type?: string; failed_generation?: string };
};

function resolveModel(modelEnvName?: string): string {
  const fromEnv = modelEnvName ? Deno.env.get(modelEnvName)?.trim() : null;
  return fromEnv ||
    Deno.env.get("GROQ_MODEL")?.trim() ||
    DEFAULT_GROQ_MODEL;
}

export async function groqGenerateJsonEnvelope(
  systemInstruction: string,
  userText: string,
  opts?: {
    modelEnvName?: string;
    supabase?: SupabaseClient;
    profileId?: string;
  },
): Promise<JsonGenerationEnvelope | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
  if (!apiKey) {
    console.warn("GROQ_API_KEY not found in environment");
    if (opts?.supabase) {
      await logAppEvent(
        opts.supabase,
        opts.profileId ?? null,
        "groq",
        "error",
        "GROQ_API_KEY missing",
      );
    }
    return null;
  }

  const primaryModel = resolveModel(opts?.modelEnvName);
  const supabase = opts?.supabase;
  const profileId = opts?.profileId;

  async function tryModel(modelName: string): Promise<JsonGenerationEnvelope | null> {
    try {
      // PRO TIP: Groq JSON mode REQUIREMENT is extremely strict. 
      // We must explicitly demand JSON and provide a zero-tolerance instruction for syntax.
      const finalSystem = systemInstruction + 
        "\n\nCRITICAL: You must return a valid JSON object. Do not include any markdown formatting, backticks, or preamble. Use standard JSON key-value syntax (e.g., \"key\": [value]).";

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Muhurta Pro",
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.1, // Lower temperature for more stable JSON formatting
          stream: false, 
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: finalSystem },
            { role: "user", content: userText },
          ],
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        console.warn(`Groq 429 (Rate Limit) for ${modelName}. Retry-After: ${retryAfter || "unknown"}`);
        return null;
      }

      const responseText = await res.text();
      if (!res.ok) {
        console.error(`Groq JSON HTTP (${modelName}) Status: ${res.status}`, responseText);
        if (supabase) {
          await logAppEvent(
            supabase,
            profileId ?? null,
            "groq",
            "error",
            "Groq JSON HTTP error",
            undefined,
            {
              model: modelName,
              status: res.status,
              error: responseText.slice(0, 1200),
            },
          );
        }
        return null;
      }

      const body = JSON.parse(responseText) as GroqChatResponse;
      if (body.error) {
        console.error(`Groq API Error (${modelName}):`, body.error.message);
        if (body.error.failed_generation) {
          console.error("Failed Generation Snippet:", body.error.failed_generation.substring(0, 100));
        }
        return null;
      }

      const text = body.choices?.[0]?.message?.content ?? null;
      if (text && supabase) {
        await logAppEvent(supabase, profileId ?? null, "groq", "info", `Generated JSON with ${modelName}`, undefined, {
          model: modelName,
          promptLength: finalSystem.length + userText.length,
          tokens: body.usage?.total_tokens,
          finishReason: body.choices?.[0]?.finish_reason,
        });
      }
      return text ? { text, provider: "groq", model: modelName } : null;
    } catch (e) {
      console.error(`Groq Fetch/Parse Error (${modelName}): ${e}`);
      return null;
    }
  }

  // 1. Try Primary
  let result = await tryModel(primaryModel);
  if (result) return result;

  // 2. Pro Fallback: Immediate rotation through confirmed ACTIVE models
  for (const alt of ALTERNATE_GROQ_MODELS) {
    if (alt === primaryModel) continue;
    console.info(`Rotating to alternate Groq model: ${alt}`);
    result = await tryModel(alt);
    if (result) return result;
  }

  return null;
}
