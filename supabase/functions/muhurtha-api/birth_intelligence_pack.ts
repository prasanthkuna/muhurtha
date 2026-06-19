import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "./vedic_labels.ts";

const PACK_DAILY_DAYS = 30;

function phasesDoneSet(content: BirthIntelligencePackContent): Set<string> {
  const done = content._generation?.phases_done ?? [];
  const set = new Set(done);
  if (set.has("playbook")) {
    set.add("today_cards");
    set.add("weekly_monthly_timing");
    set.add("extras");
  }
  return set;
}

const KERNEL_BOILERPLATE_MARKERS = [
  "turns messy details into something usable",
  "Career / Work / Business / Clients",
  "పని / కెరీర్ / వ్యాపారం / క్లయింట్లు",
  "Jupiter has been the big chapter shaping this part of life",
  "This week's rhythm",
  "This month's theme",
];

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
  journey_phase_facts?: Record<string, unknown>[];
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
    body?: string;
    title?: string;
    headline?: string;
    examples?: string[];
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
  _generation?: {
    phases_done?: string[];
    screens_ready?: PackScreenId[];
    updated_at?: string;
    advancing_phase?: string;
    advancing_until?: string;
  };
};

export type PackScreenId = "decode" | "life_map" | "today" | "timing" | "ask";

export const PACK_SCREEN_IDS: PackScreenId[] = [
  "decode",
  "life_map",
  "today",
  "timing",
  "ask",
];

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

function distinctNonEmpty(values: string[]): number {
  return new Set(values.filter((v) => v.length > 20)).size;
}

function containsKernelBoilerplate(text: string): boolean {
  return KERNEL_BOILERPLATE_MARKERS.some((m) => text.includes(m));
}

export function validateBirthPackQuality(
  content: BirthIntelligencePackContent,
  expected: {
    dailyCount: number;
    weeklyCount: number;
    monthlyCount: number;
    dailyKeys?: string[];
    weeklyKeys?: string[];
    monthlyKeys?: string[];
    journeyPhaseCount: number;
    pastChapterCount: number;
    futureChapterCount: number;
  },
): string | null {
  const structural = validateBirthPackContent(content, expected);
  if (structural) return structural;

  const journey = asArray<PackJourneyPhase>(content.journey_phases);
  const minJourney = Math.max(3, Math.floor(expected.journeyPhaseCount * 0.75));
  if (journey.length < minJourney) {
    return `journey_phases expected >=${minJourney}, got ${journey.length}`;
  }

  const lifeMap = typeof content.life_map === "object" && content.life_map
    ? content.life_map as Record<string, unknown>
    : {};
  const past = asArray<Record<string, unknown>>(lifeMap.past_chapters);
  const future = asArray<Record<string, unknown>>(lifeMap.future_chapters);
  if (past.length < expected.pastChapterCount) {
    return `life_map.past_chapters expected ${expected.pastChapterCount}, got ${past.length}`;
  }
  if (future.length < expected.futureChapterCount) {
    return `life_map.future_chapters expected ${expected.futureChapterCount}, got ${future.length}`;
  }

  for (const chapter of [...past, ...future]) {
    const career = safeString(chapter.career);
    const theme = safeString(chapter.theme);
    if (containsKernelBoilerplate(career) || containsKernelBoilerplate(theme)) {
      return "life_map contains kernel/planner boilerplate";
    }
  }

  const weeklyBodies = asArray<PackRangeCard>(content.weekly_cards).map((c) =>
    safeString(c.body)
  );
  const monthlyBodies = asArray<PackRangeCard>(content.monthly_cards).map((c) =>
    safeString(c.body)
  );
  if (distinctNonEmpty(weeklyBodies) < Math.ceil(expected.weeklyCount * 0.75)) {
    return `weekly_cards lack distinct bodies (${distinctNonEmpty(weeklyBodies)}/${expected.weeklyCount})`;
  }
  if (distinctNonEmpty(monthlyBodies) < Math.ceil(expected.monthlyCount * 0.75)) {
    return `monthly_cards lack distinct bodies (${distinctNonEmpty(monthlyBodies)}/${expected.monthlyCount})`;
  }
  for (const body of [...weeklyBodies, ...monthlyBodies]) {
    if (containsKernelBoilerplate(body)) {
      return "weekly/monthly cards contain fallback boilerplate";
    }
  }

  const todayBodies = asArray<PackTodayCard>(content.today_cards).map((c) =>
    safeString(c.body)
  );
  if (distinctNonEmpty(todayBodies) < Math.ceil(expected.dailyCount * 0.5)) {
    return `today_cards lack distinct bodies (${distinctNonEmpty(todayBodies)}/${expected.dailyCount})`;
  }

  return null;
}

function hasText(value: unknown): boolean {
  return safeString(value).length > 0;
}

function mapRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Which home tabs can render from the current partial pack content. */
export function getPackScreensReady(
  content: BirthIntelligencePackContent,
): PackScreenId[] {
  const ready: PackScreenId[] = [];
  const phasesDone = phasesDoneSet(content);
  const identity = mapRecord(content.user_identity) ?? mapRecord(content.me_profile);
  const preview = mapRecord(content.free_preview);
  if (
    phasesDone.has("core_identity") &&
    identity &&
    (hasText(identity.headline) || hasText(identity.summary) || hasText(identity.title)) &&
    (hasText(preview?.decode_hit) || hasText(identity.summary))
  ) {
    ready.push("decode");
  }

  const lifeMap = mapRecord(content.life_map);
  const past = asArray<Record<string, unknown>>(lifeMap?.past_chapters);
  const journey = asArray<PackJourneyPhase>(content.journey_phases);
  if (
    phasesDone.has("life_map_journey") &&
    (
      past.some((row) => hasText(row.theme) || hasText(row.career)) ||
      journey.filter((p) => hasText(p.title) || (p.sentences?.length ?? 0) > 0).length >= 3
    )
  ) {
    ready.push("life_map");
  }

  const todayCards = asArray<PackTodayCard>(content.today_cards);
  if (
    phasesDone.has("today_cards") ||
    phasesDone.has("playbook") ||
    todayCards.length >= PACK_DAILY_DAYS
  ) {
    ready.push("today");
  }

  const weekly = asArray<PackRangeCard>(content.weekly_cards);
  const monthly = asArray<PackRangeCard>(content.monthly_cards);
  const timingPlan = mapRecord(content.timing_plan);
  if (
    phasesDone.has("weekly_monthly_timing") ||
    phasesDone.has("playbook") ||
    (
      (weekly.length >= 1 && weekly.some((c) => hasText(c.body))) ||
      (monthly.length >= 1 && monthly.some((c) => hasText(c.body))) ||
      hasText(timingPlan?.week && mapRecord(timingPlan.week)?.headline) ||
      hasText(timingPlan?.month && mapRecord(timingPlan.month)?.headline)
    )
  ) {
    ready.push("timing");
  }

  const askTemplates = asArray<Record<string, unknown>>(content.ask_templates);
  const askKnowledge = mapRecord(content.ask_knowledge);
  if (
    phasesDone.has("extras") ||
    phasesDone.has("playbook") ||
    (
      askTemplates.length >= 1 ||
      hasText(askKnowledge?.compact_summary) ||
      hasText(askKnowledge?.body) ||
      hasText(askKnowledge?.headline) ||
      asArray<Record<string, unknown>>(content.remedy_pack).length >= 1
    )
  ) {
    ready.push("ask");
  }

  return ready;
}

export async function generateBirthIntelligencePack(
  loc: AppLocale,
  facts: Record<string, unknown>,
  opts?: {
    supabase?: SupabaseClient;
    profileId?: string;
    existingContent?: BirthIntelligencePackContent;
    maxPhases?: number;
    onPhaseComplete?: (
      phase: string,
      merged: BirthIntelligencePackContent,
      llm: { provider: string; model: string },
    ) => Promise<void>;
  },
): Promise<BirthPackEnvelope | null> {
  const { advanceBirthPackPhases } = await import("./birth_pack_multiturn.ts");
  const result = await advanceBirthPackPhases(loc, facts, opts);
  return result.envelope;
}
