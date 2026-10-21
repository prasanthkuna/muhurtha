import type { AppLocale } from "@/lib/locale";

const POLL_MS = 2500;
const MAX_WAIT_MS = 120_000;

export async function runChartGeneration(
  locale: AppLocale,
  chartProfileId?: string | null,
): Promise<void> {
  const genRes = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chart_generate",
      locale,
      ...(chartProfileId ? { chart_profile_id: chartProfileId } : {}),
    }),
  });
  if (!genRes.ok) {
    const json = (await genRes.json()) as Record<string, unknown>;
    throw new Error(json.error?.toString() ?? "Could not start your reading");
  }

  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const packRes = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "birth_pack_get",
        locale,
        may_generate: false,
        ...(chartProfileId ? { chart_profile_id: chartProfileId } : {}),
      }),
    });
    if (packRes.ok) return;
    const json = (await packRes.json()) as Record<string, unknown>;
    const code = json.error_code?.toString() ?? "";
    if (code !== "birth_pack_not_ready") {
      throw new Error(json.error?.toString() ?? "Reading not ready");
    }
  }
  throw new Error("Your reading is still preparing — open Decode in a moment.");
}
