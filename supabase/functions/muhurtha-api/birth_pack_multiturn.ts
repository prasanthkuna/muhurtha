import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJsonWithFallbackEnvelope } from "./gemini_json.ts";
import { tryParseRepairedJson } from "./json_repair.ts";
import type { AppLocale } from "./vedic_labels.ts";
import {
  type BirthIntelligencePackContent,
  type BirthPackEnvelope,
  BIRTH_PACK_VERSION,
  getPackScreensReady,
  validateBirthPackQuality,
} from "./birth_intelligence_pack.ts";

export const PACK_DAILY_DAYS = 30;
export const PACK_WEEKLY_WEEKS = 8;
export const PACK_MONTHLY_MONTHS = 12;

/** Three LLM steps — decode, life map, then all timing/playbook content in one call. */
export const BIRTH_PACK_PHASE_ORDER = [
  "core_identity",
  "life_map_journey",
  "playbook",
] as const;

export type BirthPackPhaseId = typeof BIRTH_PACK_PHASE_ORDER[number];

type PhaseFacts = Record<string, unknown>;

type JourneyFact = {
  periodLabel?: string;
  tense?: string;
  sortOrder?: number;
};

type MultiTurnOpts = {
  supabase?: SupabaseClient;
  profileId?: string;
  llmRef?: { provider: string; model: string };
  existingContent?: BirthIntelligencePackContent;
  maxPhases?: number;
  onPhaseComplete?: (
    phase: string,
    merged: BirthIntelligencePackContent,
    llm: { provider: string; model: string },
  ) => Promise<void>;
};

export type BirthPackAdvanceResult = {
  merged: BirthIntelligencePackContent;
  complete: boolean;
  envelope: BirthPackEnvelope | null;
  phasesRun: string[];
  failedPhase: BirthPackPhaseId | null;
};

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return "Write ONLY in natural Telugu script. Sound like a sharp Telugu friend: simple, scene-based, lightly witty. Never paste English planner labels.";
  }
  if (loc === "hi") {
    return "Write ONLY in simple conversational Hindi (Devanagari).";
  }
  return "Write ONLY in plain Indian English. Sound like a smart Indian friend: direct, practical, lightly witty.";
}

const SHARED_RULES = `
- Use facts only. Never invent exact guaranteed events.
- Never output raw internal words: planner, kernel, provenance, domain_lenses, fact_signature.
- Each section must feel distinct. Do not reuse the same sentence across sections.
- Sound like a sharp Indian friend on WhatsApp: punchy, direct, scene-based. No essay prose.
- BANNED openers: "This phase feels like", "The scene here is", "Picture a", "As of today, this feels".
- Return valid JSON only for the requested keys. No markdown.`;

function slimKernel(kernel: unknown): Record<string, unknown> | undefined {
  if (!kernel || typeof kernel !== "object") return undefined;
  const k = kernel as Record<string, unknown>;
  const natal = k.natal as Record<string, unknown> | undefined;
  const archetype = natal?.archetype as Record<string, unknown> | undefined;
  return {
    lifeStage: k.lifeStage,
    natal: natal
      ? {
        moonSign: natal.moonSign,
        nakshatra: natal.nakshatra,
        archetype: archetype
          ? {
            key: archetype.key,
            core: archetype.core,
            strength: archetype.strength,
            shadow: archetype.shadow,
            workStyle: archetype.workStyle,
            relationshipStyle: archetype.relationshipStyle,
            stressPattern: archetype.stressPattern,
            resetStyle: archetype.resetStyle,
          }
          : undefined,
        signals: Array.isArray(natal.signals)
          ? (natal.signals as string[]).slice(0, 6)
          : [],
      }
      : undefined,
    period: k.period,
    personalSignals: Array.isArray(k.personalSignals)
      ? (k.personalSignals as string[]).slice(0, 8)
      : [],
    shareSeed: k.shareSeed,
  };
}

function slimJourneyPhaseFacts(facts: unknown): Record<string, unknown>[] {
  if (!Array.isArray(facts)) return [];
  return facts.map((row) => {
    const p = row as Record<string, unknown>;
    return {
      sortOrder: p.sortOrder,
      periodLabel: p.periodLabel,
      mahadashaLord: p.mahadashaLord,
      antardashaLord: p.antardashaLord,
      tense: p.tense,
      phasePulse: p.phasePulse,
      transitionNote: p.transitionNote,
      supportThemes: Array.isArray(p.supportThemes)
        ? (p.supportThemes as string[]).slice(0, 3)
        : [],
      pressureThemes: Array.isArray(p.pressureThemes)
        ? (p.pressureThemes as string[]).slice(0, 2)
        : [],
    };
  });
}

/** Phase-specific facts — keeps prompts small and focused. */
export function slimFactsForPhase(
  phase: BirthPackPhaseId,
  facts: PhaseFacts,
): PhaseFacts {
  const base = {
    locale: facts.locale,
    generation_date: facts.generation_date,
    profile: facts.profile,
    birth: facts.birth,
  };
  const dailyFacts = Array.isArray(facts.daily_timing_facts)
    ? facts.daily_timing_facts
    : [];

  switch (phase) {
    case "core_identity":
      return {
        ...base,
        date_range: facts.date_range,
        inferred_life_signals: facts.inferred_life_signals,
        current_life_chapter: facts.current_life_chapter,
        kernel: slimKernel(facts.personalization_kernel),
        journey_phase_facts: slimJourneyPhaseFacts(facts.journey_phase_facts),
      };
    case "life_map_journey":
      return {
        ...base,
        current_life_chapter: facts.current_life_chapter,
        journey_phase_facts: slimJourneyPhaseFacts(facts.journey_phase_facts),
        kernel_period: slimKernel(facts.personalization_kernel)?.period,
      };
    case "playbook":
      return {
        ...base,
        current_life_chapter: facts.current_life_chapter,
        daily_timing_facts: dailyFacts,
        weekly_keys: facts.weekly_keys,
        monthly_keys: facts.monthly_keys,
        date_range: facts.date_range,
        kernel_period: slimKernel(facts.personalization_kernel)?.period,
        inferred_life_signals: facts.inferred_life_signals,
        kernel: slimKernel(facts.personalization_kernel),
      };
    default:
      return base;
  }
}

function phasesDoneSet(content: BirthIntelligencePackContent): Set<string> {
  const done = content._generation?.phases_done ?? [];
  const set = new Set(done);
  if (set.has("playbook")) {
    set.add("today_cards");
    set.add("today_cards_a");
    set.add("today_cards_b");
    set.add("weekly_monthly_timing");
    set.add("extras");
  }
  if (set.has("today_cards")) {
    set.add("today_cards_a");
    set.add("today_cards_b");
  }
  if (set.has("today_cards_a")) {
    set.add("today_cards_a");
  }
  if (
    set.has("extras") ||
    (set.has("today_cards_a") && set.has("today_cards_b") &&
      set.has("weekly_monthly_timing"))
  ) {
    set.add("playbook");
  }
  return set;
}

export function birthPackPhasesRemaining(
  content: BirthIntelligencePackContent,
): BirthPackPhaseId[] {
  const done = phasesDoneSet(content);
  return BIRTH_PACK_PHASE_ORDER.filter((phase) => !done.has(phase));
}

export function nextBirthPackPhase(
  content: BirthIntelligencePackContent,
): BirthPackPhaseId | null {
  const remaining = birthPackPhasesRemaining(content);
  return remaining[0] ?? null;
}

export function isPhaseAdvanceLocked(
  content: BirthIntelligencePackContent,
): boolean {
  const until = content._generation?.advancing_until;
  if (!until) return false;
  const ts = Date.parse(until);
  return Number.isFinite(ts) && ts > Date.now();
}

async function runPhase(
  loc: AppLocale,
  phase: string,
  schemaHint: string,
  facts: PhaseFacts,
  opts?: MultiTurnOpts,
): Promise<Record<string, unknown> | null> {
  const system = `You are Sakha, a premium Indian astrology companion.
${localeLine(loc)}
${SHARED_RULES}

Phase: ${phase}
Output JSON shape:
${schemaHint}`;

  const raw = await generateJsonWithFallbackEnvelope(
    system,
    JSON.stringify({ facts }),
    {
      geminiModelEnvName: "BIRTH_PACK_GEMINI_MODEL",
      openAiModelEnvName: "BIRTH_PACK_MODEL",
      supabase: opts?.supabase,
      profileId: opts?.profileId,
      largePayload: true,
      birthPackPhase: phase,
    },
  );
  if (!raw) return null;

  if (opts?.llmRef) {
    opts.llmRef.provider = raw.provider;
    opts.llmRef.model = raw.model;
  }

  try {
    return JSON.parse(raw.text) as Record<string, unknown>;
  } catch {
    const repaired = tryParseRepairedJson(raw.text);
    if (repaired && typeof repaired === "object") {
      console.warn(`[birth-pack] phase=${phase} JSON repaired len=${raw.text.length}`);
      return repaired as Record<string, unknown>;
    }
    console.error(`[birth-pack] phase=${phase} parse failed len=${raw.text.length}`);
    return null;
  }
}

function journeyCounts(facts: PhaseFacts) {
  const phases = Array.isArray(facts.journey_phase_facts)
    ? facts.journey_phase_facts as JourneyFact[]
    : [];
  return {
    total: phases.length,
    past: phases.filter((p) => p.tense === "past").length,
    future: phases.filter((p) => p.tense === "future").length,
  };
}

function mergePack(
  parts: Record<string, unknown>[],
): BirthIntelligencePackContent {
  const out: BirthIntelligencePackContent = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && Array.isArray((out as Record<string, unknown>)[key])) {
        (out as Record<string, unknown>)[key] = [
          ...((out as Record<string, unknown>)[key] as unknown[]),
          ...value,
        ];
      } else {
        (out as Record<string, unknown>)[key] = value;
      }
    }
  }
  return out;
}

function phasesRecordedForComplete(phase: BirthPackPhaseId): string[] {
  if (phase === "playbook") {
    return [
      "playbook",
      "today_cards",
      "weekly_monthly_timing",
      "extras",
    ];
  }
  return [phase];
}

function withGenerationMeta(
  merged: BirthIntelligencePackContent,
  phase: BirthPackPhaseId,
  prior?: BirthIntelligencePackContent["_generation"],
): BirthIntelligencePackContent {
  const phasesDone = [
    ...new Set([
      ...(prior?.phases_done ?? []),
      ...phasesRecordedForComplete(phase),
    ]),
  ];
  return {
    ...merged,
    _generation: {
      phases_done: phasesDone,
      screens_ready: getPackScreensReady(merged),
      updated_at: new Date().toISOString(),
    },
  };
}

function generationPhaseLabel(phase: BirthPackPhaseId): string {
  return phase;
}

function notifyPhaseName(phase: BirthPackPhaseId): string {
  return generationPhaseLabel(phase);
}

async function notifyPhase(
  opts: MultiTurnOpts | undefined,
  phase: string,
  merged: BirthIntelligencePackContent,
  llm: { provider: string; model: string },
) {
  if (!opts?.onPhaseComplete) return;
  await opts.onPhaseComplete(phase, merged, llm);
}

function phaseSchema(
  phase: BirthPackPhaseId,
  facts: PhaseFacts,
): string {
  const dailyFacts = Array.isArray(facts.daily_timing_facts)
    ? facts.daily_timing_facts
    : [];
  const counts = journeyCounts(facts);

  switch (phase) {
    case "core_identity":
      return `{
  "user_identity": {"headline":string,"summary":string,"moon_marker":string,"strengths":[string],"watchouts":[string],"work_money_pattern":string,"relationship_pattern":string,"stress_reset":string},
  "free_preview": {"decode_hit":string,"today_teaser":string,"share_line":string},
  "subscription_hooks": {"main_hook":string,"locked_map_line":string,"bullets":[string]},
  "me_profile": {"title":string,"summary":string,"share_hook":string,"strengths":[string],"watchouts":[string],"daily_style":string,"characteristics":[string],"relationship_pattern":string,"work_money_pattern":string,"stress_reset_pattern":string},
  "likely_life_events": [{"period_label":string,"event_theme":string,"why_it_may_fit":string,"confidence":"soft"|"medium","pro_locked":boolean}],
  "current_phase": {"title":string,"summary":string,"quality_label":string,"timeline_label":string,"action_line":string,"share_hook":string},
  "category_reports": {"career":{...},"money":{...},"relationship":{...},"family":{...},"business":{...},"health_routine":{...}},
  "today_guidance": {"main_advice":string,"good_window_summary":string,"avoid_window_summary":string,"best_for":[string],"be_careful":[string],"one_remedy":string,"share_line":string}
}
Rules: me_profile.summary <= 45 words. Do not generate past-life period cards here — Life Map phase 2 owns journey chapters.`;
    case "life_map_journey":
      return `{
  "life_map": {"past_chapters":[{"period":string,"theme":string,"career":string,"money":string,"family_relationship":string,"avoid":string,"share_line":string}],"current_chapter":{"period":string,"theme":string,"use_it_for":string,"avoid":string,"share_line":string},"future_chapters":[{"period":string,"theme":string,"career":string,"money":string,"family_relationship":string,"avoid":string,"share_line":string,"locked":boolean}]},
  "journey_phases": [{"sortOrder":number,"periodLabel":string,"mahadashaLord":string,"antardashaLord":string,"title":string,"highlight":string,"sentences":[string],"focusAreas":[string],"tone":[string],"pressureThemes":[string],"phasePulse":string,"transitionNote":string,"evidenceLine":string,"shareHook":string,"kernelSignals":[string],"domainLenses":[string],"proLocked":boolean,"subPhases":[]}]
}
Rules: past_chapters = every facts.journey_phase_facts where tense=past (${counts.past} items, same order). current_chapter = the one facts.journey_phase_facts where tense=current (exactly 1). future_chapters = every tense=future (${counts.future} items). NEVER put current chapter in past_chapters. period/periodLabel must match facts exactly. journey_phases = all ${counts.total} phases sorted by sortOrder. Each phase: title 2-5 words; highlight 8-18 words (punchy, no metaphor openers); sentences = exactly 2 items, each <= 28 words, direct Indian-English; evidenceLine optional <= 20 words. First future chapter proLocked=false; later future proLocked=true.`;
    case "playbook":
      return `{
  "today_cards": [{"key":string,"title":string,"body":string,"one_line":string,"share_hook":string,"better_for":[string],"be_careful":[string],"good_window_notes":[{"category":string,"why_it_works":string,"best_for":[string],"avoid_for":[string],"share_line":string}],"caution_window_notes":[{"category":string,"why_it_works":string,"best_for":[string],"avoid_for":[string],"share_line":string}],"notification_title":string,"notification_body":string}],
  "weekly_cards": [{"key":string,"title":string,"body":string,"share_hook":string,"better_for":[string],"be_careful":[string],"notification_title":string,"notification_body":string}],
  "monthly_cards": [{"key":string,"title":string,"body":string,"share_hook":string,"better_for":[string],"be_careful":[string],"notification_title":string,"notification_body":string}],
  "timing_plan": {"week":{"headline":string,"action_focus":string,"caution":string,"share_line":string},"month":{"headline":string,"strategy":string,"caution":string,"share_line":string},"current_phase":{"headline":string,"use_it_for":string,"avoid":string,"share_line":string}},
  "remedy_cards": [...], "remedy_pack": [...],
  "ask_templates": [{"key":"career|money|relationship|family","question":string,"topics":[string],"direct_answer":string,"best_for":string,"caution":string,"better_option":string,"action_line":string,"share_line":string}],
  "ask_knowledge": {"compact_summary":string,"common_answers":[{"topic":string,"answer":string}],"boundaries":[string]},
  "share_cards": [...],
  "notification_pack": [...], "paywall_copy": {...},
  "notification_copy": {...}, "pro_teasers": {...}, "horizons": {...}
}
Rules: exactly ${PACK_DAILY_DAYS} today_cards matching every facts.daily_timing_facts[i].date in order. Each today_cards[i]: one_line <= 18 words (primary), body <= 35 words (support only), unique per day. Exactly ${PACK_WEEKLY_WEEKS} weekly_cards and ${PACK_MONTHLY_MONTHS} monthly_cards — body <= 50 words each. ask_templates = exactly 4 items with distinct keys (career, money, relationship, family). Each question <= 14 words, ready to tap. Each direct_answer <= 28 words, specific to facts — not meta labels. common_answers = 4 topic-specific one-liners. timing_plan must differ from today_guidance.`;
    default:
      return "{}";
  }
}

async function runSinglePhase(
  loc: AppLocale,
  phase: BirthPackPhaseId,
  facts: PhaseFacts,
  opts: MultiTurnOpts,
): Promise<Record<string, unknown> | null> {
  return runPhase(
    loc,
    phase,
    phaseSchema(phase, facts),
    slimFactsForPhase(phase, facts),
    opts,
  );
}

/**
 * Run the next [maxPhases] birth-pack LLM steps, resuming from existing partial content.
 */
export async function advanceBirthPackPhases(
  loc: AppLocale,
  facts: PhaseFacts,
  opts?: MultiTurnOpts,
): Promise<BirthPackAdvanceResult> {
  const maxPhases = Math.max(1, opts?.maxPhases ?? 1);
  const dailyFacts = Array.isArray(facts.daily_timing_facts)
    ? facts.daily_timing_facts
    : [];
  const weeklyKeys = Array.isArray(facts.weekly_keys) ? facts.weekly_keys as string[] : [];
  const monthlyKeys = Array.isArray(facts.monthly_keys) ? facts.monthly_keys as string[] : [];
  const counts = journeyCounts(facts);

  let merged: BirthIntelligencePackContent = opts?.existingContent ?? {};
  let generationMeta = merged._generation;
  const done = phasesDoneSet(merged);
  const phasesRun: string[] = [];
  const llmRef = {
    provider: "openai",
    model: Deno.env.get("BIRTH_PACK_MODEL")?.trim() ||
      Deno.env.get("OPENAI_MODEL")?.trim() ||
      "gpt-5.4-mini",
  };
  const phaseOpts: MultiTurnOpts = { ...opts, llmRef };

  for (const phase of BIRTH_PACK_PHASE_ORDER) {
    if (done.has(phase)) continue;
    if (phasesRun.length >= maxPhases) break;

    const result = await runSinglePhase(loc, phase, facts, phaseOpts);
    if (!result) {
      return {
        merged,
        complete: false,
        envelope: null,
        phasesRun,
        failedPhase: phase,
      };
    }

    merged = mergePack([merged, result]);
    if (phase === "life_map_journey") {
      merged = {
        ...merged,
        journey_phase_facts: slimJourneyPhaseFacts(facts.journey_phase_facts),
      };
    }
    done.add(phase);
    phasesRun.push(phase);

    const metaPhase = generationPhaseLabel(phase);
    merged = withGenerationMeta(merged, phase, generationMeta);
    generationMeta = merged._generation;

    await notifyPhase(phaseOpts, metaPhase, merged, {
      provider: llmRef.provider,
      model: llmRef.model,
    });
  }

  const remaining = birthPackPhasesRemaining(merged);
  if (remaining.length > 0) {
    return {
      merged,
      complete: false,
      envelope: null,
      phasesRun,
      failedPhase: null,
    };
  }

  const qualityError = validateBirthPackQuality(merged, {
    dailyCount: PACK_DAILY_DAYS,
    weeklyCount: PACK_WEEKLY_WEEKS,
    monthlyCount: PACK_MONTHLY_MONTHS,
    dailyKeys: dailyFacts.map((d) =>
      String((d as { date?: string }).date ?? "")
    ),
    weeklyKeys,
    monthlyKeys,
    journeyPhaseCount: counts.total,
    pastChapterCount: counts.past,
    futureChapterCount: counts.future,
  });

  if (qualityError) {
    console.warn(`[birth-pack] quality failed locale=${loc}: ${qualityError}`);
    if (opts?.supabase) {
      const { error: logError } = await opts.supabase.from("app_logs").insert({
        profile_id: opts?.profileId ?? null,
        service: "birth_pack",
        level: "warn",
        message: "birth_pack_quality_failed",
        context: { locale: loc, reason: qualityError },
      });
      if (logError) {
        console.warn(`[birth-pack] quality log failed: ${logError.message}`);
      }
    }
    return {
      merged,
      complete: false,
      envelope: null,
      phasesRun,
      failedPhase: "playbook",
    };
  }

  return {
    merged,
    complete: true,
    envelope: {
      data: merged,
      provider: llmRef.provider,
      model: llmRef.model,
      promptVersion: `${BIRTH_PACK_VERSION}+openai-mini-3phase`,
    },
    phasesRun,
    failedPhase: null,
  };
}

/** Full generation in one call (local dev / tests). Prefer advanceBirthPackPhases in production. */
export async function generateBirthIntelligencePackMultiTurn(
  loc: AppLocale,
  facts: PhaseFacts,
  opts?: MultiTurnOpts,
): Promise<BirthPackEnvelope | null> {
  const result = await advanceBirthPackPhases(loc, facts, {
    ...opts,
    maxPhases: BIRTH_PACK_PHASE_ORDER.length + 1,
  });
  return result.envelope;
}
