import { geminiGenerateJsonEnvelope } from "./gemini_json.ts";
import { openAiGenerateJsonEnvelope } from "./openai_json.ts";

/** Candidate low-cost models (Oct 2026 pricing docs). */
const GEMINI_CANDIDATES = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
] as const;

const OPENAI_CANDIDATES = [
  "gpt-5-nano",
  "gpt-4o-mini",
  "gpt-5.4-mini",
] as const;

const PROBE_SYSTEM =
  'Return valid JSON only: {"greeting":string,"model_check":string,"phase_hint":string}. Write one short Sakha hello for a birth decode warmup.';
const PROBE_USER = JSON.stringify({
  task: "low_cost_model_smoke",
  phase: "core_identity",
});

type ProbeRow = {
  provider: "gemini" | "openai";
  model: string;
  ok: boolean;
  elapsedMs: number;
  sample?: string | null;
  error?: string | null;
};

async function probeGemini(model: string): Promise<ProbeRow> {
  const started = Date.now();
  try {
    const envelope = await geminiGenerateJsonEnvelope(
      PROBE_SYSTEM,
      PROBE_USER,
      {
        modelOverride: model,
        modelEnvName: "BIRTH_PACK_GEMINI_MODEL",
        birthPackPhase: "core_identity",
      },
    );
    return {
      provider: "gemini",
      model,
      ok: Boolean(envelope?.text),
      elapsedMs: Date.now() - started,
      sample: envelope?.text?.slice(0, 220) ?? null,
      error: envelope ? null : "no envelope",
    };
  } catch (e) {
    return {
      provider: "gemini",
      model,
      ok: false,
      elapsedMs: Date.now() - started,
      error: String(e),
    };
  }
}

async function probeOpenAi(model: string): Promise<ProbeRow> {
  const started = Date.now();
  try {
    const envelope = await openAiGenerateJsonEnvelope(
      PROBE_SYSTEM,
      PROBE_USER,
      {
        modelOverride: model,
        modelEnvName: "BIRTH_PACK_MODEL",
        birthPackPhase: "core_identity",
      },
    );
    return {
      provider: "openai",
      model,
      ok: Boolean(envelope?.text),
      elapsedMs: Date.now() - started,
      sample: envelope?.text?.slice(0, 220) ?? null,
      error: envelope ? null : "no envelope",
    };
  } catch (e) {
    return {
      provider: "openai",
      model,
      ok: false,
      elapsedMs: Date.now() - started,
      error: String(e),
    };
  }
}

export async function smokeTestLowCostModels(): Promise<Record<string, unknown>> {
  const started = Date.now();
  const deployed = {
    gemini: Deno.env.get("BIRTH_PACK_GEMINI_MODEL")?.trim() ||
      Deno.env.get("GEMINI_MODEL")?.trim() ||
      "gemini-3.5-flash",
    openai: Deno.env.get("BIRTH_PACK_MODEL")?.trim() ||
      Deno.env.get("OPENAI_MODEL")?.trim() ||
      "gpt-5.4-mini",
    birthPackPrimary: Deno.env.get("BIRTH_PACK_PRIMARY")?.trim() || "openai",
    disableOpenAi: Deno.env.get("DISABLE_OPENAI")?.trim().toLowerCase() === "true",
  };

  const results: ProbeRow[] = [];
  if (Deno.env.get("GEMINI_API_KEY")?.trim()) {
    for (const model of GEMINI_CANDIDATES) {
      results.push(await probeGemini(model));
    }
  }

  const openAiAllowed = Deno.env.get("OPENAI_API_KEY")?.trim() &&
    !deployed.disableOpenAi;
  if (openAiAllowed) {
    for (const model of OPENAI_CANDIDATES) {
      results.push(await probeOpenAi(model));
    }
  }

  const working = results.filter((r) => r.ok);
  const cheapestWorking = {
    gemini: working.find((r) => r.provider === "gemini")?.model ?? null,
    openai: working.find((r) => r.provider === "openai")?.model ?? null,
  };

  return {
    ok: working.length > 0,
    elapsedMs: Date.now() - started,
    deployed,
    pricingNotes: {
      geminiLowestListed: "gemini-3.1-flash-lite ($0.25/$1.50 per 1M in/out, standard)",
      geminiLegacyLow: "gemini-2.5-flash-lite ($0.10/$0.40 per 1M)",
      openaiLowestListed: "gpt-5-nano ($0.05/$0.40 per 1M)",
    },
    probes: results,
    recommendation: working.length
      ? `For cost: try Gemini ${cheapestWorking.gemini} + OpenAI ${cheapestWorking.openai} (verify birth-pack JSON quality on core_identity before switching secrets).`
      : "No probes succeeded — check API keys and model availability.",
  };
}
