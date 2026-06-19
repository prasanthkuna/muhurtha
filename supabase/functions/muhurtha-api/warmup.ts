import {
  DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS,
  DEFAULT_GEMINI_MODEL,
  geminiGenerateJsonEnvelope,
} from "./gemini_json.ts";
import { openAiGenerateJsonEnvelope } from "./openai_json.ts";
import {
  DEFAULT_BIRTH_PACK_OPENROUTER_MODEL,
  resolveBirthPackMaxTokens,
  resolveBirthPackSectionMaxTokens,
} from "./openrouter_json.ts";

/** Touch heavy modules so the first user request is not a cold start. */
async function touchModuleGraph(): Promise<void> {
  await import("./engine.ts");
  await import("./birth_intelligence_pack.ts");
  await import("./birth_pack_multiturn.ts");
  await import("./content_llm.ts");
  await import("./ask_llm.ts");
  await import("./planner.ts");
  await import("./ephemeris.ts");
}

function envCheck(name: string): boolean {
  return Boolean(Deno.env.get(name)?.trim());
}

export type WarmupOptions = {
  /** Probe primary LLM with a tiny JSON hello. Default true on deploy. */
  probeLlm?: boolean;
};

export async function runWarmup(opts?: WarmupOptions): Promise<Record<string, unknown>> {
  const started = Date.now();
  const probeLlm = opts?.probeLlm ?? true;

  await touchModuleGraph();

  const secrets = {
    OPENROUTER_API_KEY: envCheck("OPENROUTER_API_KEY"),
    GEMINI_API_KEY: envCheck("GEMINI_API_KEY"),
    OPENAI_API_KEY: envCheck("OPENAI_API_KEY"),
    SUPABASE_URL: envCheck("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: envCheck("SUPABASE_SERVICE_ROLE_KEY"),
  };
  const secretsOk = secrets.OPENAI_API_KEY || secrets.OPENROUTER_API_KEY;

  const config = {
    birthPackPrimary: Deno.env.get("BIRTH_PACK_PRIMARY")?.trim() || "openai",
    birthPackOpenAiModel: Deno.env.get("BIRTH_PACK_MODEL")?.trim() ||
      Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-5.4-mini",
    birthPackOpenRouterModel: Deno.env.get("BIRTH_PACK_OPENROUTER_MODEL")?.trim() ||
      DEFAULT_BIRTH_PACK_OPENROUTER_MODEL,
    birthPackMaxCompletionTokens: resolveBirthPackMaxTokens(),
    birthPackSectionMaxTokens: resolveBirthPackSectionMaxTokens("core_identity"),
    birthPackMode: "openai-mini-3phase",
    geminiModel: Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_GEMINI_MODEL,
    birthPackGeminiModel: Deno.env.get("BIRTH_PACK_GEMINI_MODEL")?.trim() ||
      Deno.env.get("GEMINI_MODEL")?.trim() ||
      DEFAULT_GEMINI_MODEL,
    birthPackGeminiMaxOutput: DEFAULT_BIRTH_PACK_MAX_OUTPUT_TOKENS,
    geminiFallback: secrets.GEMINI_API_KEY,
    openAiFallback: envCheck("OPENAI_API_KEY") &&
      Deno.env.get("DISABLE_OPENAI")?.trim().toLowerCase() !== "true",
  };

  let llm: Record<string, unknown> | null = null;
  if (probeLlm && secrets.OPENAI_API_KEY) {
    const llmStarted = Date.now();
    const envelope = await openAiGenerateJsonEnvelope(
      'Return valid JSON only: {"greeting":string,"model_check":string}. Write one short Sakha hello.',
      JSON.stringify({ task: "warmup_probe", phase: "core_identity" }),
      {
        modelEnvName: "BIRTH_PACK_MODEL",
        birthPackPhase: "core_identity",
      },
    );
    llm = {
      ok: Boolean(envelope),
      elapsedMs: Date.now() - llmStarted,
      provider: envelope?.provider ?? null,
      model: envelope?.model ?? null,
      sample: envelope?.text?.slice(0, 180) ?? null,
    };
    if (!envelope && secrets.GEMINI_API_KEY) {
      const fbStarted = Date.now();
      const fb = await geminiGenerateJsonEnvelope(
        'Return valid JSON only: {"greeting":string,"model_check":string}. Write one short Sakha hello.',
        JSON.stringify({ task: "warmup_probe_gemini_fallback" }),
        { modelEnvName: "BIRTH_PACK_GEMINI_MODEL", birthPackPhase: "core_identity" },
      );
      llm = {
        ...llm,
        fallbackOk: Boolean(fb),
        fallbackElapsedMs: Date.now() - fbStarted,
        fallbackProvider: fb?.provider ?? null,
        fallbackModel: fb?.model ?? null,
        fallbackSample: fb?.text?.slice(0, 180) ?? null,
      };
    }
  }

  const llmOk = !probeLlm || (llm != null && (
    (llm as { ok?: boolean }).ok === true ||
    (llm as { fallbackOk?: boolean }).fallbackOk === true
  ));
  const ok = secretsOk && llmOk;

  return {
    ok,
    service: "muhurtha-api",
    warmedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    secrets,
    config,
    llm,
    recommendation: ok
      ? "Deploy warm-up passed. Nemotron (OpenRouter) primary for birth pack; Gemini fallback."
      : !secretsOk
      ? "Missing OPENROUTER_API_KEY on the project."
      : "Module graph loaded but Nemotron probe failed. Check app_logs and OpenRouter model availability.",
  };
}
