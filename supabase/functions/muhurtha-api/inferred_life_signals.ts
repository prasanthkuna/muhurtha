import type { PersonalizationKernel } from "./personalization_kernel.ts";

function safeString(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export function intentFingerprint(
  intent: Record<string, unknown> | null | undefined,
): string {
  const main = safeString(intent?.main_concern);
  const purpose = safeString(intent?.last_purpose);
  const joined = [main, purpose].filter(Boolean).join("|");
  return joined || "none";
}

function ageBand(age: number): string {
  if (age < 22) return "student";
  if (age < 30) return "early_career";
  if (age < 40) return "family_builder";
  if (age < 55) return "mid_career";
  return "mature";
}

const RELATIONSHIP_LORDS = new Set(["Venus", "Jupiter", "Moon"]);
const CAREER_LORDS = new Set(["Saturn", "Mercury", "Mars", "Sun"]);
const MONEY_LORDS = new Set(["Jupiter", "Venus", "Mercury"]);
const FAMILY_LORDS = new Set(["Moon", "Jupiter", "Venus"]);

export function inferLifeSignals(
  kernel: PersonalizationKernel | undefined,
  age: number,
  intent: Record<string, unknown> | null | undefined,
) {
  const themes: string[] = [];
  const adLord = kernel?.period.antardashaLord ?? "";
  const mdLord = kernel?.period.mahadashaLord ?? "";
  const lifeStage = kernel?.lifeStage ?? ageBand(age);

  if (age < 28) themes.push("growth_and_direction");
  if (age >= 25 && age < 40) themes.push("career_and_family_forming");
  if (age >= 35) themes.push("stability_and_responsibility");

  if (RELATIONSHIP_LORDS.has(adLord) || RELATIONSHIP_LORDS.has(mdLord)) {
    themes.push("relationship_marriage_timing");
  }
  if (CAREER_LORDS.has(adLord)) themes.push("work_career_pressure");
  if (MONEY_LORDS.has(adLord)) themes.push("money_restructuring");
  if (FAMILY_LORDS.has(adLord)) themes.push("family_duty");

  const domainKeys = (kernel?.domains ?? []).map((d) => d.key).slice(0, 4);

  return {
    source: "chart_inference",
    life_stage: lifeStage,
    age_band: ageBand(age),
    active_themes: [...new Set(themes)].slice(0, 6),
    dasha_emphasis: {
      mahadasha: mdLord || undefined,
      antardasha: adLord || undefined,
      stage: kernel?.period.stage,
    },
    domain_signals: domainKeys,
    user_confirmed: {
      main_concern: safeString(intent?.main_concern) || undefined,
      last_purpose: safeString(intent?.last_purpose) || undefined,
    },
  };
}
