import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJsonWithFallbackEnvelope } from "./gemini_json.ts";
import type { AppLocale } from "./vedic_labels.ts";

export const ASK_PROMPT_VERSION = "ask:v2-age-language-kernel";

type ProviderEnvelope<T> = {
  data: T;
  provider: string;
  model: string;
  promptVersion: string;
};

export type AskAnswerCopy = {
  direct_answer: string;
  best_time: string;
  caution_time: string;
  better_option: string;
  simple_why: string;
  action_line: string;
  share_hook: string;
};

function localeInstruction(locale: AppLocale): string {
  if (locale === "te") {
    return [
      "Write ONLY in natural spoken Telugu script.",
      "Tone: simple Telugu friend. Short sentences. No bookish Telugu.",
      "Use normal-life words for work, family, money, travel, health, and study.",
      "Do not use English unless it is a name or the user used that exact word.",
    ].join(" ");
  }
  if (locale === "hi") {
    return [
      "Write ONLY in natural spoken Hindi in Devanagari.",
      "Tone: practical Indian friend. Avoid Sanskrit-heavy wording.",
      "Keep it short, warm, and directly useful.",
    ].join(" ");
  }
  return [
    "Write ONLY in plain Indian English.",
    "Tone: direct, useful, human. No horoscope prose. No SaaS wording.",
    "Keep it short enough to read on a phone.",
  ].join(" ");
}

function ageGuidance(age: unknown): string {
  const n = typeof age === "number" ? age : Number(age);
  if (!Number.isFinite(n)) return "Age unknown. Keep the answer adult, grounded, and practical.";
  if (n <= 22) {
    return `User age: ${n}. Tone should fit study, confidence, direction, friendships, and first career steps.`;
  }
  if (n <= 32) {
    return `User age: ${n}. Tone should fit career moves, money structure, identity, relationship clarity, and ambition.`;
  }
  if (n <= 42) {
    return `User age: ${n}. Tone should fit consolidation, expertise, family responsibility, meaningful work, and stable money.`;
  }
  if (n <= 55) {
    return `User age: ${n}. Tone should fit authority, assets, health discipline, family decisions, and long-term stability.`;
  }
  return `User age: ${n}. Tone should fit simplification, peace of mind, health steadiness, family guidance, and legacy.`;
}

/** Live LLM Ask — Pro-only. Not used in v3 product flow (pack templates only). */
export async function generateAskAnswer(
  locale: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string; isPro?: boolean },
): Promise<ProviderEnvelope<AskAnswerCopy> | null> {
  if (!opts?.isPro) return null;
  const system = `You are Muhurta's AI Jyotish companion.
${localeInstruction(locale)}
${ageGuidance(facts.age)}

You answer life-timing questions using the provided context only:
- profile and age stage
- birth input quality / engine mode
- current life period
- today's good and caution windows
- recent chat history
- validated life events, if any
- personalization_kernel: Nakshatra archetype, age stage, current period, next period, and domain lenses

Output valid JSON only:
{
  "direct_answer": string,
  "best_time": string,
  "caution_time": string,
  "better_option": string,
  "simple_why": string,
  "action_line": string,
  "share_hook": string
}

Rules:
- direct_answer: 1-2 short sentences. Start with the actual answer, not theory.
- best_time: one short line. Use only provided good windows. If none, say to keep the action small.
- caution_time: one short line. Mention Rahu Kalam only when supplied in caution windows.
- better_option: one practical alternative. If not enough data, say what to do before deciding.
- simple_why: keep hidden-friendly. Explain the reasoning in one normal sentence without technical jargon.
- action_line: one final instruction the user can follow today.
- share_hook: 10-18 words, screenshot-worthy, branded but not promotional.
- Use personalization_kernel strongly when present. Bring in Nakshatra work style/stress pattern/reset style naturally, without sounding like a chart report.
- If current_period or personalization_kernel says a major phase is ending, answer like transition guidance: close loops, choose cleaner timing, avoid shiny overreach.
- Match the user's language and age. A student, a 33-year-old builder, and a 50-year-old family decision-maker need different examples.
- Do not expose "why Muhurta said this" as a UI concept.
- Do not promise job, marriage, money, health cure, pregnancy, legal result, or guaranteed success.
- If birth time quality is weak, be honest without frightening the user.
- If the user asks a medical/legal/financial high-stakes question, give timing support only and tell them to use a qualified professional for the decision.
- Never use raw internal labels like planner, kernel, domain_lenses, Mahadasha, Antardasha, or Dasha unless the user explicitly asks for traditional terms.`;

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
      data: JSON.parse(raw.text) as AskAnswerCopy,
      provider: raw.provider,
      model: raw.model,
      promptVersion: ASK_PROMPT_VERSION,
    };
  } catch {
    return null;
  }
}
