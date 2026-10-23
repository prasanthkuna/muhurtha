import type { AppLocale } from "@/lib/locale";

const POLL_MS = 2500;
/** After this, hand off to the app: Decode/Today show a "preparing" state and keep polling. */
const MAX_WAIT_MS = 90_000;

async function postEngine(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

/**
 * Starts the reading and waits for it while it is quick. The pack is generated in phases and
 * each phase only advances while something drives it, so the poll uses `ensure: true` (the
 * engine nudges the next phases in the background). Once birth details are saved we never
 * bounce the user back to the form: slow LLM providers just mean we continue into the app,
 * which shows the preparing state until the reading lands.
 */
export async function runChartGeneration(
  locale: AppLocale,
  chartProfileId?: string | null,
): Promise<void> {
  const scope = chartProfileId ? { chart_profile_id: chartProfileId } : {};
  const gen = await postEngine({ action: "chart_generate", locale, ...scope });
  if (!gen.res.ok) {
    const code = gen.json.error_code?.toString() ?? "";
    // Missing/invalid input is a real error; provider hiccups are retried by the poll below.
    if (gen.res.status >= 400 && gen.res.status < 500 && code !== "birth_pack_not_ready") {
      throw new Error(gen.json.error?.toString() ?? "Could not start your reading");
    }
  }

  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const { res, json } = await postEngine({
      action: "birth_pack_get",
      locale,
      may_generate: false,
      ensure: true,
      ...scope,
    });
    if (res.ok && json.generating !== true) return;
    if (res.ok) continue;
    const code = json.error_code?.toString() ?? "";
    if (code !== "birth_pack_not_ready" && res.status < 500) {
      throw new Error(json.error?.toString() ?? "Reading not ready");
    }
  }
  // Still generating: continue into the app; it keeps polling and shows "preparing".
}
