import { openAiAllowed } from "./llm_policy.ts";
import { lunaProbe, readingModel } from "./openai_responses.ts";

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
  /** Probe Luna with a tiny streamed hello. Default true on deploy. */
  probeLlm?: boolean;
};

export async function runWarmup(opts?: WarmupOptions): Promise<Record<string, unknown>> {
  const started = Date.now();
  const probeLlm = opts?.probeLlm ?? true;
  await touchModuleGraph();
  const secrets = {
    OPENAI_API_KEY: envCheck("OPENAI_API_KEY"),
    SUPABASE_URL: envCheck("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: envCheck("SUPABASE_SERVICE_ROLE_KEY"),
  };
  const llm = probeLlm && openAiAllowed() ? await lunaProbe("none") : null;
  const ok = secrets.OPENAI_API_KEY && (!probeLlm || (llm as { ok?: boolean } | null)?.ok === true);
  return {
    ok,
    service: "muhurtha-api",
    warmedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    secrets,
    config: { model: readingModel(), only_model: true },
    llm,
    recommendation: ok ? "Warm-up passed on gpt-6-luna." : !secrets.OPENAI_API_KEY ? "OPENAI_API_KEY is missing on the project." : "Luna probe failed; check app_logs.",
  };
}
