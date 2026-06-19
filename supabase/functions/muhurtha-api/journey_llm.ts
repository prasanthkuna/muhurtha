/**
 * Batched LLM Journey and Quick Proof cards. Grounded in planner facts.
 */
import { generateJsonWithFallbackEnvelope } from "./gemini_json.ts";
import type { AppLocale } from "./vedic_labels.ts";
import type { PhasePlan } from "./planner.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const JOURNEY_PROMPT_VERSION = "v6-age-language-kernel";

export type JourneyLlmCard = {
  id: number;
  title: string;
  highlight?: string;
  sentences: string[];
  share_hook?: string;
};

export type JourneyLlmEnvelope = {
  cards: Map<number, JourneyLlmCard>;
  provider: string;
  model: string;
  promptVersion: string;
};

type JourneyMode = "journey" | "proof";

function modeRules(mode: JourneyMode) {
  if (mode === "proof") {
    return {
      description:
        "These cards are for onboarding proof. They should feel instantly recognisable from lived experience.",
      shape:
        `Output ONLY valid JSON: {"cards":[{"id":number,"title":string,"highlight":string,"share_hook":string,"sentences":[string,string]}]}`,
      rules: [
        "highlight: one sharp line, 8-18 words, the most recognisable part of the phase.",
        "share_hook: one screenshot-worthy line, 10-20 words, past tense for past cards.",
        "sentences: exactly 2 short sentences. The first should mention 1 or 2 concrete life areas. The second should explain how it showed up in daily life.",
      ],
    };
  }
  return {
    description:
      "These cards are for a Journey timeline. They should explain the phase clearly without sounding generic.",
    shape:
      `Output ONLY valid JSON: {"cards":[{"id":number,"title":string,"highlight":string,"share_hook":string,"sentences":[string,string]}]}`,
    rules: [
      "highlight: one sharp line, 7-16 words, the strongest lived truth of the phase.",
      "share_hook: one screenshot-worthy line, 10-20 words, rooted in the same phase facts.",
      "sentences: exactly 2 short sentences. The first must say what likely changed in normal life. The second must say what the phase taught or asked from them.",
    ],
  };
}

function journeySystem(loc: AppLocale, mode: JourneyMode, age?: number): string {
  const lang = loc === "te"
    ? "Write ONLY in simple spoken Telugu script. No English words except names. Short and natural."
    : loc === "hi"
    ? "Write ONLY in simple spoken Hindi (Devanagari). Short and natural."
    : "Write ONLY in plain Indian English. Short and relatable.";
  const ageContext = age
    ? `\n- The user is ${age} years old. Tailor the life events (career, family, status) to this age group.`
    : "";
  const cfg = modeRules(mode);
  return `You write ${mode === "proof" ? "Quick Proof" : "Journey"} cards for a Vedic timing app.
${lang}
${cfg.description}
Hard rules:
- The JSON "periods" are the only source of truth for planets, dates, domains, pulse, and transition. Never change those facts.
- If a card has tense="past", write fully in past tense as lived memory. If tense="current", write in present tense. If tense="future", write in future tense.
- Reflective and grounded. No medical, legal, or investment advice. No fatalism.
- Make each card feel rooted in Indian daily life: work, money, family, status, health, study, property, speech, travel, peace of mind, or relationships.
- Avoid vague phrases like "cosmic", "destiny", "higher purpose", "portal", or "storyline".
- Avoid repeated closing advice across cards. No repeated generic last sentence.
- Title: readable and specific, 2-5 words.
- Anti-repetition: unique title and opening per card; if avoid_repeating_snippets is present, avoid those stems.
- Use kernel_signals, life_stage, domain_lenses, and share_seed when present.
- Every card must use at least one concrete personalization clue from kernel_signals, life_stage, domain_lenses, daily_texture, or evidence_line.
- If kernel_signals mention a major chapter ending or next chapter, make the card feel like a life transition, not a generic period.
- If Nakshatra archetype signals appear, translate them into lived behaviour: work style, speech pattern, stress pattern, craft, family duty, money, health rhythm, or peace of mind.
- Do not expose engine terms like domain_lenses, pressure themes, planner, pulse, support themes.
- Do not over-explain. One useful line is better than three generic lines.
- Use the planner facts. Do not write generic motivational astrology.${ageContext}
${cfg.rules.join("\n- ")}

${cfg.shape}`;
}

function snippetHooks(text: string, maxHooks: number): string[] {
  const t = text.trim();
  if (t.length < 12) return [];
  const hooks: string[] = [t.slice(0, 48).toLowerCase()];
  if (t.length > 56) hooks.push(t.slice(-40).toLowerCase());
  return hooks.slice(0, maxHooks);
}

function normalizeCard(c: JourneyLlmCard): JourneyLlmCard | null {
  if (typeof c.id !== "number" || typeof c.title !== "string") return null;
  if (!Array.isArray(c.sentences)) return null;
  const seen = new Set<string>();
  const sentences: string[] = [];
  for (const sentence of c.sentences.map((x) => String(x).trim()).filter(Boolean)) {
    const key = sentence.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    sentences.push(sentence);
    if (sentences.length === 2) break;
  }
  if (sentences.length === 0) return null;
  return {
    id: c.id,
    title: c.title.trim(),
    highlight: typeof c.highlight === "string" ? c.highlight.trim() : undefined,
    share_hook: typeof c.share_hook === "string" ? c.share_hook.trim() : undefined,
    sentences,
  };
}

async function journeyBatch(
  loc: AppLocale,
  bodyObj: Record<string, unknown>,
  mode: JourneyMode,
  age?: number,
  opts?: { supabase?: SupabaseClient; profileId?: string },
) {
  const raw = await generateJsonWithFallbackEnvelope(
    journeySystem(loc, mode, age),
    JSON.stringify(bodyObj),
    {
      geminiModelEnvName: "JOURNEY_GEMINI_MODEL",
      openAiModelEnvName: "JOURNEY_LLM_MODEL",
      supabase: opts?.supabase,
      profileId: opts?.profileId,
    },
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.text) as { cards?: JourneyLlmCard[] };
    return {
      cards: Array.isArray(parsed.cards) ? parsed.cards : null,
      provider: raw.provider,
      model: raw.model,
    };
  } catch {
    return null;
  }
}

async function generatePhaseCards(
  plans: PhasePlan[],
  loc: AppLocale,
  mode: JourneyMode,
  age?: number,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<JourneyLlmEnvelope | null> {
  const hasGemini = Boolean(Deno.env.get("GEMINI_API_KEY") ?? "");
  const hasOpenAi = Boolean(Deno.env.get("OPENAI_API_KEY") ?? "");
  if (!hasGemini && !hasOpenAi) {
    console.warn(`${mode} LLM unavailable: no provider key configured`);
    return null;
  }

  const chunkSize = 10;
  const merged = new Map<number, JourneyLlmCard>();
  const avoid: string[] = [];
  let provider = "";
  let model = "";

  for (let c = 0; c < plans.length; c += chunkSize) {
    const slice = plans.slice(c, c + chunkSize);
    const payload = slice.map((plan) => ({
      id: plan.id,
      period_label: plan.periodLabel,
      tense: plan.tense,
      mahadasha: plan.mahadashaLord,
      antardasha: plan.antardashaLord,
      active_domains: plan.activeDomains,
      support_themes: plan.supportThemes,
      pressure_themes: plan.pressureThemes,
      daily_texture: plan.dailyTexture,
      phase_pulse: plan.phasePulse,
      kernel_signals: plan.kernelSignals,
      life_stage: plan.lifeStage,
      domain_lenses: plan.domainLenses,
      share_seed: plan.shareHook,
      transition_note: plan.transitionNote,
      evidence_line: plan.evidenceLine,
      confidence_label: plan.confidenceLabel,
    }));
    const batch = await journeyBatch(
      loc,
      {
        periods: payload,
        avoid_repeating_snippets: avoid.slice(-36),
      },
      mode,
      age,
      opts,
    );
    if (!batch?.cards) {
      console.warn(`${mode} LLM batch produced no result from either provider`);
      continue;
    }
    provider ||= batch.provider;
    model ||= batch.model;
    for (const card of batch.cards) {
      const norm = normalizeCard(card);
      if (!norm) continue;
      merged.set(norm.id, norm);
      avoid.push(...snippetHooks(norm.title, 1));
      if (norm.highlight) avoid.push(...snippetHooks(norm.highlight, 1));
      for (const line of norm.sentences) avoid.push(...snippetHooks(line, 1));
    }
  }

  if (merged.size === 0) return null;
  return {
    cards: merged,
    provider,
    model,
    promptVersion: JOURNEY_PROMPT_VERSION,
  };
}

export function generateJourneyLlmCards(
  plans: PhasePlan[],
  loc: AppLocale,
  age?: number,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<JourneyLlmEnvelope | null> {
  return generatePhaseCards(plans, loc, "journey", age, opts);
}

export function generateProofLlmCards(
  plans: PhasePlan[],
  loc: AppLocale,
  age?: number,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<JourneyLlmEnvelope | null> {
  return generatePhaseCards(plans, loc, "proof", age, opts);
}
