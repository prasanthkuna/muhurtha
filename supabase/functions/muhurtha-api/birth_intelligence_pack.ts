import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJsonWithFallbackEnvelope } from "./gemini_json.ts";
import { tryParseRepairedJson } from "./json_repair.ts";
import type { AppLocale } from "./vedic_labels.ts";

export const BIRTH_PACK_VERSION = "birth-pack:v3-conversion-dossier";

export type PackTimingWindowCopy = {
  category?: string;
  why_it_works?: string;
  best_for?: string[];
  avoid_for?: string[];
  share_line?: string;
};

export type PackRangeCard = {
  key?: string;
  title?: string;
  body?: string;
  share_hook?: string;
  better_for?: string[];
  be_careful?: string[];
  notification_title?: string;
  notification_body?: string;
};

export type PackTodayCard = PackRangeCard & {
  one_line?: string;
  good_window_notes?: PackTimingWindowCopy[];
  caution_window_notes?: PackTimingWindowCopy[];
};

export type PackJourneyPhase = {
  sortOrder?: number;
  periodLabel?: string;
  mahadashaLord?: string;
  antardashaLord?: string;
  title?: string;
  highlight?: string;
  sentences?: string[];
  focusAreas?: string[];
  tone?: string[];
  pressureThemes?: string[];
  phasePulse?: string;
  transitionNote?: string;
  evidenceLine?: string;
  shareHook?: string;
  kernelSignals?: string[];
  domainLenses?: string[];
  proLocked?: boolean;
  subPhases?: PackJourneyPhase[];
};

export type BirthIntelligencePackContent = {
  user_identity?: Record<string, unknown>;
  free_preview?: Record<string, unknown>;
  subscription_hooks?: Record<string, unknown>;
  past_life_check?: Record<string, unknown>[];
  category_reports?: Record<string, unknown>;
  today_guidance?: Record<string, unknown>;
  timing_plan?: Record<string, unknown>;
  horizons?: Record<string, unknown>;
  life_map?: Record<string, unknown>;
  ask_templates?: Record<string, unknown>[];
  share_cards?: Record<string, unknown>[];
  notification_pack?: Record<string, unknown>[];
  remedy_pack?: Record<string, unknown>[];
  paywall_copy?: Record<string, unknown>;
  me_profile?: {
    title?: string;
    summary?: string;
    share_hook?: string;
    strengths?: string[];
    watchouts?: string[];
    daily_style?: string;
    characteristics?: string[];
    relationship_pattern?: string;
    work_money_pattern?: string;
    stress_reset_pattern?: string;
  };
  likely_life_events?: {
    period_label?: string;
    event_theme?: string;
    why_it_may_fit?: string;
    confidence?: "soft" | "medium";
    pro_locked?: boolean;
  }[];
  current_phase?: {
    title?: string;
    summary?: string;
    quality_label?: string;
    timeline_label?: string;
    action_line?: string;
    share_hook?: string;
  };
  today_cards?: PackTodayCard[];
  weekly_cards?: PackRangeCard[];
  monthly_cards?: PackRangeCard[];
  journey_phases?: PackJourneyPhase[];
  remedy_cards?: {
    id?: string;
    title?: string;
    simple_line?: string;
    why_now?: string;
    keep_it_simple?: string;
    share_hook?: string;
  }[];
  ask_knowledge?: {
    compact_summary?: string;
    common_answers?: { topic?: string; answer?: string }[];
    boundaries?: string[];
  };
  notification_copy?: {
    today_ready?: { title?: string; body?: string };
    good_time_start?: { title?: string; body?: string };
    caution_start?: { title?: string; body?: string };
    weekly_ready?: { title?: string; body?: string };
    monthly_ready?: { title?: string; body?: string };
    phase_change?: { title?: string; body?: string };
  };
  pro_teasers?: {
    future_timeline?: string;
    subphase_unlock?: string;
    chat_unlock?: string;
    notification_unlock?: string;
  };
};

export type BirthPackEnvelope = {
  data: BirthIntelligencePackContent;
  provider: string;
  model: string;
  promptVersion: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateBirthPackContent(
  content: BirthIntelligencePackContent,
  expected: {
    dailyCount: number;
    weeklyCount: number;
    monthlyCount: number;
    dailyKeys?: string[];
    weeklyKeys?: string[];
    monthlyKeys?: string[];
  },
): string | null {
  const today = asArray<PackTodayCard>(content.today_cards);
  if (today.length !== expected.dailyCount) {
    return `today_cards expected ${expected.dailyCount}, got ${today.length}`;
  }
  for (let i = 0; i < today.length; i++) {
    const key = safeString(today[i]?.key);
    if (!key) return `today_cards[${i}] missing key`;
    const expectedKey = expected.dailyKeys?.[i];
    if (expectedKey && key !== expectedKey) {
      return `today_cards[${i}] key ${key} != ${expectedKey}`;
    }
  }
  const weekly = asArray<PackRangeCard>(content.weekly_cards);
  if (weekly.length < expected.weeklyCount) {
    return `weekly_cards expected ${expected.weeklyCount}, got ${weekly.length}`;
  }
  const monthly = asArray<PackRangeCard>(content.monthly_cards);
  if (monthly.length < expected.monthlyCount) {
    return `monthly_cards expected ${expected.monthlyCount}, got ${monthly.length}`;
  }
  return null;
}

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return "Write ONLY in natural Telugu script. It should sound like a sharp Telugu friend from everyday Hyderabad/Vijayawada life: simple, scene-based, lightly witty, never translated English, never Sanskrit-heavy, never pravachan style.";
  }
  if (loc === "hi") {
    return "Write ONLY in simple conversational Hindi in Devanagari. Avoid Sanskrit-heavy textbook phrasing.";
  }
  return "Write ONLY in plain Indian English. Make it sound like a smart Indian friend: direct, practical, lightly witty, screenshot-worthy, and not horoscope-magazine generic.";
}

export async function generateBirthIntelligencePack(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: { supabase?: SupabaseClient; profileId?: string },
): Promise<BirthPackEnvelope | null> {
  const system = `You are "Sakha", a premium Indian astrology companion.
${localeLine(loc)}

You do NOT calculate astrology. The app gives you facts: Moon sign, Sun sign, Nakshatra, Dasha dates, timing windows, current phase, future phases, age, and life-stage clues.
Your job is to turn those facts into the complete user-facing app content.

Output valid JSON only with this exact top-level shape:
{
  "user_identity": {"headline":string,"summary":string,"moon_marker":string,"strengths":[string],"watchouts":[string],"work_money_pattern":string,"relationship_pattern":string,"stress_reset":string},
  "free_preview": {"decode_hit":string,"past_check_teaser":[string],"today_teaser":string,"share_line":string},
  "subscription_hooks": {"main_hook":string,"locked_map_line":string,"bullets":[string]},
  "past_life_check": [{"period_label":string,"main_theme":string,"what_may_match":string,"confidence":"soft"|"medium","share_line":string,"locked":boolean}],
  "me_profile": {"title":string,"summary":string,"share_hook":string,"strengths":[string],"watchouts":[string],"daily_style":string,"characteristics":[string],"relationship_pattern":string,"work_money_pattern":string,"stress_reset_pattern":string},
  "likely_life_events": [{"period_label":string,"event_theme":string,"why_it_may_fit":string,"confidence":"soft"|"medium","pro_locked":boolean}],
  "current_phase": {"title":string,"summary":string,"quality_label":string,"timeline_label":string,"action_line":string,"share_hook":string},
  "today_cards": [{"key":string,"title":string,"body":string,"one_line":string,"share_hook":string,"better_for":[string],"be_careful":[string],"good_window_notes":[{"category":string,"why_it_works":string,"best_for":[string],"avoid_for":[string],"share_line":string}],"caution_window_notes":[{"category":string,"why_it_works":string,"best_for":[string],"avoid_for":[string],"share_line":string}],"notification_title":string,"notification_body":string}],
  "weekly_cards": [{"key":string,"title":string,"body":string,"share_hook":string,"better_for":[string],"be_careful":[string],"notification_title":string,"notification_body":string}],
  "monthly_cards": [{"key":string,"title":string,"body":string,"share_hook":string,"better_for":[string],"be_careful":[string],"notification_title":string,"notification_body":string}],
  "category_reports": {"career":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string},"money":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string},"relationship":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string},"family":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string},"business":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string},"health_routine":{"title":string,"pattern":string,"next_6_12_months":string,"avoid":string,"best_action":string}},
  "today_guidance": {"main_advice":string,"good_window_summary":string,"avoid_window_summary":string,"best_for":[string],"be_careful":[string],"one_remedy":string,"share_line":string},
  "timing_plan": {"week":{"headline":string,"action_focus":string,"caution":string,"share_line":string},"month":{"headline":string,"strategy":string,"caution":string,"share_line":string},"current_phase":{"headline":string,"use_it_for":string,"avoid":string,"share_line":string}},
  "life_map": {"past_chapters":[{"period":string,"theme":string,"career":string,"money":string,"family_relationship":string,"avoid":string,"share_line":string}],"current_chapter":{"period":string,"theme":string,"use_it_for":string,"avoid":string,"share_line":string},"future_chapters":[{"period":string,"theme":string,"career":string,"money":string,"family_relationship":string,"avoid":string,"share_line":string,"locked":boolean}]},
  "journey_phases": [{"sortOrder":number,"periodLabel":string,"mahadashaLord":string,"antardashaLord":string,"title":string,"highlight":string,"sentences":[string],"focusAreas":[string],"tone":[string],"pressureThemes":[string],"phasePulse":string,"transitionNote":string,"evidenceLine":string,"shareHook":string,"kernelSignals":[string],"domainLenses":[string],"proLocked":boolean,"subPhases":[]}],
  "remedy_cards": [{"id":string,"title":string,"simple_line":string,"why_now":string,"keep_it_simple":string,"share_hook":string}],
  "remedy_pack": [{"id":string,"category":string,"title":string,"why_now":string,"what_to_do":string,"keep_it_simple":string,"share_line":string}],
  "ask_templates": [{"key":string,"label":string,"free_sample":boolean,"answer_frame":string,"best_for":string,"caution":string,"share_line":string}],
  "share_cards": [{"type":string,"title":string,"line":string,"context":string,"cta":string}],
  "notification_pack": [{"key":string,"title":string,"body":string,"trigger_type":string}],
  "paywall_copy": {"headline":string,"subline":string,"bullets":[string],"cta":string},
  "ask_knowledge": {"compact_summary":string,"common_answers":[{"topic":string,"answer":string}],"boundaries":[string]},
  "notification_copy": {"today_ready":{"title":string,"body":string},"good_time_start":{"title":string,"body":string},"caution_start":{"title":string,"body":string},"weekly_ready":{"title":string,"body":string},"monthly_ready":{"title":string,"body":string},"phase_change":{"title":string,"body":string}},
  "pro_teasers": {"future_timeline":string,"subphase_unlock":string,"chat_unlock":string,"notification_unlock":string}
}

Content rules:
- Voice bible:
  - Telugu: short spoken lines, daily-life situations, no lecture tone. Prefer "ఇది నీకు...", "ఇక్కడ జాగ్రత్త...", "ఇది వాడుకో..." style. Do not use English labels such as Better use, Keep light, Past Check, Moon-led reading, current phase, transition phase, work/money pattern, relationship pattern, unless the word is a natural daily-use loan word like call, client, meeting, payment, boss.
  - English: plain Indian English with Telugu-film conversational energy. No mystical perfume. Make it feel like a friend who noticed the user's pattern.
  - Hindi: simple spoken Hindi, not textbook Hindi.
  - Every heading and chip must be in the requested language. Do not mix languages inside UI labels.
- today_cards must contain exactly one card for every facts.daily_timing_facts item, in the same order. Each today_cards[i].key must equal facts.daily_timing_facts[i].date exactly.
- weekly_cards must contain exactly one card for every facts.weekly_keys item, in the same order. Each weekly_cards[i].key must equal facts.weekly_keys[i] exactly.
- monthly_cards must contain exactly one card for every facts.monthly_keys item, in the same order. Each monthly_cards[i].key must equal facts.monthly_keys[i] exactly.
- Do not use category keys like personality, work, family, career_week, or money_month as card keys. Categories belong inside title/body/better_for/be_careful, never in key.
- free_preview must contain the strongest "this sounds like me" line in the whole response.
- past_life_check must include at least two unlocked recognition cards.
- life_map.past_chapters must include one chapter for EVERY facts.journey_phase_facts item whose tense is "past", in the same order, with no skipped years.
- life_map.future_chapters must include one chapter for EVERY facts.journey_phase_facts item whose tense is "future", in the same order, with no skipped future years.
- life_map.current_chapter must use the facts.journey_phase_facts item whose tense is "current"; if none exists, use the app's current_life_chapter.
- timing_plan must not repeat today_guidance. Week is focus, month is strategy, current_phase is life chapter.
- ask_templates must answer from stored birth-pack context and deterministic timing facts, not by asking for another LLM call.
- share_cards must be emotionally sharp, WhatsApp-friendly, and safe. No fear, no guaranteed claims.
- Every visible card must feel shareable. It may be short or detailed, but it must have one clean share_hook.
- Use age-aware tone. A student, early-career person, family-builder, and 50+ user should not sound the same.
- Mention ordinary Indian life: work, study, money, family, marriage talks, property, travel, health, peace of mind, status, and speech.
- Today is practical. Week is an arc. Month is strategy. Journey is a life story with past phases sounding already happened.
- Good timing notes must be useful categories, not decoration: start something, calls/meetings, money talk, study/focus, family talk, travel/errands, quiet work.
- If facts contain many good windows, give notes for as many as facts support. Do not invent extra time ranges.
- Explain caution windows plainly. Rahu Kalam can be named because Indian users know it.
- Journey should explain whether the phase was supportive, mixed, or heavy in normal language. Do not force "good/bad"; say how to use it.
- For now, future journey phases must use proLocked=false because the app is testing future-phase screens before the payment gate is added.
- Still write future phases in future tense and make them exciting, useful, and subscription-worthy.
- likely_life_events must be careful and non-creepy: infer broad themes from phase facts only, such as job pressure, relocation thoughts, family duty, money restructuring, study/certification, relationship seriousness, property/vehicle focus, health discipline, or status changes. Never claim exact events as guaranteed.
- Pro teasers should create curiosity without fear: future phases, sub-phase expansion, richer chat, and timing notifications.
- Never output raw internal words like planner, kernel, provenance, cache, screen_intent, domain_lenses, or fact_signature.
- Avoid filler like "cosmic energy", "embrace growth", "balance harmony", "unlock potential", "nurture relationships", "steady growth", "practical follow-through", or "clear pending work" unless tied to a specific daily situation.
- Do not repeat the same phase sentence across Decode, Today, Timing, and Life Map. Each screen has a separate job: Decode = identity, Today = action, Timing = week/month planning, Life Map = dated story.`;

  const raw = await generateJsonWithFallbackEnvelope(
    system,
    JSON.stringify({ facts }),
    {
      openAiModelEnvName: "BIRTH_PACK_MODEL",
      geminiModelEnvName: "GEMINI_MODEL",
      groqModelEnvName: "BIRTH_PACK_GROQ_MODEL",
      supabase: opts?.supabase,
      profileId: opts?.profileId,
      // te/hi: Groq/Gemini first to avoid OpenAI quota waits and edge timeouts.
      preferFastProviders: loc !== "en",
    },
  );
  if (!raw) return null;

  let parsed: BirthIntelligencePackContent | null = null;
  try {
    parsed = JSON.parse(raw.text) as BirthIntelligencePackContent;
  } catch {
    const repaired = tryParseRepairedJson(raw.text);
    if (repaired && typeof repaired === "object") {
      parsed = repaired as BirthIntelligencePackContent;
      console.warn(
        `[birth-pack] JSON repaired locale=${loc} provider=${raw.provider} len=${raw.text.length}`,
      );
    }
  }

  if (!parsed) {
    const preview = raw.text.slice(0, 240).replace(/\s+/g, " ");
    console.error(
      `[birth-pack] JSON.parse failed locale=${loc} provider=${raw.provider} model=${raw.model} len=${raw.text.length} preview=${preview}`,
    );
    if (opts?.supabase && opts.profileId) {
      await opts.supabase.from("app_logs").insert({
        profile_id: opts.profileId,
        level: "error",
        message: "birth_pack_json_parse_failed",
        context: {
          locale: loc,
          provider: raw.provider,
          model: raw.model,
          textLength: raw.text.length,
          preview,
        },
      }).catch(() => {});
    }
    return null;
  }

  return {
    data: parsed,
    provider: raw.provider,
    model: raw.model,
    promptVersion: BIRTH_PACK_VERSION,
  };
}
