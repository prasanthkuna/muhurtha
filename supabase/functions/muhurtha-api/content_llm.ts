import { generateJsonWithFallbackEnvelope } from "./gemini_json.ts";
import type { AppLocale } from "./vedic_labels.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTENT_PROMPT_VERSION = "v6-v3-conversion-dossier";

type ProviderEnvelope<T> = {
  data: T;
  provider: string;
  model: string;
  promptVersion: string;
};

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return "Write ONLY in simple, spoken Telugu script. Sound like a practical Telugu friend from daily life, not a textbook, pravachan, or dubbed English. Short natural lines. Do not use English words unless the input is a name. Never output raw planner labels.";
  }
  if (loc === "hi") {
    return "Write ONLY in simple spoken Hindi (Devanagari). Sound practical and warm, not Sanskrit-heavy. Never output raw planner labels.";
  }
  return "Write ONLY in plain Indian English. Short, direct, relatable. Never sound like a SaaS dashboard or generic horoscope.";
}

function ageGuidance(age: unknown): string {
  const n = typeof age === "number" ? age : Number(age);
  if (!Number.isFinite(n)) return "Age unknown. Keep the advice adult, grounded, and practical.";
  if (n <= 22) {
    return `User age: ${n}. Lean toward study, confidence, direction, friendships, and early career building.`;
  }
  if (n <= 32) {
    return `User age: ${n}. Lean toward career moves, money structure, self-definition, and relationship clarity.`;
  }
  if (n <= 42) {
    return `User age: ${n}. Lean toward consolidation, family responsibility, meaningful work, and stable money decisions.`;
  }
  if (n <= 55) {
    return `User age: ${n}. Lean toward authority, assets, health discipline, and long-term stability.`;
  }
  return `User age: ${n}. Lean toward simplification, peace of mind, health steadiness, family guidance, and legacy.`;
}

export type TodayLlmCopy = {
  better_for: string[];
  be_careful: string[];
  rhythm_title?: string;
  rhythm_body?: string;
  one_line?: string;
  share_hook?: string;
};

async function generateCopy(
  system: string,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<TodayLlmCopy> | null> {
  const raw = await generateJsonWithFallbackEnvelope(
    system,
    JSON.stringify({ facts }),
    {
      openRouterModelEnvName: "OPENROUTER_MODEL",
      groqModelEnvName: "GROQ_MODEL",
      geminiModelEnvName: "GEMINI_MODEL",
      openAiModelEnvName: "CONTENT_LLM_MODEL",
      supabase: opts?.supabase,
      profileId: opts?.profileId,
      preferFastProviders: true,
    },
  );
  if (!raw) return null;
  try {
    return {
      data: JSON.parse(raw.text) as TodayLlmCopy,
      provider: raw.provider,
      model: raw.model,
      promptVersion: CONTENT_PROMPT_VERSION,
    };
  } catch {
    return null;
  }
}

export function generateTodayCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<TodayLlmCopy> | null> {
  const mode = facts.explanation_mode === "traditional" ? "Traditional Vedic" : "Simple Modern";

  const system = `You are "Sakha" - a wise, grounded Indian astrological guide.
Target Mode: ${mode}
${localeLine(loc)}

Personalization Heuristics:
- ${ageGuidance(facts.age)}
- Decisive Tone: Do NOT be vague. Use the planner facts to give sharp, actionable advice that fits their current life stage.

Output valid JSON only:
{"one_line":string,"share_hook":string,"better_for":[string,string],"be_careful":[string,string],"rhythm_title":string,"rhythm_body":string}

Rules:
- one_line: 6-14 words, immediately useful, WhatsApp-friendly.
- share_hook: 10-20 words, screenshot-worthy, personal, not scary.
- rhythm_title: 2-5 words, crisp.
- rhythm_body: exactly 2 short sentences, 24-42 words total.
- better_for: exactly 2 short phrases, each 2-5 words.
- be_careful: exactly 2 short phrases, each 2-5 words.
- If personalization_kernel is present, use natal nakshatra archetype, age stage, period stage, and domain lenses.
- If personalization_kernel.period.isDashaSandhi is true, make the tone transition-aware: close old loops, reduce noise, prepare the next chapter.
- If natal nakshatra/archetype is present, use its real-life style once: skill, speech, stress pattern, work style, or reset style. Do not name the Nakshatra unless it helps the user.
- If life_chapter is present, mention major transition/next chapter when relevant.
- Use screen_intent. Today is a decision screen, not a weekly/monthly paragraph.
- Ground the reading in ordinary Indian life: work, money, family, speech, travel, sleep, planning, pressure.
- Use the planner facts as the source of truth.
- Delete filler. No "manage wisely", "nurture relationships", "cosmic", "planetary alignment", or raw labels like Personality Mirror.
- Do not explain astrology theory. Do not sound mystical or generic.`;

  return generateCopy(system, facts, opts);
}

export function generateWeeklyCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<TodayLlmCopy> | null> {
  const system = `You are "Sakha". Provide a weekly summary.
${localeLine(loc)}

Personalization Heuristics:
- ${ageGuidance(facts.age)}
- Use the planner facts (Active Domains) to ground the advice.

Output valid JSON only:
{"share_hook":string,"better_for":[string,string,string],"be_careful":[string,string],"rhythm_title":string,"rhythm_body":string}

Rules:
- share_hook: 10-20 words, one line someone could share with family/friends.
- rhythm_title: 2-5 words.
- rhythm_body: exactly 2 short sentences, 24-46 words total.
- better_for: exactly 3 short phrases, each 2-4 words.
- be_careful: exactly 2 short phrases, each 2-4 words.
- Make the week feel specific to 2-3 useful blocks only: work, money, people, body, or family.
- Use personalization_kernel strongly: age stage, Nakshatra work style/stress pattern, and current/next period.
- If a major phase is ending, make the week about closure, sorting, and clean decisions rather than generic growth.
- Do not repeat today's framing. Use week-specific arcs: best push, light day, follow-through, relationship tone.`;

  return generateCopy(system, facts, opts);
}

export function generateMonthlyCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<TodayLlmCopy> | null> {
  const system = `You are "Sakha". Provide a monthly summary for the current month.
${localeLine(loc)}
- ${ageGuidance(facts.age)}

Output valid JSON only:
{"share_hook":string,"better_for":[string,string,string],"be_careful":[string,string],"rhythm_title":string,"rhythm_body":string}

Rules:
- share_hook: 10-20 words, editorial and personal.
- rhythm_title: 2-5 words.
- rhythm_body: exactly 2 short sentences, 28-52 words total.
- better_for: exactly 3 short phrases, each 2-4 words.
- be_careful: exactly 2 short phrases, each 2-4 words.
- Make the month editorial, practical, and specific to the planner facts.
- Use personalization_kernel strongly: age stage, Nakshatra archetype, current life chapter, and next Mahadasha/period when present.
- If a major period is near its end, make the month feel like a transition chapter, not a normal horoscope month.
- Show momentum, caution, and relationship tone without sounding repetitive.
- Do not write a longer version of today. Use month themes, not day timing.`;

  return generateCopy(system, facts, opts);
}

export type NarrativeCopy = {
  title: string;
  body: string;
  betterFor: string[];
  beCareful: string[];
  shareHook?: string;
  provider: string;
  model: string;
  promptVersion: string;
};

export async function generateNarrativeCopy(
  loc: AppLocale,
  scope: "weekly" | "monthly",
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<NarrativeCopy | null> {
  const copy = scope === "weekly"
    ? await generateWeeklyCopy(loc, facts, opts)
    : await generateMonthlyCopy(loc, facts, opts);
  if (!copy?.data.rhythm_title?.trim() || !copy.data.rhythm_body?.trim()) {
    return null;
  }
  return {
    title: copy.data.rhythm_title.trim(),
    body: copy.data.rhythm_body.trim(),
    betterFor: copy.data.better_for.slice(0, 3).map((s) => s.trim()).filter(Boolean),
    beCareful: copy.data.be_careful.slice(0, 2).map((s) => s.trim()).filter(Boolean),
    shareHook: copy.data.share_hook?.trim(),
    provider: copy.provider,
    model: copy.model,
    promptVersion: copy.promptVersion,
  };
}

export type PurposeLlmCopy = {
  headline?: string;
  summary: string;
  action_line: string;
  timing_note?: string;
  share_hook?: string;
  better_options?: { label: string; detail: string }[];
};

export async function generatePurposeCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<PurposeLlmCopy> | null> {
  const system =
    `You are "Sakha". Evaluate a specific purpose like money talk, family discussion, property visit, interview, or relationship conversation.
${localeLine(loc)}
- ${ageGuidance(facts.age)}
Output valid JSON only:
{"headline":string,"summary":string,"action_line":string,"timing_note":string,"share_hook":string,"better_options":[{"label":string,"detail":string}]}

Rules:
- headline: 2-6 words.
- summary: 2 short sentences, practical and specific.
- action_line: 1 short sentence telling the user what to do with the result.
- timing_note: 1 short sentence about why the best window or caution matters.
- share_hook: 10-20 words, sendable timing advice for WhatsApp.
- purpose_lens and planner.domain_lenses must strongly shape the answer. A money talk must not read like an interview or health routine.
- Use age stage and personalization_kernel when present. A 21-year-old, 33-year-old, and 50-year-old should not receive the same business/career tone.
- If personalization_kernel.period.isDashaSandhi is true, explain action as cautious transition timing, not fear.
- Avoid formal phrases. Say what to do in normal life.
- The best_windows fact already contains only the strongest usable windows. Do not imply that the whole day is open.
- better_options may be empty, but if present they must be realistic and simple.`;

  const raw = await generateJsonWithFallbackEnvelope(system, JSON.stringify({ facts }), {
    openRouterModelEnvName: "OPENROUTER_MODEL",
    groqModelEnvName: "GROQ_MODEL",
    geminiModelEnvName: "GEMINI_MODEL",
    openAiModelEnvName: "CONTENT_LLM_MODEL",
    supabase: opts?.supabase,
    profileId: opts?.profileId,
    preferFastProviders: true,
  });
  if (!raw) return null;
  try {
    return {
      data: JSON.parse(raw.text) as PurposeLlmCopy,
      provider: raw.provider,
      model: raw.model,
      promptVersion: CONTENT_PROMPT_VERSION,
    };
  } catch {
    return null;
  }
}

export type RemedyLlmItem = {
  id: string;
  title: string;
  simple_line: string;
  why_now?: string;
  keep_it_simple?: string;
};

export async function generateRemedyCopy(
  loc: AppLocale,
  facts: {
    active_lord?: string;
    age?: number;
    personalization_kernel?: unknown;
    items: {
      id: string;
      title: string;
      simple_line: string;
      remedy_category?: string;
    }[];
  },
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<ProviderEnvelope<RemedyLlmItem[]> | null> {
  const system = `You are "Sakha". Localize traditional remedies into practical daily acts.
${localeLine(loc)}
- ${ageGuidance(facts.age)}
Output valid JSON only:
{"items":[{"id":string,"title":string,"simple_line":string,"why_now":string,"keep_it_simple":string}]}

Rules:
- Keep every remedy short, warm, and doable today.
- Use personalization_kernel if present: age stage, Nakshatra stress pattern/reset style, current period, and domain lenses.
- why_now must explain why the remedy fits the active phase in plain life language, not technical astrology.
- keep_it_simple must remove pressure and perfectionism.`;

  const raw = await generateJsonWithFallbackEnvelope(system, JSON.stringify({ facts }), {
    openRouterModelEnvName: "OPENROUTER_MODEL",
    groqModelEnvName: "GROQ_MODEL",
    geminiModelEnvName: "GEMINI_MODEL",
    openAiModelEnvName: "CONTENT_LLM_MODEL",
    supabase: opts?.supabase,
    profileId: opts?.profileId,
    preferFastProviders: true,
  });
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.text) as { items?: RemedyLlmItem[] };
    return {
      data: Array.isArray(parsed.items) ? parsed.items : [],
      provider: raw.provider,
      model: raw.model,
      promptVersion: CONTENT_PROMPT_VERSION,
    };
  } catch {
    return null;
  }
}
