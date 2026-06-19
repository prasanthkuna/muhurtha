import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { antardashaFallbackCopy, plainPeriodLabel } from "./copy.ts";
import { resolveBirthPlace, resolveCoordinates } from "./geo_resolver.ts";
import { attachNatalLuckToContent, buildNatalLuck } from "./natal_luck.ts";
import { divideDaylight, goodAndCautionWindows, sunriseSunset } from "./solar.ts";
import {
  allAntardashasFromMahadashas,
  type AdSegment,
  type MdSegment,
  recentAntardashasClipped,
  segmentAt,
  segmentAtAntardasha,
  vimshottariLordsAt,
  vimshottariMahadashas,
} from "./vimshottari.ts";
import {
  moonSiderealLongitudeDeg,
  nakshatraPadaFromSiderealLon,
  siderealMetaFromNameOrMoon,
  sunTropicalLongitudeDeg,
} from "./ephemeris.ts";
import { generateJourneyLlmCards, generateProofLlmCards } from "./journey_llm.ts";
import {
  CONTENT_PROMPT_VERSION,
  generateNarrativeCopy,
  generatePurposeCopy,
} from "./content_llm.ts";
import { ASK_PROMPT_VERSION } from "./ask_llm.ts";
import { normalizeAskTemplates, resolveAskFromPack } from "./ask_pack.ts";
import {
  BIRTH_PACK_VERSION,
  type BirthIntelligencePackContent,
  getPackScreensReady,
  type PackJourneyPhase,
  type PackRangeCard,
  type PackTimingWindowCopy,
  type PackTodayCard,
  validateBirthPackQuality,
} from "./birth_intelligence_pack.ts";
import {
  advanceBirthPackPhases,
  birthPackPhasesRemaining,
  isPhaseAdvanceLocked,
  nextBirthPackPhase,
} from "./birth_pack_multiturn.ts";
import { fallbackPackStrings } from "./fallback_pack_copy.ts";
import {
  buildFactSignature,
  buildPhasePlan,
  buildPurposePlan,
  buildRangePlan,
  buildTodayPlan,
  type GenerationProvenance,
  type PhasePlan,
  PLANNER_VERSION,
} from "./planner.ts";
import {
  buildPersonalizationKernel,
  KERNEL_VERSION,
  type PersonalizationKernel,
} from "./personalization_kernel.ts";
import { buildShareCard } from "./share_copy.ts";
import {
  type AppLocale,
  normalizeLocale,
  rashiDisplay,
  rashiKeyFromSiderealLon,
  westernSignDisplayFromTropicalLon,
} from "./vedic_labels.ts";
import {
  inferLifeSignals,
  intentFingerprint,
} from "./inferred_life_signals.ts";

const ENGINE_V = "v5";
const JOURNEY_LOOKBACK_YEARS = 15;
const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;
const NARRATIVE_CACHE_VERSION = 11;
const PACK_DAILY_DAYS = 30;
const PACK_WEEKLY_WEEKS = 8;
const PACK_MONTHLY_MONTHS = 12;
const FREE_ASKS_PER_DAY = 1;
const PACK_GENERATION_STALE_MS = 10 * 60 * 1000;
/** Empty `{}` generating rows reclaim after this — unblocks stuck LLM tasks. */
const PACK_GENERATION_EMPTY_STALE_MS = 3 * 60 * 1000;
const PACK_GENERATION_WAIT_MS = 140_000;
const PACK_GENERATION_EMPTY_WAIT_MS = 12_000;
const PACK_GENERATION_POLL_MS = 1_500;
/** Min gap between phased LLM steps (debounce duplicate polls). */
const PACK_ADVANCE_DEBOUNCE_MS = 8_000;
/** Stalled generating pack — next poll runs phase synchronously. */
const PACK_ADVANCE_STALL_MS = 90_000;
const PACK_ADVANCE_MAX_PHASES = 1;
/** Exclusive lock while one edge worker runs a phase LLM call. */
const PACK_PHASE_LOCK_MS = 150_000;

type BioRow = {
  id: string;
  profile_id: string;
  date_of_birth: string;
  birth_place: string | null;
  birth_input_mode: string;
  exact_birth_time: string | null;
  time_bucket: string | null;
  janma_nakshatra: string | null;
  nakshatra_pada: number | null;
  birth_timezone: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
};

type ProfRow = {
  id: string;
  current_city: string | null;
  current_timezone: string | null;
  current_lat: number | null;
  current_lng: number | null;
  display_name: string | null;
  language_code: string | null;
  explanation_mode: string | null;
  onboarding_intent?: Record<string, unknown> | null;
};

class ActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

function requestLocale(body: Record<string, unknown>, prof: ProfRow): AppLocale {
  return normalizeLocale(String(body.locale ?? prof.language_code ?? "en"));
}

function requireProfile(prof: ProfRow | null, action: string): ProfRow {
  if (prof == null) {
    throw new ActionError(
      "profile_required",
      `Profile required for action: ${action}`,
      409,
    );
  }
  return prof;
}

/** Small deterministic spread so different purposes rarely tie on the same day. */
const PURPOSE_SCORE_BIAS: Record<string, number> = {
  career_interview: 4,
  business_launch: 2,
  money_talk: -2,
  property_vehicle: 1,
  relationship_marriage_talk: 3,
  family_discussion: 0,
  travel: 5,
  study_exam: 1,
  health_routine: -4,
  legal_dispute: -3,
  spiritual_puja: 2,
  creative_public: 3,
};

export function resolveEngineMode(bi: BioRow): string {
  const hasExact = bi.exact_birth_time != null;
  const hasBucket = bi.time_bucket != null;
  const hasNak = bi.janma_nakshatra != null && bi.janma_nakshatra.length > 0;
  if (hasExact) return "full_chart";
  if (hasBucket && hasNak) return "strong_phase";
  if (hasBucket && !hasNak) return "window_chart";
  if (!hasBucket && hasNak) return "nakshatra_dasha";
  return "general_panchanga";
}

export function todayInTimezone(tz: string): string {
  return DateTime.now().setZone(tz).toISODate()!;
}

export function calculateAge(dob: string): number {
  const birth = DateTime.fromISO(dob);
  const now = DateTime.now();
  const diff = now.diff(birth, "years").years;
  return Math.floor(diff);
}

/** JS Sunday=0 .. Saturday=6 from calendar date in zone. */
function jsWeekday(dateStr: string, tz: string): number {
  const wd = DateTime.fromISO(dateStr, { zone: tz }).weekday; // 1 Mon .. 7 Sun
  return wd % 7;
}

function zonedNoonJsDate(dateStr: string, tz: string): Date {
  return DateTime.fromISO(dateStr, { zone: tz })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
}

function parseDateAsUtcInstant(dateStr: string, tz: string): Date {
  return DateTime.fromISO(dateStr, { zone: tz })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toJSDate();
}

function moonRashiAt(utc: Date): { key: string } {
  const siderealLon = moonSiderealLongitudeDeg(utc);
  return { key: rashiKeyFromSiderealLon(siderealLon) };
}

function moonNakshatraAt(utc: Date): { name: string; pada: number } {
  const siderealLon = moonSiderealLongitudeDeg(utc);
  const meta = nakshatraPadaFromSiderealLon(siderealLon);
  return { name: meta.name, pada: meta.pada };
}

function sunSignAt(utc: Date, locale: AppLocale) {
  return westernSignDisplayFromTropicalLon(sunTropicalLongitudeDeg(utc), locale);
}

function birthMoonDetails(
  bi: BioRow | null,
  profileTimezone: string,
  locale: AppLocale,
): {
  sign: ReturnType<typeof rashiDisplay>;
  nakshatra: string;
  pada: number;
} | null {
  if (!bi) return null;
  const zone = resolveBirthZone(bi, profileTimezone);
  const birthUtc = birthInstantUtc(bi, zone);
  if (!birthUtc) return null;
  const siderealLon = moonSiderealLongitudeDeg(birthUtc);
  const sign = rashiDisplay(rashiKeyFromSiderealLon(siderealLon), locale);
  const meta = nakshatraPadaFromSiderealLon(siderealLon);
  return {
    sign,
    nakshatra: meta.name,
    pada: meta.pada,
  };
}

function birthSunDetails(
  bi: BioRow | null,
  profileTimezone: string,
  locale: AppLocale,
) {
  if (!bi) return null;
  const zone = resolveBirthZone(bi, profileTimezone);
  const birthUtc = birthInstantUtc(bi, zone) ??
    DateTime.fromISO(String(bi.date_of_birth).slice(0, 10), { zone })
      .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();
  return sunSignAt(birthUtc, locale);
}

function planetLabel(lord: string | null | undefined, loc: AppLocale): string {
  const map: Record<string, Record<AppLocale, string>> = {
    Rahu: { en: "Rahu", te: "రాహు", hi: "राहु" },
    Ketu: { en: "Ketu", te: "కేతు", hi: "केतु" },
    Jupiter: { en: "Jupiter", te: "గురు", hi: "गुरु" },
    Saturn: { en: "Saturn", te: "శని", hi: "शनि" },
    Mercury: { en: "Mercury", te: "బుధుడు", hi: "बुध" },
    Venus: { en: "Venus", te: "శుక్రుడు", hi: "शुक्र" },
    Mars: { en: "Mars", te: "కుజుడు", hi: "मंगल" },
    Moon: { en: "Moon", te: "చంద్రుడు", hi: "चंद्र" },
    Sun: { en: "Sun", te: "సూర్యుడు", hi: "सूर्य" },
  };
  return map[lord ?? ""]?.[loc] ?? lord ?? "";
}

function lifeChapterInfo(
  kernel: PersonalizationKernel | undefined,
  loc: AppLocale,
) {
  if (!kernel) return null;
  const md = planetLabel(kernel.period.mahadashaLord, loc);
  const ad = planetLabel(kernel.period.antardashaLord, loc);
  const next = planetLabel(kernel.period.nextMahadashaLord, loc);
  const months = kernel.period.remainingMonths ?? null;
  const phaseSpan = kernel.period.startLabel && kernel.period.endLabel
    ? `${kernel.period.startLabel} - ${kernel.period.endLabel}`
    : "";
  const closeLineEn = months != null && months <= 18
    ? `${phaseSpan ? `${phaseSpan}. ` : ""}About ${
      Math.max(1, Math.round(months))
    } months of this chapter are left.`
    : "This chapter is still active.";
  if (loc === "te") {
    const left = months != null && months <= 18
      ? `${phaseSpan ? `${phaseSpan}. ` : ""}ఇంకా దాదాపు ${
        Math.max(1, Math.round(months))
      } నెలలు మాత్రమే ఉన్నాయి.`
      : "ఈ దశ ఇంకా కొనసాగుతోంది.";
    return {
      title: `${md} అధ్యాయం ముగింపు దశలో ఉంది`,
      summary:
        `${md} దశ మీ జీవితంలో ఒక పెద్ద అధ్యాయం. ఇప్పుడు అది ముగింపు వైపు వెళ్తోంది; తర్వాత ${next} దశ మొదలవుతుంది. ఇది మంచి/చెడు అని ఒక్క మాటలో చెప్పడం కంటే, పాత పనులు పూర్తి చేసే సమయం అని చూడాలి.`,
      qualityLabel: "మార్పు దశ",
      timelineLabel: left,
      currentChapterLabel: `${md} పెద్ద అధ్యాయం`,
      currentEpisodeLabel: `${ad} ప్రస్తుత భాగం`,
      nextChapterLabel: next ? `${next} తర్వాతి అధ్యాయం` : "",
      actionLine: "కొత్త పెద్ద పనికంటే ముందు, పెండింగ్ విషయాలు క్లియర్ చేయండి.",
      traditionalWhy: kernel.period.line,
    };
  }
  if (loc === "hi") {
    const left = months != null && months <= 18
      ? `${phaseSpan ? `${phaseSpan}. ` : ""}लगभग ${Math.max(1, Math.round(months))} महीने बचे हैं।`
      : "यह अध्याय अभी चल रहा है।";
    return {
      title: `${md} chapter closing`,
      summary:
        `${md} आपके जीवन का बड़ा अध्याय है। यह अब समाप्ति की तरफ है; अगला अध्याय ${next} है। इसे सिर्फ अच्छा/बुरा न मानें. अभी पुराने काम साफ करने का समय है।`,
      qualityLabel: "बदलाव का समय",
      timelineLabel: left,
      currentChapterLabel: `${md} बड़ा अध्याय`,
      currentEpisodeLabel: `${ad} अभी का हिस्सा`,
      nextChapterLabel: next ? `${next} अगला अध्याय` : "",
      actionLine: "नई बड़ी छलांग से पहले अधूरे काम साफ करें।",
      traditionalWhy: kernel.period.line,
    };
  }
  return {
    title: `${md} chapter is closing`,
    summary:
      `${md} has been the big chapter shaping this part of life. It is now moving toward closure; ${next} comes next. This is not simply good or bad. Treat it as a transition: close old loops before chasing one more big move.`,
    qualityLabel: "Transition phase",
    timelineLabel: closeLineEn,
    currentChapterLabel: `${md} big chapter`,
    currentEpisodeLabel: `${ad} current episode`,
    nextChapterLabel: next ? `${next} next chapter` : "",
    actionLine: "Clear pending work before starting the next big thing.",
    traditionalWhy: kernel.period.line,
  };
}

function remedyCategoryKey(remedyKey: string, remedyType: string): string {
  const keyMap: Record<string, string> = {
    quiet_journal_10: "mind_reset",
    simplify_one_commitment: "mind_reset",
    breath_before_words: "speech_discipline",
    walk_after_sunrise: "body_reset",
    early_sleep_window: "body_reset",
    small_charity_food: "quiet_seva",
  };
  if (keyMap[remedyKey]) return keyMap[remedyKey]!;
  if (remedyType === "discipline") return "body_reset";
  if (remedyType === "charity") return "quiet_seva";
  return "mind_reset";
}

function remedyCategoryLabel(categoryKey: string, locale: AppLocale): string {
  const labels = {
    en: {
      mind_reset: "Mind reset",
      speech_discipline: "Speech discipline",
      body_reset: "Body reset",
      quiet_seva: "Quiet seva",
      fallback: "Daily remedy",
    },
    te: {
      mind_reset: "\u0c2e\u0c28\u0c38\u0c41 \u0c38\u0c30\u0c4d\u0c26\u0c41\u0c2c\u0c3e\u0c1f\u0c41",
      speech_discipline: "\u0c2e\u0c3e\u0c1f \u0c1c\u0c3e\u0c17\u0c4d\u0c30\u0c24\u0c4d\u0c24",
      body_reset: "\u0c36\u0c30\u0c40\u0c30 \u0c30\u0c40\u0c38\u0c46\u0c1f\u0c4d",
      quiet_seva: "\u0c28\u0c3f\u0c36\u0c4d\u0c36\u0c2c\u0c4d\u0c26 \u0c38\u0c47\u0c35",
      fallback: "\u0c30\u0c4b\u0c1c\u0c41 \u0c2a\u0c30\u0c3f\u0c39\u0c3e\u0c30\u0c02",
    },
    hi: {
      mind_reset: "\u092e\u0928 \u0938\u0902\u0924\u0941\u0932\u0928",
      speech_discipline: "\u0935\u093e\u0923\u0940 \u0938\u0902\u092f\u092e",
      body_reset: "\u0936\u0930\u0940\u0930 \u0930\u0940\u0938\u0947\u091f",
      quiet_seva: "\u0936\u093e\u0902\u0924 \u0938\u0947\u0935\u093e",
      fallback: "\u0926\u0948\u0928\u093f\u0915 \u0909\u092a\u093e\u092f",
    },
  } as const;
  const row = labels[locale] ?? labels.en;
  return row[categoryKey as keyof typeof row] ?? row.fallback;
}

function remedyTypeLabel(remedyType: string, locale: AppLocale): string {
  const labels = {
    en: {
      behavioral: "Mind reset",
      discipline: "Body reset",
      charity: "Quiet seva",
      fallback: "Daily remedy",
    },
    te: {
      behavioral: "మనసు సర్దుబాటు",
      discipline: "శరీర రీసెట్",
      charity: "నిశ్శబ్ద సేవ",
      fallback: "రోజు పరిహారం",
    },
    hi: {
      behavioral: "मन संतुलन",
      discipline: "शरीर रीसेट",
      charity: "शांत सेवा",
      fallback: "दैनिक उपाय",
    },
  } as const;
  const row = labels[locale] ?? labels.en;
  return row[remedyType as keyof typeof row] ?? row.fallback;
}

function remedyWhyNow(remedyType: string, activeLord: string, locale: AppLocale): string {
  const lordText = activeLord
    ? locale === "te"
      ? `${activeLord} దశ`
      : locale === "hi"
      ? `${activeLord} चरण`
      : `${activeLord} period`
    : locale === "te"
    ? "ప్రస్తుత లయ"
    : locale === "hi"
    ? "मौजूदा लय"
    : "current rhythm";
  switch (remedyType) {
    case "behavioral":
      return locale === "te"
        ? `${lordText}లో పెద్ద చర్యల కంటే చిన్న మానసిక సర్దుబాట్లు ఇప్పుడు ఎక్కువ ఉపయోగపడతాయి.`
        : locale === "hi"
        ? `${lordText} में इस समय बड़े कदमों से ज्यादा छोटे मानसिक सुधार काम आते हैं।`
        : `This fits the ${lordText} because small mindset corrections help more than dramatic action right now.`;
    case "discipline":
      return locale === "te"
        ? `${lordText}లో నిద్ర, శరీర లయ, పని వేగం నిలకడగా ఉంటే తప్పించగల పొరపాట్లు తగ్గుతాయి.`
        : locale === "hi"
        ? `${lordText} में नींद, शरीर की लय और काम की गति स्थिर रखने से टाली जा सकने वाली गलतियां कम होती हैं।`
        : `This fits the ${lordText} because steadier sleep, pace, and body rhythm will reduce avoidable mistakes.`;
    case "charity":
      return locale === "te"
        ? `${lordText}లో నిశ్శబ్దంగా ఇచ్చే సహాయం అతిగా పట్టుకోవాలనే భావాన్ని చల్లబరచి దృష్టిని సమతుల్యం చేస్తుంది.`
        : locale === "hi"
        ? `${lordText} में शांत दान पकड़ और लालसा को ठंडा करके नजरिया वापस संतुलित करता है।`
        : `This fits the ${lordText} because quiet giving helps cool excess grasping and brings perspective back.`;
    default:
      return locale === "te"
        ? `${lordText}లో ఎక్కువ ఆలోచన కంటే సరళమైన స్థిర చర్యలు ఇప్పుడు బాగా పనిచేస్తాయి.`
        : locale === "hi"
        ? `${lordText} में ज्यादा सोचने से बेहतर अभी सरल और स्थिर कदम काम करते हैं।`
        : `This fits the ${lordText} because simple grounded actions work better than overthinking right now.`;
  }
}

function remedyKeepSimple(remedyType: string, locale: AppLocale): string {
  switch (remedyType) {
    case "behavioral":
      return locale === "te"
        ? "పది నిమిషాల నిశ్శబ్ద సమయం చాలుతుంది. దాన్ని పర్ఫెక్ట్‌గా కాకుండా సాదాసీదాగా చేయండి."
        : locale === "hi"
        ? "दस शांत मिनट काफी हैं। इसे परफेक्ट नहीं, बस सादगी से करें।"
        : "Ten calm minutes is enough. Do it plainly, not perfectly.";
    case "discipline":
      return locale === "te"
        ? "మూడు రోజులు చిన్నగా, మళ్లీ చేయగలిగినట్టుగా ఉంచండి. దీనిని చాలా క్లిష్టం చేయాల్సిన అవసరం లేదు."
        : locale === "hi"
        ? "इसे तीन दिन छोटा और दोहराने लायक रखें। इसे जरूरत से ज्यादा जटिल न बनाएं।"
        : "Keep it small and repeatable for three days. No need to over-engineer it.";
    case "charity":
      return locale === "te"
        ? "నిశ్శబ్దంగా, నిజాయితీగా చేస్తే చాలు. దీన్ని ప్రదర్శనగా మార్చకండి."
        : locale === "hi"
        ? "शांत और सच्चे मन से करना काफी है। इसे दिखावे में मत बदलें।"
        : "Quiet and sincere is enough. Do not turn it into performance.";
    default:
      return locale === "te"
        ? "దాన్ని సులభంగా, ఉపయోగకరంగా ఉంచండి. ఒక్కసారి తీవ్రంగా చేయడం కంటే చిన్న స్థిరత్వం ముఖ్యం."
        : locale === "hi"
        ? "इसे सरल और व्यावहारिक रखें। एक बार बहुत करने से ज्यादा छोटी निरंतरता काम आती है।"
        : "Keep it simple and practical. Small consistency matters more than intensity.";
  }
}

function buildProvenance(
  input: Omit<GenerationProvenance, "engineVersion" | "plannerVersion">,
): GenerationProvenance {
  return {
    engineVersion: ENGINE_V,
    plannerVersion: PLANNER_VERSION,
    ...input,
  };
}

function narrativeCacheOk(
  cached: Record<string, unknown> | null,
  birthInputId: string | null,
  factSignature: string,
  promptVersion: string,
) {
  if (!cached) return false;
  if ((cached.birthInputId ?? null) !== birthInputId) return false;
  const provenance = cached.provenance as Record<string, unknown> | undefined;
  if (!provenance) return false;
  return provenance.engineVersion === ENGINE_V &&
    provenance.plannerVersion === PLANNER_VERSION &&
    provenance.promptVersion === promptVersion &&
    provenance.factSignature === factSignature;
}

type BirthPackRow = {
  id: string;
  content: BirthIntelligencePackContent;
  provider: string;
  model: string;
  status?: string;
  fact_signature: string;
  generated_for_date: string;
  expires_on: string | null;
};

type DailyTimingFact = {
  date: string;
  good: { start: string; end: string; label: string }[];
  caution: { start: string; end: string; label: string }[];
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isoDateOrUndefined(value: unknown): string | undefined {
  const text = safeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}

function weekCardKey(dateStr: string, tz: string): string {
  return DateTime.fromISO(dateStr, { zone: tz }).startOf("week").toISODate()!;
}

function monthCardKey(dateStr: string): string {
  return String(dateStr).slice(0, 7);
}

function packRangeCard(
  pack: BirthPackRow | null,
  scope: "weekly" | "monthly",
  dateStr: string,
  tz: string,
): PackRangeCard | null {
  const cards = scope === "weekly"
    ? asArray<PackRangeCard>(pack?.content.weekly_cards)
    : asArray<PackRangeCard>(pack?.content.monthly_cards);
  const key = scope === "weekly" ? weekCardKey(dateStr, tz) : monthCardKey(dateStr);
  return cards.find((c) => safeString(c.key) === key) ?? cards[0] ?? null;
}

function packTodayCard(pack: BirthPackRow | null, dateStr: string): PackTodayCard | null {
  const cards = asArray<PackTodayCard>(pack?.content.today_cards);
  return cards.find((c) => safeString(c.key) === dateStr) ?? cards[0] ?? null;
}

function normalizeWindowCopy(
  note: PackTimingWindowCopy | undefined,
  fallbackLabel: string,
  windowType: "good" | "caution",
) {
  return {
    category: safeString(note?.category) ||
      (windowType === "good" ? "Useful window" : fallbackLabel || "Caution"),
    why: safeString(note?.why_it_works),
    bestFor: asArray<string>(note?.best_for).map((s) => String(s).trim()).filter(Boolean),
    avoidFor: asArray<string>(note?.avoid_for).map((s) => String(s).trim()).filter(Boolean),
    shareLine: safeString(note?.share_line),
  };
}

function decorateWindows(
  windows: { start: string; end: string; label: string }[],
  notes: PackTimingWindowCopy[] | undefined,
  windowType: "good" | "caution",
) {
  return windows.map((w, i) => {
    const copy = normalizeWindowCopy(notes?.[i], w.label, windowType);
    return {
      start: w.start,
      end: w.end,
      label: copy.category || w.label,
      originalLabel: w.label,
      category: copy.category,
      whyItWorks: copy.why,
      bestFor: copy.bestFor,
      avoidFor: copy.avoidFor,
      shareLine: copy.shareLine,
      confidence: windowType === "good" ? "medium" : "high",
    };
  });
}

async function saveNarrativeCache(
  _supabase: SupabaseClient,
  _profileId: string,
  _targetDate: string,
  _locale: AppLocale,
  _narrativeType: string,
  _content: Record<string, unknown>,
) {
  // V4: daily_narrative_cache table removed — narratives are computed live.
}

function dailyTimingFacts(
  profile: ProfRow,
  startDate: string,
  days: number,
  tz: string,
): DailyTimingFact[] {
  const lat = Number(profile.current_lat ?? DEFAULT_LAT);
  const lng = Number(profile.current_lng ?? DEFAULT_LNG);
  return Array.from({ length: days }, (_, idx) => {
    const date = DateTime.fromISO(startDate, { zone: tz }).plus({ days: idx }).toISODate()!;
    const ref = parseDateAsUtcInstant(date, tz);
    const sun = sunriseSunset(ref, lat, lng);
    const slices = divideDaylight(sun, jsWeekday(date, tz));
    const { good, caution } = goodAndCautionWindows(slices, tz);
    return {
      date,
      good: good.map((w) => ({ start: w.start, end: w.end, label: w.label })),
      caution: caution.map((w) => ({ start: w.start, end: w.end, label: w.label })),
    };
  });
}

function buildPackPhasePlans(
  bi: BioRow,
  profile: ProfRow,
  locale: AppLocale,
  refInstant: Date,
  kernel: PersonalizationKernel | undefined,
): PhasePlan[] {
  const { segments, nk } = computeTimeline(bi, profile.current_timezone ?? "Asia/Kolkata");
  if (nk === null || !segments.length) return [];
  const ads = allAntardashasFromMahadashas(segments);
  const currentAd = segmentAtAntardasha(ads, refInstant);
  const recent = recentAntardashasClipped(ads, refInstant, JOURNEY_LOOKBACK_YEARS)
    .filter((seg) => {
      if (!currentAd) return true;
      // Drop the clipped tail of the live antardasha — we add the full segment below.
      return !(
        seg.mdLord === currentAd.mdLord &&
        seg.adLord === currentAd.adLord &&
        seg.start.getTime() >= currentAd.start.getTime()
      );
    });
  const futureStart = currentAd?.end.getTime() ?? refInstant.getTime();
  const future = ads
    .filter((seg) => seg.start.getTime() >= futureStart)
    .slice(0, 16);
  const seen = new Set<string>();
  const merged: AdSegment[] = [...recent];
  if (currentAd) merged.push(currentAd);
  merged.push(...future);
  const deduped = merged.filter((seg) => {
    const key = `${seg.mdLord}-${seg.adLord}-${seg.start.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.map((seg, idx) => {
    const fallback = antardashaFallbackCopy(
      seg.mdLord,
      seg.adLord,
      seg.start,
      seg.end,
      idx,
      locale,
    );
    return buildPhasePlan(seg, idx, locale, {
      now: refInstant,
      previous: idx > 0 ? deduped[idx - 1] ?? null : null,
      confidenceLabel: resolveEngineMode(bi) === "full_chart" ? "high" : "medium",
      periodLabel: plainPeriodLabel(seg.start, seg.end),
      fallbackTitle: fallback.title,
      fallbackSentences: fallback.sentences,
      kernel,
    });
  });
}

function fallbackTodayCard(
  day: DailyTimingFact,
  locale: AppLocale,
  facts: {
    kernel?: PersonalizationKernel;
    lifeChapter: ReturnType<typeof lifeChapterInfo>;
    oneLine: string;
    copy: ReturnType<typeof fallbackPackStrings>;
    dayIndex: number;
  },
): PackTodayCard {
  const lens = facts.kernel?.screenLenses.today?.[facts.dayIndex % 3];
  return {
    key: day.date,
    title: facts.copy.todayTitle(day.date),
    body: facts.lifeChapter?.actionLine || facts.oneLine,
    one_line: facts.oneLine,
    share_hook: facts.oneLine,
    better_for: lens?.actions?.length
      ? lens.actions
      : facts.kernel?.screenLenses.today?.[0]?.actions ?? [],
    be_careful: lens?.cautions?.length
      ? lens.cautions
      : facts.kernel?.screenLenses.today?.[0]?.cautions ?? [],
    good_window_notes: day.good.map(() => ({
      category: facts.copy.goodCategory,
      why_it_works: facts.copy.goodWhy,
      best_for: facts.copy.goodBestFor,
      avoid_for: facts.copy.goodAvoid,
      share_line: facts.oneLine,
    })),
    caution_window_notes: day.caution.map((w) => ({
      category: w.label,
      why_it_works: facts.copy.cautionWhy,
      best_for: facts.copy.cautionBestFor,
      avoid_for: facts.copy.cautionAvoid,
      share_line: facts.copy.cautionShare,
    })),
  };
}

function fallbackPackContent(
  locale: AppLocale,
  facts: {
    profile: ProfRow;
    bi: BioRow;
    dateStr: string;
    kernel?: PersonalizationKernel;
    phasePlans: PhasePlan[];
    timing: DailyTimingFact[];
    lifeChapter: ReturnType<typeof lifeChapterInfo>;
    weeklyKeys: string[];
    monthlyKeys: string[];
  },
): BirthIntelligencePackContent {
  const copy = fallbackPackStrings(locale);
  const oneLine = facts.kernel?.shareSeed || copy.oneLine;
  const weeklyLens = facts.kernel?.screenLenses.weekly ?? [];
  const monthlyLens = facts.kernel?.screenLenses.monthly ?? [];
  const weeklyCards: PackRangeCard[] = facts.weeklyKeys.map((key, idx) => ({
    key,
    title: copy.weeklyTitle,
    body: facts.lifeChapter?.summary || oneLine,
    share_hook: oneLine,
    better_for: weeklyLens[idx % weeklyLens.length]?.actions ??
      weeklyLens[0]?.actions ?? [],
    be_careful: weeklyLens[idx % weeklyLens.length]?.cautions ??
      weeklyLens[0]?.cautions ?? [],
  }));
  const monthlyCards: PackRangeCard[] = facts.monthlyKeys.map((key, idx) => ({
    key,
    title: copy.monthlyTitle,
    body: facts.lifeChapter?.summary || oneLine,
    share_hook: oneLine,
    better_for: monthlyLens[idx % monthlyLens.length]?.actions ??
      monthlyLens[0]?.actions ?? [],
    be_careful: monthlyLens[idx % monthlyLens.length]?.cautions ??
      monthlyLens[0]?.cautions ?? [],
  }));
  const firstWeekly = weeklyCards[0];
  const firstMonthly = monthlyCards[0];
  return {
    me_profile: {
      title: facts.kernel?.natal.archetype.key || "Your pattern",
      summary: facts.kernel?.natal.archetype.core || "Your reading is based on your birth rhythm.",
      share_hook: oneLine,
      strengths: facts.kernel ? [facts.kernel.natal.archetype.strength] : [],
      watchouts: facts.kernel ? [facts.kernel.natal.archetype.shadow] : [],
      daily_style: facts.kernel?.natal.archetype.resetStyle,
      characteristics: facts.kernel
        ? [
          facts.kernel.natal.archetype.workStyle,
          facts.kernel.natal.archetype.speechStyle,
          facts.kernel.natal.archetype.relationshipStyle,
        ]
        : [],
      relationship_pattern: facts.kernel?.natal.archetype.relationshipStyle,
      work_money_pattern: facts.kernel?.natal.archetype.workStyle,
      stress_reset_pattern: facts.kernel?.natal.archetype.resetStyle,
    },
    likely_life_events: facts.phasePlans.slice(0, 8).map((plan) => ({
      period_label: plan.periodLabel,
      event_theme: plan.activeDomains.slice(0, 2).join(" / "),
      why_it_may_fit: plan.evidenceLine,
      confidence: "soft" as const,
      pro_locked: false,
    })),
    current_phase: facts.lifeChapter
      ? {
        title: facts.lifeChapter.title,
        summary: facts.lifeChapter.summary,
        quality_label: facts.lifeChapter.qualityLabel,
        timeline_label: facts.lifeChapter.timelineLabel,
        action_line: facts.lifeChapter.actionLine,
        share_hook: oneLine,
      }
      : undefined,
    today_cards: facts.timing.map((day, idx) =>
      fallbackTodayCard(day, locale, {
        kernel: facts.kernel,
        lifeChapter: facts.lifeChapter,
        oneLine,
        copy,
        dayIndex: idx,
      })
    ),
    weekly_cards: weeklyCards,
    monthly_cards: monthlyCards,
    horizons: {
      week: {
        headline: firstWeekly?.title ?? copy.weeklyTitle,
        action_focus: firstWeekly?.body ?? oneLine,
        caution: firstWeekly?.be_careful?.[0] ?? "",
        share_line: firstWeekly?.share_hook ?? oneLine,
      },
      month: {
        headline: firstMonthly?.title ?? copy.monthlyTitle,
        strategy: firstMonthly?.body ?? oneLine,
        caution: firstMonthly?.be_careful?.[0] ?? "",
        share_line: firstMonthly?.share_hook ?? oneLine,
      },
    },
    journey_phases: facts.phasePlans.map((plan) => ({
      sortOrder: plan.id,
      periodLabel: plan.periodLabel,
      mahadashaLord: plan.mahadashaLord,
      antardashaLord: plan.antardashaLord,
      title: plan.fallbackTitle,
      highlight: plan.evidenceLine,
      sentences: plan.fallbackSentences.slice(0, 2),
      focusAreas: plan.activeDomains,
      tone: plan.supportThemes,
      pressureThemes: plan.pressureThemes,
      phasePulse: plan.phasePulse,
      transitionNote: plan.transitionNote,
      evidenceLine: plan.evidenceLine,
      shareHook: plan.shareHook,
      kernelSignals: plan.kernelSignals,
      domainLenses: plan.domainLenses,
      proLocked: false,
      subPhases: [],
    })),
    ask_knowledge: {
      compact_summary: facts.lifeChapter?.summary || oneLine,
      common_answers: [],
      boundaries: copy.boundaries,
    },
    pro_teasers: copy.proTeasers,
  };
}

function countTodayCards(content: Record<string, unknown> | BirthIntelligencePackContent): number {
  return asArray<PackTodayCard>((content as BirthIntelligencePackContent).today_cards).length;
}

function mergeBirthPackWithFallback(
  partial: BirthIntelligencePackContent,
  fallback: BirthIntelligencePackContent,
  keys: {
    dailyKeys: string[];
    weeklyKeys: string[];
    monthlyKeys: string[];
  },
): BirthIntelligencePackContent {
  const todayMap = new Map(
    asArray<PackTodayCard>(partial.today_cards)
      .filter((card) => safeString(card.key))
      .map((card) => [safeString(card.key), card]),
  );
  const weeklyMap = new Map(
    asArray<PackRangeCard>(partial.weekly_cards)
      .filter((card) => safeString(card.key))
      .map((card) => [safeString(card.key), card]),
  );
  const monthlyMap = new Map(
    asArray<PackRangeCard>(partial.monthly_cards)
      .filter((card) => safeString(card.key))
      .map((card) => [safeString(card.key), card]),
  );
  const fbToday = asArray<PackTodayCard>(fallback.today_cards);
  const fbWeekly = asArray<PackRangeCard>(fallback.weekly_cards);
  const fbMonthly = asArray<PackRangeCard>(fallback.monthly_cards);

  return {
    ...fallback,
    ...partial,
    today_cards: keys.dailyKeys.map((key, idx) =>
      todayMap.get(key) ?? fbToday[idx] ?? fbToday[0]
    ),
    weekly_cards: keys.weeklyKeys.map((key, idx) =>
      weeklyMap.get(key) ?? fbWeekly[idx] ?? fbWeekly[0]
    ),
    monthly_cards: keys.monthlyKeys.map((key, idx) =>
      monthlyMap.get(key) ?? fbMonthly[idx] ?? fbMonthly[0]
    ),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStaleGeneration(
  updatedAt: string | null | undefined,
  staleMs: number = PACK_GENERATION_STALE_MS,
): boolean {
  if (!updatedAt) return true;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > staleMs;
}

function isEmptyGeneratingPack(
  row: BirthPackRow | null | undefined,
): boolean {
  if (!row || row.status !== "generating") return false;
  return getPackScreensReady(row.content as BirthIntelligencePackContent).length === 0;
}

function isEmptyGeneratingStale(
  row: BirthPackRow & { updated_at?: string },
): boolean {
  return isEmptyGeneratingPack(row) &&
    isStaleGeneration(row.updated_at, PACK_GENERATION_EMPTY_STALE_MS);
}

function isAllowedBirthPackProvider(provider: string | null | undefined): boolean {
  const p = (provider ?? "").trim().toLowerCase();
  return p === "openai" || p === "openrouter" || p === "gemini" || p === "pending";
}

/** Serve LLM packs to the client: full `ready` or partial `generating` with unlockable screens. */
function isClientServablePack(
  row: BirthPackRow | null | undefined,
): row is BirthPackRow {
  if (!row) return false;
  if (row.status === "fallback") return false;
  if (!isAllowedBirthPackProvider(row.provider)) return false;
  if (row.status === "ready") return true;
  if (row.status === "generating") {
    const phases = (row.content as BirthIntelligencePackContent)?._generation
      ?.phases_done ?? [];
    if (phases.includes("deterministic_seed")) return false;
    const screens = getPackScreensReady(row.content as BirthIntelligencePackContent);
    if (screens.length === 0) return false;
    if (
      row.provider === "pending" &&
      row.model === "pending" &&
      phases.length === 0
    ) {
      return false;
    }
    return true;
  }
  return false;
}

async function fetchPackByFactSignature(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  factSignature: string,
  dateStr: string,
): Promise<BirthPackRow | null> {
  const { data, error } = await supabase
    .from("birth_intelligence_packs")
    .select("id, content, provider, model, status, fact_signature, generated_for_date, expires_on, updated_at")
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("engine_version", ENGINE_V)
    .eq("fact_signature", factSignature)
    .in("status", ["ready", "fallback", "generating"])
    .gte("expires_on", dateStr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BirthPackRow | null;
}

async function waitForPackCompletion(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  factSignature: string,
  dateStr: string,
  maxWaitMs: number = PACK_GENERATION_WAIT_MS,
): Promise<BirthPackRow | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const row = await fetchPackByFactSignature(
      supabase,
      profileId,
      birthInputId,
      locale,
      factSignature,
      dateStr,
    );
    if (row && row.status === "ready") {
      return row;
    }
    if (!row || row.status !== "generating" || isStaleGeneration(
      (row as BirthPackRow & { updated_at?: string }).updated_at,
    )) {
      break;
    }
    await sleep(PACK_GENERATION_POLL_MS);
  }
  return findBestExistingPack(supabase, profileId, birthInputId, locale);
}

async function clearStalePackGenerations(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
) {
  const emptyStaleBefore = new Date(Date.now() - PACK_GENERATION_EMPTY_STALE_MS)
    .toISOString();
  await supabase
    .from("birth_intelligence_packs")
    .delete()
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("status", "generating")
    .lt("updated_at", emptyStaleBefore);

  const staleBefore = new Date(Date.now() - PACK_GENERATION_STALE_MS).toISOString();
  const { data: staleRows, error: staleError } = await supabase
    .from("birth_intelligence_packs")
    .select("id, content")
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("status", "generating")
    .lt("updated_at", staleBefore);
  if (staleError) throw staleError;
  for (const row of staleRows ?? []) {
    const screens = getPackScreensReady(
      (row.content ?? {}) as BirthIntelligencePackContent,
    );
    if (screens.length > 0) continue;
    await supabase
      .from("birth_intelligence_packs")
      .delete()
      .eq("id", row.id);
  }
}

async function tryClaimPackGeneration(
  supabase: SupabaseClient,
  profile: ProfRow,
  bi: BioRow,
  locale: AppLocale,
  dateStr: string,
  factSignature: string,
  expiresOn: string,
): Promise<boolean> {
  await clearStalePackGenerations(supabase, profile.id, bi.id, locale);

  const { data: inFlight, error: inFlightError } = await supabase
    .from("birth_intelligence_packs")
    .select("id, updated_at, content, status")
    .eq("profile_id", profile.id)
    .eq("birth_input_id", bi.id)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("status", "generating")
    .maybeSingle();
  if (inFlightError) throw inFlightError;
  if (
    inFlight &&
    !isStaleGeneration(inFlight.updated_at as string) &&
    !isEmptyGeneratingStale(inFlight as BirthPackRow & { updated_at?: string })
  ) {
    return false;
  }

  if (inFlight?.id) {
    const screens = getPackScreensReady(
      (inFlight.content ?? {}) as BirthIntelligencePackContent,
    );
    const emptyStale = isEmptyGeneratingStale(
      inFlight as BirthPackRow & { updated_at?: string },
    );
    const fullStale = isStaleGeneration(inFlight.updated_at as string);
    if (emptyStale || (fullStale && screens.length === 0)) {
      await supabase
        .from("birth_intelligence_packs")
        .delete()
        .eq("id", inFlight.id);
    } else if (inFlight) {
      return false;
    }
  }

  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("birth_intelligence_packs")
    .insert({
      profile_id: profile.id,
      birth_input_id: bi.id,
      locale,
      pack_version: BIRTH_PACK_VERSION,
      engine_version: ENGINE_V,
      planner_version: PLANNER_VERSION,
      kernel_version: KERNEL_VERSION,
      provider: "pending",
      model: "pending",
      status: "generating",
      fact_signature: factSignature,
      content: {},
      generated_for_date: dateStr,
      expires_on: expiresOn,
      updated_at: nowIso,
    });
  if (insertError) {
    if (insertError.code === "23505") return false;
    throw insertError;
  }
  return true;
}

/** Read cached pack only — never starts OpenAI / Groq generation. */
async function loadBirthPack(
  supabase: SupabaseClient,
  profile: ProfRow,
  bi: BioRow | null,
  locale: AppLocale,
  dateStr: string,
): Promise<BirthPackRow | null> {
  if (!bi) return null;
  const best = await findBestExistingPack(supabase, profile.id, bi.id, locale);
  if (best) {
    attachNatalLuckToContent(
      best.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    return best;
  }
  return null;
}

async function findBestExistingPack(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
): Promise<BirthPackRow | null> {
  const { data, error } = await supabase
    .from("birth_intelligence_packs")
    .select("id, content, provider, model, status, fact_signature, generated_for_date, expires_on")
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  const rows = (data ?? []) as BirthPackRow[];
  return rows.find((row) =>
    row.status === "ready" && countTodayCards(row.content) >= PACK_DAILY_DAYS
  ) ?? null;
}

async function pruneStalePacks(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  keepId: string,
) {
  await supabase
    .from("birth_intelligence_packs")
    .delete()
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .neq("id", keepId);
}

function lifeMapChapterHasQuality(chapter: Record<string, unknown>): boolean {
  const theme = safeString(chapter.theme);
  const career = safeString(chapter.career);
  if (theme.length < 6 || career.length < 6) return false;
  if (
    career.includes("Career / Work / Business") ||
    career.includes("పని / కెరీర్ / వ్యాపారం") ||
    safeString(chapter.money).includes("turns messy details into something usable")
  ) {
    return false;
  }
  return true;
}

function phasePlanLifeMapChapter(plan: PhasePlan, locked = false): Record<string, unknown> {
  return {
    period: plan.periodLabel,
    theme: plan.fallbackTitle,
    career: plan.activeDomains.slice(0, 2).join(" / "),
    money: plan.supportThemes[0] ?? plan.evidenceLine,
    family_relationship: plan.domainLenses?.slice(0, 2).join(" / ") ||
      plan.kernelSignals?.slice(0, 2).join(" / ") ||
      plan.evidenceLine,
    avoid: plan.pressureThemes.slice(0, 2).join(" / "),
    share_line: plan.shareHook ?? plan.evidenceLine,
    locked,
  };
}

function ensureLifeMapCoverage(
  content: BirthIntelligencePackContent,
  phasePlans: PhasePlan[],
  locale: AppLocale,
) {
  const currentLifeMap = typeof content.life_map === "object" && content.life_map
    ? content.life_map as Record<string, unknown>
    : {};
  const existingPast = asArray<Record<string, unknown>>(currentLifeMap.past_chapters);
  const existingFuture = asArray<Record<string, unknown>>(currentLifeMap.future_chapters);
  const existingCurrent = typeof currentLifeMap.current_chapter === "object" &&
      currentLifeMap.current_chapter
    ? currentLifeMap.current_chapter as Record<string, unknown>
    : undefined;

  const byPeriod = (rows: Record<string, unknown>[]) =>
    new Map(rows.map((row) => [safeString(row.period), row]));
  const pastByPeriod = byPeriod(existingPast);
  const futureByPeriod = byPeriod(existingFuture);
  const pastPlans = phasePlans.filter((plan) => plan.tense === "past");
  const futurePlans = phasePlans.filter((plan) => plan.tense === "future");
  const currentPlan = phasePlans.find((plan) => plan.tense === "current");
  const currentPeriod = currentPlan?.periodLabel ?? safeString(existingCurrent?.period);

  content.life_map = {
    ...currentLifeMap,
    past_chapters: pastPlans.map((plan, idx) => {
      const fromPeriod = pastByPeriod.get(plan.periodLabel);
      if (fromPeriod && lifeMapChapterHasQuality(fromPeriod)) return fromPeriod;
      const fromIndex = existingPast[idx];
      if (fromIndex && lifeMapChapterHasQuality(fromIndex)) {
        return { ...fromIndex, period: plan.periodLabel };
      }
      return fromPeriod ?? fromIndex ?? phasePlanLifeMapChapter(plan);
    }).filter((row) => safeString(row.period) !== currentPeriod),
    current_chapter: existingCurrent && Object.keys(existingCurrent).length > 0
      ? existingCurrent
      : currentPlan
      ? {
        ...phasePlanLifeMapChapter(currentPlan),
        use_it_for: currentPlan.activeDomains.slice(0, 3).join(" / "),
      }
      : currentLifeMap.current_chapter,
    future_chapters: fillLifeMapFutureGaps(
      futurePlans.map((plan, idx) => {
        const fromPeriod = futureByPeriod.get(plan.periodLabel);
        if (fromPeriod && lifeMapChapterHasQuality(fromPeriod)) {
          return { ...fromPeriod, locked: fromPeriod.locked ?? idx > 0 };
        }
        const fromIndex = existingFuture[idx];
        if (fromIndex && lifeMapChapterHasQuality(fromIndex)) {
          return { ...fromIndex, period: plan.periodLabel, locked: fromIndex.locked ?? idx > 0 };
        }
        return fromPeriod ?? fromIndex ?? phasePlanLifeMapChapter(plan, idx > 0);
      }),
      locale,
    ),
  };
}

function phasePlanToJourneyPhase(
  plan: PhasePlan,
  sortOrder: number,
  proLocked: boolean,
): PackJourneyPhase {
  return {
    sortOrder,
    periodLabel: plan.periodLabel,
    mahadashaLord: plan.mahadashaLord,
    antardashaLord: plan.antardashaLord,
    title: plan.fallbackTitle,
    highlight: plan.evidenceLine,
    sentences: plan.fallbackSentences.slice(0, 2),
    focusAreas: plan.activeDomains,
    tone: plan.supportThemes,
    pressureThemes: plan.pressureThemes,
    phasePulse: plan.phasePulse,
    transitionNote: plan.transitionNote,
    evidenceLine: plan.evidenceLine,
    shareHook: plan.shareHook,
    kernelSignals: plan.kernelSignals,
    domainLenses: plan.domainLenses,
    proLocked,
    subPhases: [],
  };
}

/** Backfill missing journey phases / facts when planner timeline advances. */
function repairPackTimelineCoverage(
  content: BirthIntelligencePackContent,
  phasePlans: PhasePlan[],
  locale: AppLocale,
): boolean {
  if (!phasePlans.length) return false;

  const existing = asArray<PackJourneyPhase>(content.journey_phases);
  const byPeriod = new Map(
    existing.map((phase) => [safeString(phase.periodLabel), phase]),
  );
  let futureSeen = false;

  const repaired = phasePlans.map((plan, idx) => {
    const kept = byPeriod.get(plan.periodLabel);
    let defaultLocked = false;
    if (plan.tense === "future") {
      defaultLocked = futureSeen;
      futureSeen = true;
    }
    if (kept) {
      return {
        ...kept,
        sortOrder: idx,
        proLocked: kept.proLocked ?? defaultLocked,
      };
    }
    return phasePlanToJourneyPhase(plan, idx, defaultLocked);
  });

  const changed = repaired.length !== existing.length ||
    repaired.some((phase, idx) =>
      safeString(existing[idx]?.periodLabel) !== phase.periodLabel
    );

  content.journey_phases = repaired;
  content.journey_phase_facts = phasePlans.map((plan, idx) => ({
    sortOrder: idx,
    periodLabel: plan.periodLabel,
    mahadashaLord: plan.mahadashaLord,
    antardashaLord: plan.antardashaLord,
    tense: plan.tense,
    phasePulse: plan.phasePulse,
    transitionNote: plan.transitionNote,
    supportThemes: plan.supportThemes.slice(0, 3),
    pressureThemes: plan.pressureThemes.slice(0, 2),
  }));
  ensureLifeMapCoverage(content, phasePlans, locale);
  return changed;
}

function parsePeriodEndMonth(period: string): DateTime | null {
  const parts = period.split(" - ");
  const tail = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const dt = DateTime.fromFormat(tail.trim(), "LLL yyyy");
  return dt.isValid ? dt.endOf("month") : null;
}

function parsePeriodStartMonth(period: string): DateTime | null {
  const head = period.split(" - ")[0]?.trim() ?? period;
  const dt = DateTime.fromFormat(head, "LLL yyyy");
  return dt.isValid ? dt.startOf("month") : null;
}

function fillLifeMapFutureGaps(
  chapters: Record<string, unknown>[],
  locale: AppLocale,
): Record<string, unknown>[] {
  if (chapters.length < 2) return chapters;
  const bridgeCopy: Record<AppLocale, { theme: string; career: string; avoid: string }> = {
    en: {
      theme: "Transition stretch",
      career: "Finish loose ends before the next major phase opens.",
      avoid: "Forcing a big new start before rhythm settles.",
    },
    te: {
      theme: "మధ్యలో ఉన్న కాలం",
      career: "తర్వాతి పెద్ద దశ ముందు పెండింగ్ పనులు ముగించు.",
      avoid: "రిథమ్ సెట్టిల్ కాకముందే పెద్ద కొత్త స్టార్ట్ ఫోర్స్ చేయకు.",
    },
    hi: {
      theme: "बीच का समय",
      career: "अगले बड़े दौर से पहले pending काम पूरे करें.",
      avoid: "लय बैठने से पहले बड़ी नई शुरुआत ज़बरदस्ती न करें.",
    },
  };
  const copy = bridgeCopy[locale] ?? bridgeCopy.en;
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < chapters.length; i++) {
    out.push(chapters[i]);
    const next = chapters[i + 1];
    if (!next) continue;
    const end = parsePeriodEndMonth(safeString(chapters[i].period));
    const start = parsePeriodStartMonth(safeString(next.period));
    if (!end || !start) continue;
    const gapMonths = start.diff(end, "months").months;
    if (gapMonths >= 4) {
      const bridgeStart = end.plus({ months: 1 }).toFormat("LLL yyyy");
      const bridgeEnd = start.minus({ months: 1 }).toFormat("LLL yyyy");
      out.push({
        period: `${bridgeStart} - ${bridgeEnd}`,
        theme: copy.theme,
        career: copy.career,
        money: copy.career,
        family_relationship: copy.career,
        avoid: copy.avoid,
        share_line: copy.career,
        locked: false,
      });
    }
  }
  return out;
}

async function persistNotificationSchedule(
  supabase: SupabaseClient,
  pack: BirthPackRow,
  profile: ProfRow,
  bi: BioRow,
  locale: AppLocale,
  timing: DailyTimingFact[],
) {
  const notifications = pack.content.notification_copy;
  const notificationRows = timing.slice(0, 7).flatMap((day) => {
    const date = DateTime.fromISO(day.date, {
      zone: profile.current_timezone ?? "Asia/Kolkata",
    });
    const todayReady = notifications?.today_ready;
    const rows: Record<string, unknown>[] = [{
      profile_id: profile.id,
      birth_input_id: bi.id,
      pack_id: pack.id,
      notification_key: `today-ready:${day.date}`,
      notification_type: "today_ready",
      scheduled_at: date.set({ hour: 6, minute: 30 }).toUTC().toISO(),
      locale,
      title: safeString(todayReady?.title) || "Today's card is ready",
      body: safeString(todayReady?.body) || "Open your timing card before the day gets noisy.",
      deep_link: "muhurtha://today",
      payload: { date: day.date },
      updated_at: new Date().toISOString(),
    }];
    const goodFirst = day.good[0];
    if (goodFirst) {
      const start = DateTime.fromISO(`${day.date}T${goodFirst.start}`, {
        zone: profile.current_timezone ?? "Asia/Kolkata",
      });
      rows.push({
        profile_id: profile.id,
        birth_input_id: bi.id,
        pack_id: pack.id,
        notification_key: `good-start:${day.date}:${goodFirst.start}`,
        notification_type: "good_time_start",
        scheduled_at: start.toUTC().toISO(),
        locale,
        title: safeString(notifications?.good_time_start?.title) || "Good time starts now",
        body: safeString(notifications?.good_time_start?.body) ||
          "Use this window for one clean action.",
        deep_link: "muhurtha://today",
        payload: { date: day.date, window: goodFirst },
        updated_at: new Date().toISOString(),
      });
    }
    const cautionFirst = day.caution[0];
    if (cautionFirst) {
      const start = DateTime.fromISO(`${day.date}T${cautionFirst.start}`, {
        zone: profile.current_timezone ?? "Asia/Kolkata",
      });
      rows.push({
        profile_id: profile.id,
        birth_input_id: bi.id,
        pack_id: pack.id,
        notification_key: `caution-start:${day.date}:${cautionFirst.start}`,
        notification_type: "caution_start",
        scheduled_at: start.toUTC().toISO(),
        locale,
        title: safeString(notifications?.caution_start?.title) || "Go lighter now",
        body: safeString(notifications?.caution_start?.body) ||
          "Avoid forcing a new start in this window.",
        deep_link: "muhurtha://today",
        payload: { date: day.date, window: cautionFirst },
        updated_at: new Date().toISOString(),
      });
    }
    return rows;
  });
  if (notificationRows.length) {
    const { error } = await supabase.from("notification_schedule").upsert(
      notificationRows,
      { onConflict: "profile_id,notification_key,locale" },
    );
    if (error) throw error;
  }
}

async function persistPartialBirthPack(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  factSignature: string,
  partial: BirthIntelligencePackContent,
  llm?: { provider: string; model: string },
): Promise<void> {
  const update: Record<string, unknown> = {
    content: partial,
    updated_at: new Date().toISOString(),
  };
  if (llm?.provider) {
    update.provider = llm.provider;
    if (llm.model) update.model = llm.model;
  }
  const { error } = await supabase
    .from("birth_intelligence_packs")
    .update(update)
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("fact_signature", factSignature)
    .eq("status", "generating");
  if (error) {
    console.warn(`[birth-pack] partial persist failed: ${error.message}`);
    await logAppEvent(
      supabase,
      profileId,
      "birth_pack",
      "warn",
      "partial_persist_failed",
      undefined,
      { locale, factSignature: factSignature.slice(0, 80), error: error.message },
    );
  }
}

async function persistNotificationScheduleBestEffort(
  supabase: SupabaseClient,
  pack: BirthPackRow,
  profile: ProfRow,
  bi: BioRow,
  locale: AppLocale,
  timing: DailyTimingFact[],
) {
  try {
    await persistNotificationSchedule(supabase, pack, profile, bi, locale, timing);
  } catch (error) {
    await logAppEvent(
      supabase,
      profile.id,
      "birth_pack",
      "warn",
      errorMessage(error),
      error instanceof Error ? error.stack : undefined,
      {
        stage: "persist_notification_schedule",
        packId: pack.id,
        locale,
      },
    );
  }
}

function packAdvanceAgeMs(
  row: BirthPackRow & { updated_at?: string },
): number {
  const ts = Date.parse(row.updated_at ?? "");
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Date.now() - ts;
}

function shouldSchedulePackAdvance(
  row: BirthPackRow & { updated_at?: string },
): boolean {
  if (row.status !== "generating") return false;
  const content = row.content as BirthIntelligencePackContent;
  if (isPhaseAdvanceLocked(content)) return false;
  const remaining = birthPackPhasesRemaining(content);
  if (remaining.length === 0) return false;
  return packAdvanceAgeMs(row) >= PACK_ADVANCE_DEBOUNCE_MS;
}

function isPackGenerationStalled(
  row: BirthPackRow & { updated_at?: string },
): boolean {
  if (row.status !== "generating") return false;
  const content = row.content as BirthIntelligencePackContent;
  if (isPhaseAdvanceLocked(content)) return false;
  const remaining = birthPackPhasesRemaining(content);
  if (remaining.length === 0) return false;
  return packAdvanceAgeMs(row) >= PACK_ADVANCE_STALL_MS;
}

async function tryAcquirePhaseLock(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  factSignature: string,
  row: BirthPackRow & { updated_at?: string },
): Promise<boolean> {
  const content = (row.content ?? {}) as BirthIntelligencePackContent;
  if (isPhaseAdvanceLocked(content)) return false;

  const nextPhase = nextBirthPackPhase(content);
  if (!nextPhase) return false;

  const until = new Date(Date.now() + PACK_PHASE_LOCK_MS).toISOString();
  const nowIso = new Date().toISOString();
  const lockedContent: BirthIntelligencePackContent = {
    ...content,
    _generation: {
      phases_done: content._generation?.phases_done ?? [],
      screens_ready: content._generation?.screens_ready ??
        getPackScreensReady(content),
      updated_at: nowIso,
      advancing_phase: nextPhase,
      advancing_until: until,
    },
  };

  let query = supabase
    .from("birth_intelligence_packs")
    .update({ content: lockedContent, updated_at: nowIso })
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("fact_signature", factSignature)
    .eq("status", "generating");

  if (row.updated_at) {
    query = query.eq("updated_at", row.updated_at);
  }

  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    console.warn(`[birth-pack] phase lock acquire failed: ${error.message}`);
    return false;
  }
  return Boolean(data);
}

async function releasePhaseLock(
  supabase: SupabaseClient,
  profileId: string,
  birthInputId: string,
  locale: AppLocale,
  factSignature: string,
  dateStr: string,
): Promise<void> {
  const row = await fetchPackByFactSignature(
    supabase,
    profileId,
    birthInputId,
    locale,
    factSignature,
    dateStr,
  );
  if (!row) return;
  const content = (row.content ?? {}) as BirthIntelligencePackContent;
  if (!content._generation?.advancing_until) return;

  const cleared: BirthIntelligencePackContent = {
    ...content,
    _generation: {
      phases_done: content._generation?.phases_done ?? [],
      screens_ready: getPackScreensReady(content),
      updated_at: new Date().toISOString(),
    },
  };

  await supabase
    .from("birth_intelligence_packs")
    .update({
      content: cleared,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("fact_signature", factSignature)
    .eq("status", "generating");
}

type BirthPackContinuationContext = {
  supabase: SupabaseClient;
  profile: ProfRow;
  bi: BioRow;
  locale: AppLocale;
  dateStr: string;
  factSignature: string;
  expiresOn: string;
  packFacts: Record<string, unknown>;
  packQualityExpected: Parameters<typeof validateBirthPackQuality>[1];
  timing: DailyTimingFact[];
};

function scheduleBirthPackAdvanceIfNeeded(
  ctx: BirthPackContinuationContext,
  row: BirthPackRow | null | undefined,
): void {
  if (!row || row.status !== "generating") return;
  const remaining = birthPackPhasesRemaining(
    row.content as BirthIntelligencePackContent,
  );
  if (remaining.length === 0) return;
  scheduleBirthPackAdvance(ctx);
}

function scheduleBirthPackAdvance(ctx: BirthPackContinuationContext): void {
  const task = continueBirthPackGeneration(ctx, {
    maxPhases: PACK_ADVANCE_MAX_PHASES,
  });
  const edgeRuntime = (globalThis as {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
  } else {
    task.catch((error) => {
      console.error("[birth-pack] phased advance failed", error);
    });
  }
}

async function maybeResumeBirthPackGeneration(
  ctx: BirthPackContinuationContext,
  row: BirthPackRow & { updated_at?: string },
): Promise<BirthPackRow | null> {
  if (!shouldSchedulePackAdvance(row)) return row;

  if (isPackGenerationStalled(row)) {
    await continueBirthPackGeneration(ctx, { maxPhases: PACK_ADVANCE_MAX_PHASES });
    const refreshed = await fetchPackByFactSignature(
      ctx.supabase,
      ctx.profile.id,
      ctx.bi.id,
      ctx.locale,
      ctx.factSignature,
      ctx.dateStr,
    );
    return refreshed;
  }

  scheduleBirthPackAdvance(ctx);
  return row;
}

async function continueBirthPackGeneration(
  ctx: BirthPackContinuationContext,
  opts?: { maxPhases?: number },
): Promise<void> {
  const {
    supabase,
    profile,
    bi,
    locale,
    dateStr,
    factSignature,
    expiresOn,
    packFacts,
    packQualityExpected,
    timing,
  } = ctx;
  const maxPhases = opts?.maxPhases ?? PACK_ADVANCE_MAX_PHASES;

  try {
    const row = await fetchPackByFactSignature(
      supabase,
      profile.id,
      bi.id,
      locale,
      factSignature,
      dateStr,
    );
    if (!row || row.status !== "generating") return;

    const rowWithTs = row as BirthPackRow & { updated_at?: string };
    const existing = (row.content ?? {}) as BirthIntelligencePackContent;
    if (isPhaseAdvanceLocked(existing)) return;

    if (!(await tryAcquirePhaseLock(
      supabase,
      profile.id,
      bi.id,
      locale,
      factSignature,
      rowWithTs,
    ))) {
      return;
    }

    try {
      const lockedRow = await fetchPackByFactSignature(
        supabase,
        profile.id,
        bi.id,
        locale,
        factSignature,
        dateStr,
      );
      const lockedContent = (lockedRow?.content ?? existing) as BirthIntelligencePackContent;

      const result = await advanceBirthPackPhases(locale, packFacts, {
        supabase,
        profileId: profile.id,
        existingContent: lockedContent,
        maxPhases,
        onPhaseComplete: async (_phase, merged, llm) => {
          await persistPartialBirthPack(
            supabase,
            profile.id,
            bi.id,
            locale,
            factSignature,
            merged,
            llm,
          );
        },
      });

      if (result.complete && result.envelope) {
      const content = result.merged;
      const provider = result.envelope.provider;
      const model = result.envelope.model;
      attachNatalLuckToContent(
        content as Record<string, unknown>,
        birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
        locale,
      );
      const { data: saved, error: saveError } = await supabase
        .from("birth_intelligence_packs")
        .upsert({
          profile_id: profile.id,
          birth_input_id: bi.id,
          locale,
          pack_version: BIRTH_PACK_VERSION,
          engine_version: ENGINE_V,
          planner_version: PLANNER_VERSION,
          kernel_version: KERNEL_VERSION,
          provider,
          model,
          status: "ready",
          fact_signature: factSignature,
          content,
          generated_for_date: dateStr,
          expires_on: expiresOn,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "profile_id,birth_input_id,locale,pack_version,fact_signature",
        })
        .select("id, content, provider, model, status, fact_signature, generated_for_date, expires_on")
        .single();
      if (saveError) throw saveError;
      const pack = saved as BirthPackRow;
      await pruneStalePacks(supabase, profile.id, bi.id, locale, pack.id);
      await persistNotificationScheduleBestEffort(
        supabase,
        pack,
        profile,
        bi,
        locale,
        timing,
      );
      return;
    }

    if (result.failedPhase) {
      await logAppEvent(
        supabase,
        profile.id,
        "birth_pack",
        "warn",
        "birth_pack_phase_failed",
        undefined,
        {
          locale,
          phase: result.failedPhase,
          phasesRun: result.phasesRun,
        },
      );
    }
    } finally {
      await releasePhaseLock(
        supabase,
        profile.id,
        bi.id,
        locale,
        factSignature,
        dateStr,
      );
    }
  } catch (error) {
    await logAppEvent(
      supabase,
      profile.id,
      "birth_pack",
      "error",
      "birth_pack_generation_failed",
      error instanceof Error ? error.stack : undefined,
      { locale, error: errorMessage(error) },
    );
    const current = await fetchPackByFactSignature(
      supabase,
      profile.id,
      bi.id,
      locale,
      factSignature,
      dateStr,
    );
    if (!isClientServablePack(current)) {
      await supabase
        .from("birth_intelligence_packs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("birth_input_id", bi.id)
        .eq("locale", locale)
        .eq("pack_version", BIRTH_PACK_VERSION)
        .eq("status", "generating")
        .eq("fact_signature", factSignature);
    }
  }
}

async function ensureBirthPack(
  supabase: SupabaseClient,
  profile: ProfRow,
  bi: BioRow | null,
  locale: AppLocale,
  dateStr: string,
): Promise<BirthPackRow | null> {
  if (!bi) return null;
  const tz = profile.current_timezone ?? "Asia/Kolkata";
  const refInstant = parseDateAsUtcInstant(dateStr, tz);
  const { segments } = computeTimeline(bi, tz);
  const currentLords = segments.length ? vimshottariLordsAt(segments, refInstant) : null;
  const kernel = buildKernelForBirthInput(
    bi,
    profile,
    locale,
    refInstant,
    currentLords?.mdLord,
    currentLords?.adLord,
  );
  const timing = dailyTimingFacts(profile, dateStr, PACK_DAILY_DAYS, tz);
  const phasePlans = buildPackPhasePlans(bi, profile, locale, refInstant, kernel);
  const intent = profile.onboarding_intent ?? {};
  const factSignature = buildFactSignature([
    profile.id,
    bi.id,
    locale,
    BIRTH_PACK_VERSION,
    ENGINE_V,
    PLANNER_VERSION,
    KERNEL_VERSION,
    currentLords?.mdLord,
    currentLords?.adLord,
    kernel?.natal.archetype.key,
    kernel?.period.line,
    intentFingerprint(intent),
    phasePlans.map((p) => `${p.periodLabel}:${p.mahadashaLord}-${p.antardashaLord}:${p.tense}`)
      .join("|"),
  ]);

  const { data: existing, error: existingError } = await supabase
    .from("birth_intelligence_packs")
    .select("id, content, provider, model, status, fact_signature, generated_for_date, expires_on")
    .eq("profile_id", profile.id)
    .eq("birth_input_id", bi.id)
    .eq("locale", locale)
    .eq("pack_version", BIRTH_PACK_VERSION)
    .eq("engine_version", ENGINE_V)
    .eq("fact_signature", factSignature)
    .eq("status", "ready")
    .gte("expires_on", dateStr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const pack = existing as BirthPackRow;
    attachNatalLuckToContent(
      pack.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    await persistNotificationScheduleBestEffort(supabase, pack, profile, bi, locale, timing);
    return pack;
  }

  const cached = await findBestExistingPack(supabase, profile.id, bi.id, locale);
  if (cached && countTodayCards(cached.content) >= PACK_DAILY_DAYS) {
    attachNatalLuckToContent(
      cached.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    await persistNotificationScheduleBestEffort(supabase, cached, profile, bi, locale, timing);
    return cached;
  }

  const lifeChapter = lifeChapterInfo(kernel, locale);
  const packFacts = {
    profile: {
      display_name: profile.display_name,
      current_city: profile.current_city,
      language_code: profile.language_code,
      explanation_mode: profile.explanation_mode,
    },
    inferred_life_signals: inferLifeSignals(
      kernel,
      calculateAge(bi.date_of_birth),
      intent,
    ),
    birth: {
      date_of_birth: bi.date_of_birth,
      birth_place: bi.birth_place,
      birth_input_mode: bi.birth_input_mode,
      has_exact_time: bi.exact_birth_time != null,
      janma_nakshatra: bi.janma_nakshatra,
      nakshatra_pada: bi.nakshatra_pada,
      timezone: bi.birth_timezone,
      age: calculateAge(bi.date_of_birth),
    },
    locale,
    generation_date: dateStr,
    date_range: {
      daily_days: PACK_DAILY_DAYS,
      weekly_weeks: PACK_WEEKLY_WEEKS,
      monthly_months: PACK_MONTHLY_MONTHS,
    },
    personalization_kernel: kernel,
    current_life_chapter: lifeChapter,
    daily_timing_facts: timing,
    weekly_keys: Array.from({ length: PACK_WEEKLY_WEEKS }, (_, idx) =>
      weekCardKey(
        DateTime.fromISO(dateStr, { zone: tz }).plus({ weeks: idx }).toISODate()!,
        tz,
      )),
    monthly_keys: Array.from(
      { length: PACK_MONTHLY_MONTHS },
      (_, idx) =>
        monthCardKey(DateTime.fromISO(dateStr, { zone: tz }).plus({ months: idx }).toISODate()!),
    ),
    journey_phase_facts: phasePlans.map((p) => ({
      sortOrder: p.id,
      periodLabel: p.periodLabel,
      mahadashaLord: p.mahadashaLord,
      antardashaLord: p.antardashaLord,
      tense: p.tense,
      activeDomains: p.activeDomains,
      supportThemes: p.supportThemes,
      pressureThemes: p.pressureThemes,
      phasePulse: p.phasePulse,
      transitionNote: p.transitionNote,
      evidenceLine: p.evidenceLine,
      domainLenses: p.domainLenses,
      kernelSignals: p.kernelSignals,
      proLocked: false,
    })),
  };

  const weeklyKeys = packFacts.weekly_keys as string[];
  const monthlyKeys = packFacts.monthly_keys as string[];
  const packQualityExpected = {
    dailyCount: timing.length,
    weeklyCount: weeklyKeys.length,
    monthlyCount: monthlyKeys.length,
    dailyKeys: timing.map((day) => day.date),
    weeklyKeys,
    monthlyKeys,
    journeyPhaseCount: phasePlans.length,
    pastChapterCount: phasePlans.filter((plan) => plan.tense === "past").length,
    futureChapterCount: phasePlans.filter((plan) => plan.tense === "future").length,
  };

  const expiresOn = DateTime.fromISO(dateStr, { zone: tz }).plus({ days: PACK_DAILY_DAYS - 1 })
    .toISODate()!;

  const continuationCtx: BirthPackContinuationContext = {
    supabase,
    profile,
    bi,
    locale,
    dateStr,
    factSignature,
    expiresOn,
    packFacts,
    packQualityExpected,
    timing,
  };

  const exactRow = await fetchPackByFactSignature(
    supabase,
    profile.id,
    bi.id,
    locale,
    factSignature,
    dateStr,
  );
  if (isClientServablePack(exactRow)) {
    attachNatalLuckToContent(
      exactRow.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    await persistNotificationScheduleBestEffort(supabase, exactRow, profile, bi, locale, timing);
    if (exactRow.status === "generating") {
      const resumed = await maybeResumeBirthPackGeneration(continuationCtx, exactRow);
      if (resumed && isClientServablePack(resumed)) {
        attachNatalLuckToContent(
          resumed.content as Record<string, unknown>,
          birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
          locale,
        );
        return resumed;
      }
    }
    return exactRow;
  }

  const claimed = await tryClaimPackGeneration(
    supabase,
    profile,
    bi,
    locale,
    dateStr,
    factSignature,
    expiresOn,
  );
  if (!claimed) {
    const inFlight = await fetchPackByFactSignature(
      supabase,
      profile.id,
      bi.id,
      locale,
      factSignature,
      dateStr,
    );
    if (isClientServablePack(inFlight)) {
      attachNatalLuckToContent(
        inFlight.content as Record<string, unknown>,
        birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
        locale,
      );
      const resumed = await maybeResumeBirthPackGeneration(continuationCtx, inFlight);
      if (resumed && isClientServablePack(resumed)) {
        attachNatalLuckToContent(
          resumed.content as Record<string, unknown>,
          birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
          locale,
        );
        return resumed;
      }
      return inFlight;
    }

    const waited = await waitForPackCompletion(
      supabase,
      profile.id,
      bi.id,
      locale,
      factSignature,
      dateStr,
      isEmptyGeneratingPack(inFlight) ? PACK_GENERATION_EMPTY_WAIT_MS : PACK_GENERATION_WAIT_MS,
    );
    if (isClientServablePack(waited)) {
      attachNatalLuckToContent(
        waited.content as Record<string, unknown>,
        birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
        locale,
      );
      await persistNotificationScheduleBestEffort(supabase, waited, profile, bi, locale, timing);
      return waited;
    }
    const bestAfterWait = await findBestExistingPack(supabase, profile.id, bi.id, locale);
    if (isClientServablePack(bestAfterWait)) {
      attachNatalLuckToContent(
        bestAfterWait.content as Record<string, unknown>,
        birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
        locale,
      );
      await persistNotificationScheduleBestEffort(supabase, bestAfterWait, profile, bi, locale, timing);
      return bestAfterWait;
    }
    return null;
  }

  await logAppEvent(
    supabase,
    profile.id,
    "birth_pack",
    "info",
    "birth_pack_llm_started",
    undefined,
    { locale, factSignature: factSignature.slice(0, 120), mode: "phased-openai-mini-3" },
  );

  await continueBirthPackGeneration(continuationCtx, {
    maxPhases: PACK_ADVANCE_MAX_PHASES,
  });

  const afterFirstPhase = await fetchPackByFactSignature(
    supabase,
    profile.id,
    bi.id,
    locale,
    factSignature,
    dateStr,
  );
  if (isClientServablePack(afterFirstPhase)) {
    attachNatalLuckToContent(
      afterFirstPhase.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    scheduleBirthPackAdvanceIfNeeded(continuationCtx, afterFirstPhase);
    return afterFirstPhase;
  }

  scheduleBirthPackAdvanceIfNeeded(continuationCtx, afterFirstPhase);

  const partial = await fetchPackByFactSignature(
    supabase,
    profile.id,
    bi.id,
    locale,
    factSignature,
    dateStr,
  );
  if (isClientServablePack(partial)) {
    attachNatalLuckToContent(
      partial.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    return partial;
  }

  const bestAfterGeneration = await findBestExistingPack(supabase, profile.id, bi.id, locale);
  if (isClientServablePack(bestAfterGeneration)) {
    attachNatalLuckToContent(
      bestAfterGeneration.content as Record<string, unknown>,
      birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
      locale,
    );
    await persistNotificationScheduleBestEffort(
      supabase,
      bestAfterGeneration,
      profile,
      bi,
      locale,
      timing,
    );
    return bestAfterGeneration;
  }
  return null;
}

type AccessTier = "free" | "plus" | "pro";

type SubscriptionAccess = {
  planCode: string;
  tier: AccessTier;
  isPlus: boolean;
  isPro: boolean;
};

async function getSubscriptionAccess(
  supabase: SupabaseClient,
  profileId: string,
): Promise<SubscriptionAccess> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_code, status, current_period_end")
    .eq("profile_id", profileId)
    .in("status", ["trialing", "active"])
    .or(`current_period_end.is.null,current_period_end.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    await logAppEvent(
      supabase,
      profileId,
      "subscriptions",
      "warn",
      "Unable to read subscription status; treating as free",
      undefined,
      { error: error.message },
    );
    return {
      planCode: "free",
      tier: "free",
      isPlus: false,
      isPro: false,
    };
  }
  const planCode = String(data?.plan_code ?? "free").toLowerCase();
  const tier: AccessTier = planCode === "pro"
    ? "pro"
    : planCode === "plus"
    ? "plus"
    : "free";
  return {
    planCode,
    tier,
    isPlus: tier === "plus" || tier === "pro",
    isPro: tier === "pro",
  };
}

function buildAccessPayload(access: SubscriptionAccess) {
  return {
    isPro: access.isPro,
    isPlus: access.isPlus,
    planCode: access.planCode,
  };
}

function notificationAllowed(tier: AccessTier, notificationType: string): boolean {
  if (tier === "pro") return true;
  if (tier === "plus") {
    return ["today_ready", "good_time_start", "caution_start"].includes(
      notificationType,
    );
  }
  return notificationType === "today_ready";
}

function lockedTeaser(locale: AppLocale) {
  if (locale === "te") {
    return "ఈ దశ పూర్తి వివరాలు Proలో తెరుచుకుంటాయి.";
  }
  if (locale === "hi") {
    return "इस चरण का पूरा विवरण Pro में खुलता है.";
  }
  return "Full detail for this phase unlocks with Pro.";
}

function applyAccessMask(
  content: Record<string, unknown>,
  locale: AppLocale,
  tier: AccessTier,
): Record<string, unknown> {
  if (tier === "pro") return content;
  const out = { ...content };
  const teaser = lockedTeaser(locale);
  const lifeEventLimit = tier === "plus" ? 2 : 1;

  const lifeMap = typeof out.life_map === "object" && out.life_map
    ? { ...(out.life_map as Record<string, unknown>) }
    : undefined;
  if (lifeMap && Array.isArray(lifeMap.future_chapters)) {
    lifeMap.future_chapters = (lifeMap.future_chapters as Record<string, unknown>[]).map(
      (row, idx) => idx === 0
        ? { ...row, locked: false }
        : {
          ...row,
          locked: true,
          career: teaser,
          money: "",
          family_relationship: "",
          avoid: "",
        },
    );
    out.life_map = lifeMap;
  }

  const timingPlan = typeof out.timing_plan === "object" && out.timing_plan
    ? { ...(out.timing_plan as Record<string, unknown>) }
    : undefined;
  if (tier === "free" && timingPlan?.month && typeof timingPlan.month === "object") {
    const month = { ...(timingPlan.month as Record<string, unknown>) };
    month.strategy = teaser;
    month.caution = safeString(month.caution);
    timingPlan.month = month;
    out.timing_plan = timingPlan;
  }

  if (tier === "free" && Array.isArray(out.weekly_cards)) {
    out.weekly_cards = (out.weekly_cards as Record<string, unknown>[]).map(
      (row, idx) => idx === 0 ? row : { ...row, body: teaser, pro_locked: true },
    );
  }
  if (Array.isArray(out.monthly_cards)) {
    out.monthly_cards = (out.monthly_cards as Record<string, unknown>[]).map(
      (row) => ({ ...row, body: teaser, pro_locked: true }),
    );
  }

  if (Array.isArray(out.likely_life_events)) {
    out.likely_life_events = (out.likely_life_events as Record<string, unknown>[]).map(
      (row, idx) => idx < lifeEventLimit
        ? row
        : { ...row, pro_locked: true, why_it_may_fit: teaser },
    );
  }

  return out;
}

async function consumeAskQuota(
  supabase: SupabaseClient,
  profileId: string,
  usageDate: string,
  isPlus: boolean,
) {
  if (isPlus) return { planCode: "plus", remaining: null as number | null };
  const { data: row, error: readError } = await supabase
    .from("ask_usage")
    .select("ask_count")
    .eq("profile_id", profileId)
    .eq("usage_date", usageDate)
    .maybeSingle();
  if (readError) throw readError;
  const current = Number(row?.ask_count ?? 0);
  if (current >= FREE_ASKS_PER_DAY) {
    throw new ActionError(
      "free_ask_limit_reached",
      "Free plan includes 1 Ask per day. Upgrade to Plus for unlimited questions.",
      429,
    );
  }
  const { error: writeError } = await supabase.from("ask_usage").upsert({
    profile_id: profileId,
    usage_date: usageDate,
    plan_code: "free",
    ask_count: current + 1,
    llm_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id,usage_date" });
  if (writeError) throw writeError;
  return { planCode: "free", remaining: Math.max(0, FREE_ASKS_PER_DAY - current - 1) };
}

export async function logAppEvent(
  supabase: SupabaseClient,
  profileId: string | null,
  service: string,
  level: string,
  message: string,
  stack?: string,
  context?: Record<string, unknown>,
) {
  try {
    await supabase.from("app_logs").insert({
      profile_id: profileId,
      service,
      level,
      message,
      stack_trace: stack,
      context: context ?? {},
    });
  } catch (e) {
    console.error("Failed to log to DB:", e);
  }
}

async function getProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, current_city, current_timezone, current_lat, current_lng, display_name, language_code, explanation_mode, onboarding_intent",
    )
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new Error("Profile not found");
  return data as ProfRow;
}

async function getBirthInput(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<BioRow> {
  const { data, error } = await supabase
    .from("birth_inputs")
    .select(
      "id, profile_id, date_of_birth, birth_place, birth_input_mode, exact_birth_time, time_bucket, janma_nakshatra, nakshatra_pada, birth_timezone, birth_lat, birth_lng",
    )
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Birth input not found");
  if (data.profile_id !== profileId) throw new Error("Forbidden");
  return data as BioRow;
}

async function getLatestBirthInput(
  supabase: SupabaseClient,
  profileId: string,
): Promise<BioRow | null> {
  const { data, error } = await supabase
    .from("birth_inputs")
    .select(
      "id, profile_id, date_of_birth, birth_place, birth_input_mode, exact_birth_time, time_bucket, janma_nakshatra, nakshatra_pada, birth_timezone, birth_lat, birth_lng",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BioRow | null;
}

function parseBirthDate(isoDate: string): Date {
  const d = String(isoDate).slice(0, 10);
  return new Date(`${d}T12:00:00.000Z`);
}

function resolveBirthZone(bi: BioRow, profileTimezone: string): string {
  return bi.birth_timezone ?? profileTimezone ?? "Asia/Kolkata";
}

/** Wall-clock birth in [zone] → UTC. Requires exact_birth_time + date_of_birth. */
function birthInstantUtc(bi: BioRow, zone: string): Date | null {
  if (!bi.exact_birth_time) return null;
  const dateStr = String(bi.date_of_birth).slice(0, 10);
  let timeStr = String(bi.exact_birth_time).trim();
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) timeStr += ":00";
  const isoLocal = `${dateStr}T${timeStr}`;
  const dt = DateTime.fromISO(isoLocal, { zone });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

function vimshottariEpochUtc(bi: BioRow, zone: string): Date {
  const exact = birthInstantUtc(bi, zone);
  if (exact && resolveEngineMode(bi) === "full_chart") return exact;
  return parseBirthDate(String(bi.date_of_birth).slice(0, 10));
}

function computeTimeline(
  bi: BioRow,
  profileTimezone: string,
): { segments: MdSegment[]; nk: number | null; moonFraction: number | null } {
  const zone = resolveBirthZone(bi, profileTimezone);
  const epoch = vimshottariEpochUtc(bi, zone);
  const moonUtc = birthInstantUtc(bi, zone);
  const moonLon = moonUtc != null ? moonSiderealLongitudeDeg(moonUtc) : null;
  const meta = siderealMetaFromNameOrMoon(
    bi.janma_nakshatra,
    bi.nakshatra_pada,
    moonLon,
  );
  if (!meta) return { segments: [], nk: null, moonFraction: null };
  return {
    segments: vimshottariMahadashas(
      epoch,
      meta.idx,
      meta.pada,
      meta.withinFraction ?? null,
    ),
    nk: meta.idx,
    moonFraction: meta.withinFraction ?? null,
  };
}

async function ensureBirthPlacePrecision(
  supabase: SupabaseClient,
  bi: BioRow | null,
): Promise<BioRow | null> {
  if (!bi) return null;
  if (bi.birth_lat != null && bi.birth_lng != null && bi.birth_timezone) {
    return bi;
  }
  const resolved = await resolveBirthPlace(bi.birth_place);
  if (!resolved) return bi;
  await supabase.from("birth_inputs").update({
    birth_lat: resolved.lat,
    birth_lng: resolved.lng,
    birth_timezone: resolved.timezone,
    updated_at: new Date().toISOString(),
  }).eq("id", bi.id);
  return {
    ...bi,
    birth_lat: resolved.lat,
    birth_lng: resolved.lng,
    birth_timezone: resolved.timezone,
  };
}

function nextMahadashaLord(
  segments: MdSegment[],
  current: MdSegment | null,
): string | null {
  if (!current) return null;
  const idx = segments.findIndex((s) =>
    s.start.getTime() === current.start.getTime() &&
    s.end.getTime() === current.end.getTime() &&
    s.lord === current.lord
  );
  return idx >= 0 ? segments[idx + 1]?.lord ?? null : null;
}

function buildKernelForBirthInput(
  bi: BioRow | null,
  profile: ProfRow,
  locale: AppLocale,
  refInstant: Date,
  mdLord?: string | null,
  adLord?: string | null,
): PersonalizationKernel | undefined {
  if (!bi) return undefined;
  const tz = profile.current_timezone ?? "Asia/Kolkata";
  const natalMoon = birthMoonDetails(bi, tz, locale);
  const birthSun = birthSunDetails(bi, tz, locale);
  const { segments } = computeTimeline(bi, tz);
  const mdSeg = segments.length ? segmentAt(segments, refInstant) : null;
  return buildPersonalizationKernel({
    locale,
    age: calculateAge(bi.date_of_birth),
    birthMoonSign: natalMoon?.sign.label,
    birthMoonNakshatra: natalMoon?.nakshatra ?? bi.janma_nakshatra,
    nakshatraPada: natalMoon?.pada ?? bi.nakshatra_pada,
    sunSign: birthSun?.label,
    mahadashaLord: mdLord ?? mdSeg?.lord,
    antardashaLord: adLord ?? mdLord ?? mdSeg?.lord,
    mahadashaStart: mdSeg?.start ?? null,
    mahadashaEnd: mdSeg?.end ?? null,
    nextMahadashaLord: nextMahadashaLord(segments, mdSeg),
    refDate: refInstant,
  });
}

const purposeRules: Record<string, { favor: string[]; caution: string[] }> = {
  career_interview: { favor: ["Mercury", "Jupiter"], caution: ["Rahu", "Mars"] },
  business_launch: {
    favor: ["Mercury", "Jupiter", "Venus"],
    caution: ["Rahu", "Saturn"],
  },
  money_talk: { favor: ["Jupiter", "Venus", "Mercury"], caution: ["Rahu"] },
  property_vehicle: { favor: ["Mars", "Saturn"], caution: ["Rahu"] },
  relationship_marriage_talk: {
    favor: ["Venus", "Jupiter", "Moon"],
    caution: ["Mars", "Rahu"],
  },
  family_discussion: { favor: ["Moon", "Jupiter"], caution: ["Mars"] },
  travel: { favor: ["Moon", "Jupiter"], caution: ["Rahu"] },
  study_exam: { favor: ["Mercury", "Jupiter"], caution: ["Rahu"] },
  health_routine: { favor: ["Saturn", "Sun"], caution: ["Rahu"] },
  legal_dispute: { favor: ["Saturn", "Mars", "Mercury"], caution: ["Rahu"] },
  spiritual_puja: { favor: ["Jupiter", "Moon"], caution: ["Rahu"] },
  creative_public: { favor: ["Venus", "Mercury", "Moon"], caution: ["Rahu"] },
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch (_e) {
    return String(error);
  }
}

export async function handleRequest(
  supabase: SupabaseClient,
  user: User,
  body: Record<string, unknown>,
  loggingSupabase: SupabaseClient = supabase,
): Promise<unknown> {
  const action = body.action as string;
  if (!action) {
    throw new ActionError("missing_action", "Missing action", 400);
  }

  let prof: ProfRow | null = null;
  try {
    prof = await getProfileForUser(supabase, user);
  } catch (_e) {
    // Some actions like chart_initialize might run before profile is fully hydrated
    // but usually user is there.
  }

  if (action === "log_app_event") {
    const service = (body.service as string) ?? "app";
    const level = (body.level as string) ?? "info";
    const message = (body.message as string) ?? "";
    const stack = (body.stack_trace as string) ?? "";
    const ctx = (body.context as Record<string, unknown>) ?? {};
    await logAppEvent(loggingSupabase, prof?.id ?? null, service, level, message, stack, ctx);
    return { success: true };
  }

  try {
    return await _handleInternal(supabase, prof, body, loggingSupabase);
  } catch (e) {
    const msg = errorMessage(e);
    const stack = e instanceof Error ? e.stack : "";
    await logAppEvent(loggingSupabase, prof?.id ?? null, "api", "error", msg, stack, {
      action,
      body,
    });
    throw e;
  }
}

async function _handleInternal(
  supabase: SupabaseClient,
  prof: ProfRow | null,
  body: Record<string, unknown>,
  adminSupabase: SupabaseClient = supabase,
): Promise<unknown> {
  const action = body.action as string;

  const DEPRECATED_ACTIONS = new Set([
    "quick_proof_generate",
    "validation_submit",
    "journey_get",
    "weekly_get",
    "monthly_get",
    "purpose_check",
    "share_card_generate",
  ]);
  if (DEPRECATED_ACTIONS.has(action)) {
    throw new ActionError(
      "action_deprecated",
      `${action} is no longer available`,
      410,
    );
  }

  if (action === "birth_place_resolve") {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const resolved = await resolveCoordinates(lat, lng);
      if (!resolved) {
        throw new ActionError(
          "birth_place_not_resolved",
          "Could not resolve coordinates",
          422,
        );
      }
      return resolved;
    }
    const place = String(body.place ?? "").trim();
    const resolved = await resolveBirthPlace(place);
    if (!resolved) {
      throw new ActionError(
        "birth_place_not_resolved",
        "Could not resolve birth place",
        422,
      );
    }
    return resolved;
  }

  if (action === "chart_initialize") {
    const birthInputId = body.birth_input_id as string;
    if (!birthInputId) {
      throw new ActionError(
        "missing_birth_input_id",
        "birth_input_id required",
        400,
      );
    }
    const profile = requireProfile(prof, action);
    const rawBi = await getBirthInput(supabase, birthInputId, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    if (!bi) {
      throw new ActionError("birth_input_missing", "No birth input", 409);
    }
    const engineMode = resolveEngineMode(bi);
    const tz = resolveBirthZone(bi, profile.current_timezone ?? "Asia/Kolkata");
    const moonUtc = birthInstantUtc(bi, tz);
    const moonLon = moonUtc != null ? moonSiderealLongitudeDeg(moonUtc) : null;
    const meta = siderealMetaFromNameOrMoon(
      bi.janma_nakshatra,
      bi.nakshatra_pada,
      moonLon,
    );
    const rashiKey = moonLon != null ? rashiKeyFromSiderealLon(moonLon) : null;
    const janmaOut = meta?.name ?? bi.janma_nakshatra;
    const padaOut = meta?.pada ?? bi.nakshatra_pada;

    if (meta && !bi.janma_nakshatra) {
      await supabase.from("birth_inputs").update({
        janma_nakshatra: meta.name,
        nakshatra_pada: meta.pada,
        updated_at: new Date().toISOString(),
      }).eq("id", bi.id);
    }

    const raw = {
      birth_input_id: bi.id,
      birth_input_mode: bi.birth_input_mode,
      resolved_engine_mode: engineMode,
      derived_from_ephemeris: !bi.janma_nakshatra && meta != null,
      moon_fraction_within_nakshatra: meta?.withinFraction ?? null,
    };
    const { data: chart, error } = await supabase
      .from("chart_runs")
      .insert({
        profile_id: profile.id,
        birth_input_id: bi.id,
        engine_mode: engineMode,
        engine_version: ENGINE_V,
        rashi: rashiKey,
        janma_nakshatra: janmaOut,
        nakshatra_pada: padaOut,
        raw_context: raw,
        calculation_status: "complete",
      })
      .select("id")
      .single();
    if (error) throw error;
    const nk = meta?.idx ?? null;
    const canQuick = nk != null &&
      engineMode !== "general_panchanga" &&
      engineMode !== "window_chart";
    return {
      chartRunId: chart.id,
      engineMode,
      confidenceLabel: canQuick ? "structured" : "general_day",
      canShowQuickProof: canQuick,
      canShowPurposeTiming: true,
      canShowPersonalJourney: canQuick,
    };
  }

  const profile = requireProfile(prof, action);

  if (action === "subscription_sync") {
    const planCode = String(body.plan_code ?? "").trim().toLowerCase();
    if (!["free", "plus", "pro"].includes(planCode)) {
      throw new ActionError("invalid_plan_code", "plan_code must be free, plus, or pro", 400);
    }
    const providerSubId = String(
      body.provider_subscription_id ?? "revenuecat_active",
    ).trim() || "revenuecat_active";
    const periodEndRaw = body.current_period_end;
    const periodEnd = periodEndRaw == null
      ? null
      : new Date(String(periodEndRaw)).toISOString();
    const status = planCode === "free" ? "expired" : "active";
    const { error } = await adminSupabase.from("subscriptions").upsert(
      {
        profile_id: profile.id,
        plan_code: planCode,
        status,
        provider: "revenuecat",
        provider_subscription_id: providerSubId,
        current_period_end: periodEnd,
        entitlement: {
          source: "client_sync",
          product_id: body.product_id ?? null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,provider,provider_subscription_id" },
    );
    if (error) throw error;
    const access = await getSubscriptionAccess(supabase, profile.id);
    return { access: buildAccessPayload(access) };
  }

  if (action === "birth_pack_get") {
    // Sole entry point for birth-pack LLM generation (one call per locale, lock-protected).
    const locale = requestLocale(body, profile);
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const dateStr = (body.date as string) ?? todayInTimezone(tz);
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    if (!bi) {
      throw new ActionError("birth_input_missing", "No birth input", 409);
    }
    const pack = await ensureBirthPack(adminSupabase, profile, bi, locale, dateStr);
    if (!pack) {
      throw new ActionError(
        "birth_pack_not_ready",
        "Birth pack is not ready yet",
        503,
      );
    }

    if (!isClientServablePack(pack)) {
      throw new ActionError(
        "birth_pack_not_ready",
        "Birth pack is not ready yet",
        503,
      );
    }

    const refInstant = parseDateAsUtcInstant(dateStr, tz);
    const { segments } = computeTimeline(bi, tz);
    const currentLords = segments.length ? vimshottariLordsAt(segments, refInstant) : null;
    const kernel = buildKernelForBirthInput(
      bi,
      profile,
      locale,
      refInstant,
      currentLords?.mdLord,
      currentLords?.adLord,
    );
    const phasePlans = buildPackPhasePlans(bi, profile, locale, refInstant, kernel);
    const packContent = pack.content as BirthIntelligencePackContent;
    if (repairPackTimelineCoverage(packContent, phasePlans, locale)) {
      await adminSupabase
        .from("birth_intelligence_packs")
        .update({ content: packContent, updated_at: new Date().toISOString() })
        .eq("id", pack.id);
      pack.content = packContent;
    }

    const packStatus = pack.status ?? "ready";
    const screensReady = getPackScreensReady(
      pack.content as BirthIntelligencePackContent,
    );

    const access = await getSubscriptionAccess(supabase, profile.id);
    const maskedContent = applyAccessMask(
      pack.content as Record<string, unknown>,
      locale,
      access.tier,
    );

    return {
      date: dateStr,
      locale,
      displayName: profile.display_name,
      locationLabel: profile.current_city ?? "India",
      birthInputId: bi.id,
      packVersion: BIRTH_PACK_VERSION,
      provider: pack.provider,
      model: pack.model,
      status: packStatus,
      screensReady,
      content: maskedContent,
      access: buildAccessPayload(access),
      natalLuck: buildNatalLuck(
        birthMoonDetails(bi, profile.current_timezone ?? "Asia/Kolkata", locale)?.sign,
        locale,
      ),
    };
  }

  if (action === "notification_schedule_get") {
    const locale = requestLocale(body, profile);
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const dateStr = (body.date as string) ?? todayInTimezone(tz);
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    if (bi) {
      await loadBirthPack(supabase, profile, bi, locale, dateStr);
    }
    const nowIso = new Date().toISOString();
    const untilIso = DateTime.fromISO(dateStr, { zone: tz }).plus({ days: 7 }).toUTC().toISO();
    const access = await getSubscriptionAccess(supabase, profile.id);
    const { data, error } = await supabase
      .from("notification_schedule")
      .select(
        "id, notification_key, notification_type, scheduled_at, title, body, deep_link, payload",
      )
      .eq("profile_id", profile.id)
      .eq("locale", locale)
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", untilIso)
      .order("scheduled_at", { ascending: true })
      .limit(32);
    if (error) throw error;
    const rows = (data ?? []).filter((row) =>
      notificationAllowed(
        access.tier,
        String(row.notification_type ?? ""),
      )
    );
    return { notifications: rows, locale, access: buildAccessPayload(access) };
  }

  if (action === "quick_proof_generate") {
    const locale = requestLocale(body, profile);
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    if (!bi) {
      throw new ActionError("birth_input_missing", "No birth input", 409);
    }

    const { data: chart } = await supabase
      .from("chart_runs")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!chart) {
      throw new ActionError(
        "chart_not_initialized",
        "Chart not initialized",
        409,
      );
    }

    await supabase
      .from("phase_runs")
      .delete()
      .eq("profile_id", profile.id)
      .eq("run_type", "quick_proof");

    const engineMode = chart.engine_mode as string;
    const { segments, nk } = computeTimeline(
      bi,
      profile.current_timezone ?? "Asia/Kolkata",
    );
    let cards: unknown[] = [];

    if (
      nk != null && segments.length > 0 && engineMode !== "window_chart" &&
      engineMode !== "general_panchanga"
    ) {
      const now = new Date();
      const ads = allAntardashasFromMahadashas(segments);
      const recent = recentAntardashasClipped(ads, now, JOURNEY_LOOKBACK_YEARS)
        .slice(-5);
      const currentLords = vimshottariLordsAt(segments, now);
      const kernel = buildKernelForBirthInput(
        bi,
        profile,
        locale,
        now,
        currentLords?.mdLord,
        currentLords?.adLord,
      );
      const { data: prun, error: e2 } = await supabase
        .from("phase_runs")
        .insert({
          profile_id: profile.id,
          chart_run_id: chart.id,
          engine_version: ENGINE_V,
          run_type: "quick_proof",
          status: "complete",
        })
        .select("id")
        .single();
      if (e2) throw e2;

      const confidenceLabel = engineMode === "full_chart" ? "high" : "medium";
      const plans: PhasePlan[] = recent.map((seg, idx) => {
        const fallback = antardashaFallbackCopy(
          seg.mdLord,
          seg.adLord,
          seg.start,
          seg.end,
          idx,
          locale,
        );
        return buildPhasePlan(seg, idx, locale, {
          now,
          previous: idx > 0 ? recent[idx - 1] ?? null : null,
          confidenceLabel,
          periodLabel: plainPeriodLabel(seg.start, seg.end),
          fallbackTitle: fallback.title,
          fallbackSentences: fallback.sentences,
          kernel,
        });
      });
      const age = bi ? calculateAge(bi.date_of_birth) : undefined;
      const llmEnvelope = await generateProofLlmCards(plans, locale, age, {
        supabase,
        profileId: profile.id,
      });
      let sort = 0;
      const rows: Record<string, unknown>[] = [];
      for (const plan of plans) {
        const llm = llmEnvelope?.cards.get(plan.id) ?? null;
        const seg = recent[plan.id]!;
        const endInclusive = DateTime.fromJSDate(seg.end)
          .minus({ days: 1 })
          .toISODate()!;
        rows.push({
          phase_run_id: prun.id,
          profile_id: profile.id,
          start_date: seg.start.toISOString().slice(0, 10),
          end_date: endInclusive,
          mahadasha_lord: seg.mdLord,
          antardasha_lord: seg.adLord,
          active_life_areas: plan.activeDomains,
          main_themes: [...plan.supportThemes, ...plan.dailyTexture].slice(0, 3),
          caution_themes: [],
          confidence_label: confidenceLabel,
          sort_order: sort++,
          deterministic_context: {
            sentences: plan.fallbackSentences,
            card_title: plan.fallbackTitle,
            period_label: plan.periodLabel,
            md_lord: seg.mdLord,
            ad_lord: seg.adLord,
            phase_pulse: plan.phasePulse,
            active_domains: plan.activeDomains,
            support_themes: plan.supportThemes,
            pressure_themes: plan.pressureThemes,
            kernel_signals: plan.kernelSignals,
            domain_lenses: plan.domainLenses,
            share_hook: llm?.share_hook ?? plan.shareHook,
            evidence_line: plan.evidenceLine,
            transition_note: plan.transitionNote,
            llm_title: llm?.title ?? null,
            llm_highlight: llm?.highlight ?? null,
            llm_sentences: llm?.sentences ?? null,
            provenance: buildProvenance({
              promptVersion: llmEnvelope?.promptVersion ?? "proof-fallback",
              provider: llmEnvelope?.provider ?? "deterministic",
              model: llmEnvelope?.model ?? "none",
              source: llm ? "llm" : "fallback",
              factSignature: buildFactSignature([
                profile.id,
                bi.id,
                KERNEL_VERSION,
                seg.mdLord,
                seg.adLord,
                plan.phasePulse,
                plan.activeDomains.join(","),
                plan.kernelSignals?.join(","),
              ]),
            }),
          },
        });
      }

      const { data: inserted, error: e3 } = await supabase
        .from("phase_segments")
        .insert(rows)
        .select("id, deterministic_context");
      if (e3) throw e3;

      cards = (inserted ?? []).map((r: Record<string, unknown>) => {
        const ctx = r.deterministic_context as Record<string, unknown>;
        const llmTitle = typeof ctx.llm_title === "string" ? ctx.llm_title : null;
        const llmHighlight = typeof ctx.llm_highlight === "string" ? ctx.llm_highlight : null;
        const llmSentences = Array.isArray(ctx.llm_sentences)
          ? ctx.llm_sentences.map((x) => String(x))
          : null;
        return {
          phaseSegmentId: r.id,
          periodLabel: ctx.period_label,
          title: llmTitle ?? ctx.card_title,
          highlight: llmHighlight ?? ctx.evidence_line,
          sentences: llmSentences ?? ctx.sentences,
          activeDomains: Array.isArray(ctx.active_domains) ? ctx.active_domains : [],
          shareHook: ctx.share_hook,
          phasePulse: ctx.phase_pulse,
          evidenceLine: ctx.evidence_line,
          confidenceLabel,
          validationOptions: ["exactly_this", "partly_true", "wrong_timing", "didnt_happen"],
        };
      });
    } else {
      cards = [];
    }

    return { cards, engineMode };
  }

  if (action === "validation_submit") {
    const phaseSegmentId = body.phase_segment_id as string;
    const feedbackValue = body.feedback_value as string;
    if (!phaseSegmentId || !feedbackValue) {
      throw new ActionError(
        "validation_missing_fields",
        "Missing fields",
        400,
      );
    }
    const { data: pseg } = await supabase
      .from("phase_segments")
      .select("profile_id")
      .eq("id", phaseSegmentId)
      .maybeSingle();
    if (!pseg || pseg.profile_id !== profile.id) {
      throw new ActionError("invalid_phase_segment", "Invalid segment", 400);
    }

    const { error } = await supabase.from("validation_feedback").insert({
      profile_id: profile.id,
      phase_segment_id: phaseSegmentId,
      feedback_value: feedbackValue,
      optional_note: (body.optional_note as string) ?? null,
    });
    if (error) throw error;
    return {
      saved: true,
      nextAction: feedbackValue === "wrong_timing" || feedbackValue === "didnt_happen"
        ? "show_more_phases"
        : "go_to_today",
    };
  }

  if (action === "today_get") {
    const locale = requestLocale(body, profile);
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const dateStr = (body.date as string) ?? todayInTimezone(tz);

    const refInstant = parseDateAsUtcInstant(dateStr, tz);
    const lat = Number(profile.current_lat ?? DEFAULT_LAT);
    const lng = Number(profile.current_lng ?? DEFAULT_LNG);

    const sun = sunriseSunset(refInstant, lat, lng);
    const slices = divideDaylight(sun, refInstant.getUTCDay());
    const { good, caution } = goodAndCautionWindows(slices, tz);

    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    const moonSign = moonRashiAt(refInstant);
    const moonNak = moonNakshatraAt(refInstant);
    const rashiInfo = rashiDisplay(moonSign.key, locale);
    const natalMoon = birthMoonDetails(bi, tz, locale);
    const birthSun = birthSunDetails(bi, tz, locale);

    const { data: chart } = await supabase
      .from("chart_runs")
      .select("engine_mode")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const engineMode = (chart?.engine_mode as string) ?? "general_panchanga";

    let mdLordFact = "";
    let adLordFact = "";

    if (bi) {
      const { segments } = computeTimeline(bi, tz);
      if (segments.length) {
        const lords = vimshottariLordsAt(segments, refInstant);
        if (lords) {
          mdLordFact = lords.mdLord;
          adLordFact = lords.adLord;
        }
      }
    }

    const kernel = buildKernelForBirthInput(
      bi,
      profile,
      locale,
      refInstant,
      mdLordFact,
      adLordFact,
    );
    const planner = buildTodayPlan(mdLordFact, adLordFact, locale, kernel, "today");
    const factSignature = buildFactSignature([
      profile.id,
      bi?.id,
      dateStr,
      locale,
      KERNEL_VERSION,
      engineMode,
      rashiInfo.key,
      natalMoon?.sign.key,
      birthSun?.key,
      mdLordFact,
      adLordFact,
      planner.activeDomains.join(","),
      planner.pressureThemes.join(","),
      planner.personalSignals.join(","),
      planner.domainLenses.join(","),
    ]);
    let betterFor = planner.actionBias.slice(0, 2);
    let beCareful = planner.cautionBias.slice(0, 2);
    let oneLine = planner.oneLineSeed;
    let shareHook = planner.shareHook;
    let currentLifePeriod: { label: string; summary: string } | undefined;

    const pastFeedback = await getValidationFeedback(supabase, profile.id);
    const lifeChapter = lifeChapterInfo(kernel, locale);
    const pack = await loadBirthPack(supabase, profile, bi, locale, dateStr);
    const packCard = packTodayCard(pack, dateStr);
    let provenance = pack
      ? buildProvenance({
        promptVersion: BIRTH_PACK_VERSION,
        provider: pack.provider,
        model: pack.model,
        source: pack.provider === "deterministic" ? "fallback" : "llm",
        factSignature: pack.fact_signature,
      })
      : null;

    if (packCard) {
      betterFor = asArray<string>(packCard.better_for).map((s) => String(s).trim()).filter(Boolean)
        .slice(0, 4);
      beCareful = asArray<string>(packCard.be_careful).map((s) => String(s).trim()).filter(Boolean)
        .slice(0, 3);
      oneLine = safeString(packCard.one_line) || oneLine;
      shareHook = safeString(packCard.share_hook) || shareHook;
      if (safeString(packCard.title) && safeString(packCard.body)) {
        currentLifePeriod = {
          label: safeString(packCard.title),
          summary: safeString(packCard.body),
        };
      }
    } else {
      provenance = buildProvenance({
        promptVersion: CONTENT_PROMPT_VERSION,
        provider: "deterministic",
        model: "none",
        source: "fallback",
        factSignature,
      });
    }

    const result = {
      cacheVersion: NARRATIVE_CACHE_VERSION,
      locale,
      displayName: profile.display_name,
      date: dateStr,
      locationLabel: profile.current_city ?? "India reference",
      engineMode,
      birthInputId: bi?.id ?? null,
      moonSign: rashiInfo,
      moonNakshatra: moonNak.name,
      birthMoonSign: natalMoon?.sign ?? null,
      birthMoonNakshatra: natalMoon?.nakshatra ?? null,
      sunSign: birthSun ?? null,
      lifeChapter,
      oneLine,
      shareHook,
      betterFor,
      beCarefulWith: beCareful,
      goodWindows: decorateWindows(
        good.map((w) => ({ start: w.start, end: w.end, label: w.label })),
        asArray<PackTimingWindowCopy>(packCard?.good_window_notes),
        "good",
      ),
      cautionWindows: decorateWindows(
        caution.map((w) => ({ start: w.start, end: w.end, label: w.label })),
        asArray<PackTimingWindowCopy>(packCard?.caution_window_notes),
        "caution",
      ),
      currentLifePeriod,
      mahadashaLord: mdLordFact,
      antardashaLord: adLordFact,
      personalSignals: planner.personalSignals,
      domainLenses: planner.domainLenses,
      planner,
      provenance: provenance!,
      natalLuck: buildNatalLuck(natalMoon?.sign, locale),
    };

    return result;
  }

  if (action === "weekly_get" || action === "monthly_get") {
    const locale = requestLocale(body, profile);
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const dateStr = (body.date as string) ?? todayInTimezone(tz);
    const scope = action === "weekly_get" ? "weekly" : "monthly";

    const refInstant = parseDateAsUtcInstant(dateStr, tz);

    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    const moonSign = moonRashiAt(refInstant);
    const rashiInfo = rashiDisplay(moonSign.key, locale);
    const natalMoon = birthMoonDetails(bi, tz, locale);
    const birthSun = birthSunDetails(bi, tz, locale);

    let mdLord = "";
    let adLord = "";
    let rhythm_title = scope === "weekly"
      ? locale === "te" ? "ఈ వారం లయ" : locale === "hi" ? "इस हफ्ते की लय" : "Weekly Rhythm"
      : locale === "te"
      ? "ఈ నెల దృష్టి"
      : locale === "hi"
      ? "इस महीने का स्वर"
      : "Monthly Outlook";
    let rhythm_body = locale === "te"
      ? "ఈ కాలం స్థిరమైన పురోగతికి దారి తీసేలా కనిపిస్తోంది."
      : locale === "hi"
      ? "यह दौर स्थिर प्रगति की ओर जाता हुआ दिखता है।"
      : "The stars are aligning for a period of steady growth.";
    let betterFor = scope === "weekly"
      ? (locale === "te"
        ? ["పని ప్రణాళిక", "డబ్బు క్రమం", "కుటుంబ ఫాలో-థ్రూ"]
        : locale === "hi"
        ? ["काम की योजना", "पैसे में अनुशासन", "परिवार में निरंतरता"]
        : ["Work planning", "Money discipline", "Family follow-through"])
      : (locale === "te"
        ? ["దీర్ఘ ప్రణాళిక", "డబ్బులో సమతుల్యం", "సంబంధ స్థిరత్వం"]
        : locale === "hi"
        ? ["लंबी योजना", "पैसे का संतुलन", "रिश्तों में स्थिरता"]
        : ["Long-term planning", "Money balance", "Relationship steadiness"]);
    let beCarefulWith = scope === "weekly"
      ? (locale === "te"
        ? ["ఆవేశ స్పందనలు", "అధిక వాగ్దానాలు"]
        : locale === "hi"
        ? ["आवेग वाली प्रतिक्रिया", "ज्यादा वादे"]
        : ["Impulsive reactions", "Overpromising"])
      : (locale === "te"
        ? ["శక్తి తినే బాధ్యతలు", "అహంకార ఢీకొన్లు"]
        : locale === "hi"
        ? ["ऊर्जा खींचने वाली जिम्मेदारियां", "अहम टकराव"]
        : ["Draining commitments", "Ego clashes"]);

    if (bi) {
      const { segments } = computeTimeline(bi, tz);
      if (segments.length) {
        const lords = vimshottariLordsAt(segments, refInstant);
        if (lords) {
          mdLord = lords.mdLord;
          adLord = lords.adLord;
        }
      }
    }

    const kernel = buildKernelForBirthInput(
      bi,
      profile,
      locale,
      refInstant,
      mdLord,
      adLord,
    );
    const planner = buildRangePlan(scope, mdLord, adLord, locale, kernel);
    betterFor = planner.activeDomains.slice(0, 3);
    beCarefulWith = planner.pressureThemes.slice(0, 2);
    let shareHook = planner.shareHook;
    const factSignature = buildFactSignature([
      profile.id,
      bi?.id,
      dateStr,
      locale,
      KERNEL_VERSION,
      scope,
      rashiInfo.key,
      natalMoon?.sign.key,
      birthSun?.key,
      mdLord,
      adLord,
      betterFor.join(","),
      beCarefulWith.join(","),
      planner.personalSignals.join(","),
      planner.domainLenses.join(","),
    ]);
    const cached = await getCachedNarrative(
      supabase,
      profile.id,
      dateStr,
      scope,
      locale,
    );
    if (
      narrativeCacheOk(
        cached,
        bi?.id ?? null,
        factSignature,
        CONTENT_PROMPT_VERSION,
      )
    ) {
      return cached;
    }

    const pastFeedback = await getValidationFeedback(supabase, profile.id);
    const lifeChapter = lifeChapterInfo(kernel, locale);
    const pack = await ensureBirthPack(adminSupabase, profile, bi, locale, dateStr);
    const packCard = packRangeCard(pack, scope, dateStr, tz);
    let provenance = pack
      ? buildProvenance({
        promptVersion: BIRTH_PACK_VERSION,
        provider: pack.provider,
        model: pack.model,
        source: pack.provider === "deterministic" ? "fallback" : "llm",
        factSignature: pack.fact_signature,
      })
      : null;

    if (packCard) {
      rhythm_title = safeString(packCard.title) || rhythm_title;
      rhythm_body = safeString(packCard.body) || rhythm_body;
      shareHook = safeString(packCard.share_hook) || shareHook;
      const packBetter = asArray<string>(packCard.better_for).map((s) => String(s).trim())
        .filter(Boolean);
      const packCareful = asArray<string>(packCard.be_careful).map((s) => String(s).trim())
        .filter(Boolean);
      if (packBetter.length > 0) betterFor = packBetter;
      if (packCareful.length > 0) beCarefulWith = packCareful;
    } else {
      const narrative = await generateNarrativeCopy(locale, scope, {
        date: dateStr,
        age: bi ? calculateAge(bi.date_of_birth) : undefined,
        moon_rashi: rashiInfo.label,
        birth_moon_sign: natalMoon?.sign.label,
        mahadasha_lord: mdLord || undefined,
        antardasha_lord: adLord || undefined,
        explanation_mode: profile.explanation_mode,
        planner,
        personalization_kernel: kernel,
        life_chapter: lifeChapter,
        screen_intent: planner.screenIntent,
        domain_lenses: planner.domainLenses,
        past_feedback: pastFeedback.length ? pastFeedback : undefined,
      }, { supabase, profileId: profile.id });

      if (narrative) {
        rhythm_title = narrative.title;
        rhythm_body = narrative.body;
        if (narrative.shareHook?.trim()) shareHook = narrative.shareHook.trim();
        if (narrative.betterFor.length > 0) betterFor = narrative.betterFor;
        if (narrative.beCareful.length > 0) beCarefulWith = narrative.beCareful;
      }

      provenance = narrative
        ? buildProvenance({
          promptVersion: narrative.promptVersion,
          provider: narrative.provider,
          model: narrative.model,
          source: "llm",
          factSignature,
        })
        : buildProvenance({
          promptVersion: CONTENT_PROMPT_VERSION,
          provider: "deterministic",
          model: "none",
          source: "fallback",
          factSignature,
        });
    }

    const result = {
      cacheVersion: NARRATIVE_CACHE_VERSION,
      locale,
      birthInputId: bi?.id ?? null,
      date: dateStr,
      locationLabel: profile.current_city || "Current Location",
      displayName: profile.display_name,
      moonSign: rashiInfo,
      birthMoonSign: natalMoon?.sign ?? null,
      birthMoonNakshatra: natalMoon?.nakshatra ?? null,
      sunSign: birthSun ?? null,
      lifeChapter,
      shareHook,
      currentLifePeriod: {
        label: rhythm_title,
        summary: rhythm_body,
      },
      betterFor,
      beCarefulWith,
      goodWindows: [],
      cautionWindows: [],
      mahadashaLord: mdLord,
      antardashaLord: adLord,
      personalSignals: planner.personalSignals,
      domainLenses: planner.domainLenses,
      planner,
      provenance: provenance!,
    };

    await saveNarrativeCache(supabase, profile.id, dateStr, locale, scope, result);

    return result;
  }

  if (action === "ask") {
    const locale = requestLocale(body, profile);
    const question = String(body.question ?? "").trim();
    if (question.length < 3) {
      throw new ActionError("missing_question", "question required", 400);
    }
    if (question.length > 900) {
      throw new ActionError("question_too_long", "question is too long", 400);
    }

    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const targetDate = todayInTimezone(tz);
    const access = await getSubscriptionAccess(supabase, profile.id);
    const askQuota = await consumeAskQuota(
      supabase,
      profile.id,
      targetDate,
      access.isPlus,
    );

    const requestedSessionId = body.session_id == null ? "" : String(body.session_id);
    let sessionId = requestedSessionId;
    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) {
        throw new ActionError("chat_session_not_found", "Chat session not found", 404);
      }
    } else {
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          profile_id: profile.id,
          title: question.slice(0, 80),
          language_code: locale,
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;
      sessionId = session.id as string;
    }

    const day = zonedNoonJsDate(targetDate, tz);
    const lat = profile.current_lat != null ? Number(profile.current_lat) : DEFAULT_LAT;
    const lng = profile.current_lng != null ? Number(profile.current_lng) : DEFAULT_LNG;
    const sun = sunriseSunset(day, lat, lng);
    const slices = divideDaylight(sun, jsWeekday(targetDate, tz));
    const { good, caution } = goodAndCautionWindows(slices, tz);
    const goodWindows = good.slice(0, 2).map((w) => ({
      start: w.start,
      end: w.end,
      label: "Good window",
    }));
    const cautionWindows = caution.slice(0, 2).map((w) => ({
      start: w.start,
      end: w.end,
      label: w.label,
    }));

    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    let currentLord = "";
    let currentSubLord = "";
    if (bi) {
      const { segments, nk } = computeTimeline(bi, profile.current_timezone ?? "Asia/Kolkata");
      if (nk != null && segments.length) {
        const current = vimshottariLordsAt(segments, new Date());
        currentLord = current?.mdLord ?? "";
        currentSubLord = current?.adLord ?? "";
      }
    }
    // Ask uses pack templates + live timing windows — no per-question LLM call.
    const pack = await loadBirthPack(supabase, profile, bi, locale, targetDate);

    const { error: userMessageError } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      profile_id: profile.id,
      role: "user",
      content: question,
      payload: { locale },
    });
    if (userMessageError) throw userMessageError;

    const copy = resolveAskFromPack(
      pack?.content,
      question,
      locale,
      goodWindows,
      cautionWindows,
    );
    const hadPackAnswer = Boolean(
      pack?.content &&
        (normalizeAskTemplates(pack.content, locale).length > 0 ||
          safeString(pack.content.ask_knowledge?.compact_summary) ||
          safeString((pack.content.ask_knowledge as Record<string, unknown> | undefined)?.body)),
    );
    const provenance = hadPackAnswer && pack
      ? buildProvenance({
        promptVersion: BIRTH_PACK_VERSION,
        provider: pack.provider,
        model: pack.model,
        source: "deterministic",
        factSignature: pack.fact_signature,
      })
      : buildProvenance({
        promptVersion: ASK_PROMPT_VERSION,
        provider: "cached_pack",
        model: "none",
        source: "deterministic",
        factSignature: buildFactSignature([
          profile.id,
          bi?.id,
          sessionId,
          locale,
          question,
          currentLord,
          currentSubLord,
          JSON.stringify(goodWindows),
          JSON.stringify(cautionWindows),
        ]),
      });

    const assistantPayload = {
      answer: copy,
      provenance,
      context: {
        goodWindows,
        cautionWindows,
        currentLord,
        currentSubLord,
        engineMode: bi ? resolveEngineMode(bi) : "general_panchanga",
      },
    };
    const { data: savedAnswer, error: answerError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        profile_id: profile.id,
        role: "assistant",
        content: copy.direct_answer,
        payload: assistantPayload,
      })
      .select("id")
      .single();
    if (answerError) throw answerError;

    await supabase.from("chat_sessions").update({
      updated_at: new Date().toISOString(),
      language_code: locale,
    }).eq("id", sessionId).eq("profile_id", profile.id);

    return {
      sessionId,
      answerId: savedAnswer.id,
      directAnswer: copy.direct_answer,
      bestTime: copy.best_time,
      cautionTime: copy.caution_time,
      betterOption: copy.better_option,
      simpleWhy: copy.simple_why,
      actionLine: copy.action_line,
      shareHook: copy.share_hook,
      goodWindows,
      cautionWindows,
      provenance,
      locale,
      askAccess: {
        planCode: askQuota.planCode,
        freeRemainingToday: askQuota.remaining,
        isPlus: access.isPlus,
        isPro: access.isPro,
      },
      access: buildAccessPayload(access),
    };
  }

  if (action === "purpose_check") {
    const locale = requestLocale(body, profile);
    const access = await getSubscriptionAccess(supabase, profile.id);
    const purposeType = body.purpose_type as string;
    if (!purposeType) {
      throw new ActionError(
        "missing_purpose_type",
        "purpose_type required",
        400,
      );
    }
    const rules = purposeRules[purposeType] ??
      { favor: ["Jupiter", "Mercury"], caution: ["Rahu"] };
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const targetDate = (body.target_date as string) ?? todayInTimezone(tz);
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    let score = 48 + (PURPOSE_SCORE_BIAS[purposeType] ?? 0);
    let lord = "";
    let adLordCtx = "";
    if (bi) {
      const { segments, nk } = computeTimeline(
        bi,
        profile.current_timezone ?? "Asia/Kolkata",
      );
      if (nk != null && segments.length) {
        const at = zonedNoonJsDate(targetDate, tz);
        const vl = vimshottariLordsAt(segments, at);
        if (vl) {
          lord = vl.mdLord;
          adLordCtx = vl.adLord;
          if (rules.favor.includes(vl.mdLord)) score += 26;
          if (rules.favor.includes(vl.adLord)) score += 20;
          if (rules.caution.includes(vl.mdLord)) score -= 20;
          if (rules.caution.includes(vl.adLord)) score -= 16;
        }
      }
    }
    if (score > 100) score = 100;
    if (score < 0) score = 0;
    const status = score >= 75 ? "matched" : score >= 45 ? "partly_matched" : "not_matched";
    const day = zonedNoonJsDate(targetDate, tz);
    const kernel = buildKernelForBirthInput(
      bi,
      profile,
      locale,
      day,
      lord,
      adLordCtx,
    );
    const purposePlan = buildPurposePlan(
      purposeType,
      status,
      score,
      lord,
      adLordCtx,
      locale,
      kernel,
    );

    const lat = profile.current_lat != null ? Number(profile.current_lat) : DEFAULT_LAT;
    const lng = profile.current_lng != null ? Number(profile.current_lng) : DEFAULT_LNG;
    const sun = sunriseSunset(day, lat, lng);
    const slices = divideDaylight(sun, jsWeekday(targetDate, tz));
    const { good, caution } = goodAndCautionWindows(slices, tz);

    const best_windows = good.slice(0, 2).map((w) => ({
      start: w.start,
      end: w.end,
      label: "Best window",
    }));
    const caution_windows = caution.slice(0, 2).map((w) => ({
      start: w.start,
      end: w.end,
      label: w.label,
    }));

    let better_options = status === "not_matched"
      ? [{
        label: locale === "te" ? "రేపు ఉదయం" : locale === "hi" ? "कल सुबह" : "Tomorrow morning",
        detail: purposePlan.betterOptionSeed ??
          (locale === "te"
            ? "సూర్యోదయానికి తరువాత మళ్లీ ప్రయత్నించండి. మొదటి రాహు భాగాన్ని తప్పించి అడుగును చిన్నగా ఉంచండి."
            : locale === "hi"
            ? "सूर्योदय के बाद फिर से कोशिश करें। पहले राहु हिस्से से बचें और कदम छोटा रखें।"
            : "Retry after sunrise, avoiding the first Rahu segment. Keep the step small and clear."),
      }]
      : [];

    let headline = purposePlan.headline;
    let summary = status === "matched"
      ? "The current life-period rhythm leans supportive for this purpose—still use common sense."
      : status === "partly_matched"
      ? "Mixed support: workable if you keep logistics clean and tone gentle."
      : "Not the strongest match for this purpose today—shift timing rather than forcing the moment.";

    let action_line = status === "not_matched"
      ? "Pick the next clear morning window or shorten the ask."
      : "Proceed with a written note of what success means.";
    let timing_note = purposePlan.supportSummary;
    let shareHook = purposePlan.shareHook;

    const pcopy = await generatePurposeCopy(locale, {
      purpose_type: purposeType,
      status,
      score,
      md_lord: lord,
      ad_lord: adLordCtx,
      target_date: targetDate,
      age: bi ? calculateAge(bi.date_of_birth) : undefined,
      planner: purposePlan,
      purpose_lens: kernel?.purposeLenses[purposeType],
      personalization_kernel: kernel,
      domain_lenses: purposePlan.domainLenses,
      best_windows,
      caution_windows,
      suggest_alternatives: status === "not_matched",
    }, { supabase, profileId: profile.id });
    if (pcopy?.data.headline?.trim()) headline = pcopy.data.headline.trim();
    if (pcopy?.data.summary) summary = pcopy.data.summary;
    if (pcopy?.data.action_line) action_line = pcopy.data.action_line;
    if (pcopy?.data.timing_note) timing_note = pcopy.data.timing_note;
    if (pcopy?.data.share_hook?.trim()) shareHook = pcopy.data.share_hook.trim();
    if (Array.isArray(pcopy?.data.better_options) && pcopy.data.better_options.length > 0) {
      better_options = pcopy.data.better_options.map((b: { label: string; detail: string }) => ({
        label: String(b.label),
        detail: String(b.detail),
      }));
    }

    const ctx = {
      score,
      purposeType,
      lord,
      ad_lord: adLordCtx,
      rules,
      planner: purposePlan,
      provenance: pcopy
        ? buildProvenance({
          promptVersion: pcopy.promptVersion,
          provider: pcopy.provider,
          model: pcopy.model,
          source: "llm",
          factSignature: buildFactSignature([
            profile.id,
            bi?.id,
            purposeType,
            targetDate,
            locale,
            KERNEL_VERSION,
            status,
            score.toString(),
            lord,
            adLordCtx,
            purposePlan.domainLenses.join(","),
            purposePlan.personalSignals.join(","),
          ]),
        })
        : buildProvenance({
          promptVersion: CONTENT_PROMPT_VERSION,
          provider: "deterministic",
          model: "none",
          source: "fallback",
          factSignature: buildFactSignature([
            profile.id,
            bi?.id,
            purposeType,
            targetDate,
            locale,
            KERNEL_VERSION,
            status,
            score.toString(),
            lord,
            adLordCtx,
            purposePlan.domainLenses.join(","),
            purposePlan.personalSignals.join(","),
          ]),
        }),
    };

    const { data: saved, error } = await supabase
      .from("purpose_checks")
      .insert({
        profile_id: profile.id,
        purpose_type: purposeType,
        target_date: targetDate,
        location_city: profile.current_city,
        timezone: tz,
        status,
        summary: `${headline}\n${summary}`,
        action_line,
        best_windows,
        caution_windows,
        better_options,
        deterministic_context: ctx,
      })
      .select("id")
      .single();
    if (error) throw error;

    let responseBetterOptions = better_options;
    if (!access.isPlus && responseBetterOptions.length > 0) {
      responseBetterOptions = [{
        label: locale === "te"
          ? "Pro తో మంచి రోజులు"
          : locale === "hi"
          ? "Pro से बेहतर दिन"
          : "Better days with Pro",
        detail: lockedTeaser(locale),
      }];
    }

    return {
      id: saved.id,
      status,
      headline,
      summary,
      action_line,
      timing_note,
      shareHook,
      best_windows,
      caution_windows,
      better_options: responseBetterOptions,
      domainLenses: purposePlan.domainLenses,
      personalSignals: purposePlan.personalSignals,
      provenance: ctx.provenance,
      locale,
      access: buildAccessPayload(access),
    };
  }

  if (action === "share_card_generate") {
    const profile = requireProfile(prof, action);
    const locale = requestLocale(body, profile);
    const sourceType = String(body.source_type ?? "").trim();
    if (!sourceType) {
      throw new ActionError(
        "missing_source_type",
        "source_type required",
        400,
      );
    }
    const payloadRaw = body.payload;
    if (
      payloadRaw == null || typeof payloadRaw !== "object" ||
      Array.isArray(payloadRaw)
    ) {
      throw new ActionError(
        "invalid_share_payload",
        "payload must be an object",
        400,
      );
    }
    const sourceId = body.source_id == null ? null : String(body.source_id);
    const shareId = crypto.randomUUID();
    const payload = payloadRaw as Record<string, unknown>;
    const built = buildShareCard(shareId, locale, sourceType, payload);
    const { error } = await supabase.from("share_cards").insert({
      id: shareId,
      profile_id: profile.id,
      source_type: sourceType,
      source_id: sourceId,
      share_title: built.shareTitle,
      share_body: built.shareBody,
      share_context: built.shareContext,
      share_text: built.shareText,
      deep_link: built.deepLink,
      brand_variant: built.brandVariant,
      language_code: locale,
      raw_payload: payload,
    });
    if (error) throw error;
    return {
      id: shareId,
      sourceType,
      sourceId,
      shareTitle: built.shareTitle,
      shareBody: built.shareBody,
      shareContext: built.shareContext,
      shareText: built.shareText,
      deepLink: built.deepLink,
      brandVariant: built.brandVariant,
      locale,
    };
  }

  if (action === "journey_get") {
    const locale = requestLocale(body, profile);
    const cacheDate = todayInTimezone(profile.current_timezone ?? "Asia/Kolkata");
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    if (!bi) return { phases: [] };
    const { segments, nk } = computeTimeline(
      bi,
      profile.current_timezone ?? "Asia/Kolkata",
    );
    if (nk === null || !segments.length) return { phases: [] };
    const now = new Date();
    const ads = allAntardashasFromMahadashas(segments);
    const clipped = recentAntardashasClipped(ads, now, JOURNEY_LOOKBACK_YEARS);
    if (!clipped.length) return { phases: [] };
    const currentLords = vimshottariLordsAt(segments, now);
    const kernel = buildKernelForBirthInput(
      bi,
      profile,
      locale,
      now,
      currentLords?.mdLord,
      currentLords?.adLord,
    );
    const plans = clipped.map((seg, idx) => {
      const fallback = antardashaFallbackCopy(
        seg.mdLord,
        seg.adLord,
        seg.start,
        seg.end,
        idx,
        locale,
      );
      return buildPhasePlan(seg, idx, locale, {
        now,
        previous: idx > 0 ? clipped[idx - 1] ?? null : null,
        confidenceLabel: resolveEngineMode(bi) === "full_chart" ? "high" : "medium",
        periodLabel: plainPeriodLabel(seg.start, seg.end),
        fallbackTitle: fallback.title,
        fallbackSentences: fallback.sentences,
        kernel,
      });
    });
    const factSignature = buildFactSignature([
      profile.id,
      bi.id,
      locale,
      KERNEL_VERSION,
      plans.map((p) => `${p.mahadashaLord}-${p.antardashaLord}-${p.phasePulse}`).join(";"),
      plans.map((p) => p.kernelSignals?.join(",") ?? "").join(";"),
      kernel?.period.line,
    ]);
    const cached = await getCachedNarrative(
      supabase,
      profile.id,
      cacheDate,
      "journey",
      locale,
    );
    if (
      narrativeCacheOk(
        cached,
        bi.id,
        factSignature,
        "journey:" + PLANNER_VERSION,
      )
    ) {
      return cached;
    }

    const pack = await ensureBirthPack(adminSupabase, profile, bi, locale, cacheDate);
    const packPhases = asArray<PackJourneyPhase>(pack?.content.journey_phases);
    if (pack && packPhases.length) {
      const phases = packPhases.map((phase, idx) => ({
        sortOrder: Number.isFinite(Number(phase.sortOrder)) ? Number(phase.sortOrder) : idx,
        periodLabel: safeString(phase.periodLabel) || plans[idx]?.periodLabel || "",
        mahadashaLord: safeString(phase.mahadashaLord) || plans[idx]?.mahadashaLord || "",
        antardashaLord: safeString(phase.antardashaLord) || plans[idx]?.antardashaLord || "",
        focusAreas: asArray<string>(phase.focusAreas).map((s) => String(s).trim()).filter(Boolean),
        tone: asArray<string>(phase.tone).map((s) => String(s).trim()).filter(Boolean),
        pressureThemes: asArray<string>(phase.pressureThemes).map((s) => String(s).trim()).filter(
          Boolean,
        ),
        phasePulse: safeString(phase.phasePulse) || plans[idx]?.phasePulse || "",
        domainLenses: asArray<string>(phase.domainLenses).map((s) => String(s).trim()).filter(
          Boolean,
        ),
        kernelSignals: asArray<string>(phase.kernelSignals).map((s) => String(s).trim()).filter(
          Boolean,
        ),
        shareHook: safeString(phase.shareHook) || plans[idx]?.shareHook,
        transitionNote: safeString(phase.transitionNote) || plans[idx]?.transitionNote || "",
        evidenceLine: safeString(phase.evidenceLine) || plans[idx]?.evidenceLine || "",
        title: safeString(phase.title) || plans[idx]?.fallbackTitle || "",
        highlight: safeString(phase.highlight) || plans[idx]?.evidenceLine || "",
        sentences: asArray<string>(phase.sentences).map((line) => String(line).trim()).filter(
          Boolean,
        ).slice(0, 3),
        proLocked: false,
        subPhases: asArray<PackJourneyPhase>(phase.subPhases),
      }));
      const result = {
        cacheVersion: NARRATIVE_CACHE_VERSION,
        birthInputId: bi.id,
        engineVersion: ENGINE_V,
        phases,
        locale,
        plannerVersion: PLANNER_VERSION,
        copySource: pack.provider === "deterministic" ? "fallback" : "llm",
        provenance: buildProvenance({
          promptVersion: BIRTH_PACK_VERSION,
          provider: pack.provider,
          model: pack.model,
          source: pack.provider === "deterministic" ? "fallback" : "llm",
          factSignature: pack.fact_signature,
        }),
      };
      await saveNarrativeCache(supabase, profile.id, cacheDate, locale, "journey", result);
      return result;
    }

    const age = bi ? calculateAge(bi.date_of_birth) : undefined;
    const llmEnvelope = await generateJourneyLlmCards(plans, locale, age, {
      supabase,
      profileId: profile.id,
    });
    const phases = plans.map((plan) => {
      const fromLlm = llmEnvelope?.cards.get(plan.id);
      const llmSentences = fromLlm?.sentences
        .map((line) => String(line).trim())
        .filter(Boolean) ?? [];
      const sentences = [
        ...llmSentences,
        ...plan.fallbackSentences.map((line) => String(line).trim()).filter(Boolean),
      ].slice(0, 2);
      return {
        sortOrder: plan.id,
        periodLabel: plan.periodLabel,
        mahadashaLord: plan.mahadashaLord,
        antardashaLord: plan.antardashaLord,
        focusAreas: plan.activeDomains,
        tone: plan.supportThemes,
        pressureThemes: plan.pressureThemes,
        phasePulse: plan.phasePulse,
        domainLenses: plan.domainLenses,
        kernelSignals: plan.kernelSignals,
        shareHook: fromLlm?.share_hook ?? plan.shareHook,
        transitionNote: plan.transitionNote,
        evidenceLine: plan.evidenceLine,
        title: fromLlm?.title?.trim() || plan.fallbackTitle,
        highlight: fromLlm?.highlight?.trim() || plan.evidenceLine,
        sentences,
      };
    });
    const provenance = llmEnvelope
      ? buildProvenance({
        promptVersion: `journey:${llmEnvelope.promptVersion}`,
        provider: llmEnvelope.provider,
        model: llmEnvelope.model,
        source: "llm",
        factSignature,
      })
      : buildProvenance({
        promptVersion: "journey:" + PLANNER_VERSION,
        provider: "deterministic",
        model: "none",
        source: "fallback",
        factSignature,
      });
    const result = {
      cacheVersion: NARRATIVE_CACHE_VERSION,
      birthInputId: bi.id,
      engineVersion: ENGINE_V,
      phases,
      locale,
      plannerVersion: PLANNER_VERSION,
      copySource: llmEnvelope ? "llm" : "fallback",
      provenance,
    };
    await saveNarrativeCache(supabase, profile.id, cacheDate, locale, "journey", result);
    return result;
  }

  if (action === "remedy_today") {
    const locale = requestLocale(body, profile);
    const tz = profile.current_timezone ?? "Asia/Kolkata";
    const dateStr = todayInTimezone(tz);
    const rawBi = await getLatestBirthInput(supabase, profile.id);
    const bi = await ensureBirthPlacePrecision(supabase, rawBi);
    const { data: catalog } = await supabase
      .from("remedy_catalog")
      .select("id, remedy_key, remedy_type, title, simple_line, applicable_planets")
      .eq("is_active", true);
    let lord = "";
    if (bi) {
      const { segments, nk } = computeTimeline(
        bi,
        profile.current_timezone ?? "Asia/Kolkata",
      );
      if (nk != null && segments.length) {
        const cur = segmentAt(segments, new Date());
        if (cur) lord = cur.lord;
      }
    }
    const rows = (catalog ?? []).filter((r: Record<string, unknown>) => {
      const p = r.applicable_planets as string[] | null;
      if (!p || p.length === 0) return true;
      return lord && p.includes(lord);
    }).slice(0, 5);

    const base = rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      remedy_key: r.remedy_key as string,
      title: r.title as string,
      simple_line: r.simple_line as string,
      remedyType: r.remedy_type as string,
    }));
    const factSignature = buildFactSignature([
      profile.id,
      bi?.id,
      dateStr,
      locale,
      KERNEL_VERSION,
      lord,
      base.map((b: { id: string }) => b.id).join(","),
      base.map((b: { remedy_key: string }) => b.remedy_key).join(","),
    ]);
    const cached = await getCachedNarrative(
      supabase,
      profile.id,
      dateStr,
      "remedy",
      locale,
    );
    if (
      narrativeCacheOk(
        cached,
        bi?.id ?? null,
        factSignature,
        CONTENT_PROMPT_VERSION,
      )
    ) {
      return cached;
    }

    let remedies = base.map((b: {
      id: string;
      remedy_key: string;
      title: string;
      simple_line: string;
      remedyType: string;
    }) => {
      const categoryKey = remedyCategoryKey(b.remedy_key, b.remedyType);
      return {
        id: b.id,
        title: b.title,
        simpleLine: b.simple_line,
        remedyType: remedyTypeLabel(b.remedyType, locale),
        remedyCategoryKey: categoryKey,
        remedyCategoryLabel: remedyCategoryLabel(categoryKey, locale),
        whyNow: remedyWhyNow(b.remedyType, lord, locale),
        keepItSimple: remedyKeepSimple(b.remedyType, locale),
      };
    });
    const pack = await loadBirthPack(supabase, profile, bi, locale, dateStr);
    const packRemedies = asArray<Record<string, unknown>>(pack?.content.remedy_cards);
    let remedyProvenance = pack
      ? buildProvenance({
        promptVersion: BIRTH_PACK_VERSION,
        provider: pack.provider,
        model: pack.model,
        source: pack.provider === "deterministic" ? "fallback" : "llm",
        factSignature: pack.fact_signature,
      })
      : null;

    if (packRemedies.length) {
      remedies = base.map((b: {
        id: string;
        remedy_key: string;
        title: string;
        simple_line: string;
        remedyType: string;
      }, i: number) => {
        const rc = packRemedies.find((item) => safeString(item.id) === b.id) ??
          packRemedies[i] ?? {};
        const categoryKey = remedyCategoryKey(b.remedy_key, b.remedyType);
        return {
          id: safeString(rc.id) || b.id,
          title: safeString(rc.title) || b.title,
          simpleLine: safeString(rc.simple_line) || b.simple_line,
          remedyType: remedyTypeLabel(b.remedyType, locale),
          remedyCategoryKey: categoryKey,
          remedyCategoryLabel: remedyCategoryLabel(categoryKey, locale),
          whyNow: safeString(rc.why_now) || remedyWhyNow(b.remedyType, lord, locale),
          keepItSimple: safeString(rc.keep_it_simple) || remedyKeepSimple(b.remedyType, locale),
          shareHook: safeString(rc.share_hook),
        };
      });
    } else {
      remedyProvenance = buildProvenance({
        promptVersion: CONTENT_PROMPT_VERSION,
        provider: "deterministic",
        model: "none",
        source: "fallback",
        factSignature: buildFactSignature([
          profile.id,
          bi?.id,
          dateStr,
          locale,
          KERNEL_VERSION,
          lord,
          base.map((b: { id: string }) => b.id).join(","),
          base.map((b: { remedy_key: string }) => b.remedy_key).join(","),
        ]),
      });
    }

    const result = {
      cacheVersion: NARRATIVE_CACHE_VERSION,
      birthInputId: bi?.id ?? null,
      date: dateStr,
      locale,
      remedies,
      provenance: remedyProvenance!,
    };

    await saveNarrativeCache(supabase, profile.id, dateStr, locale, "remedy", result);

    return result;
  }

  throw new ActionError("unknown_action", `Unknown action: ${action}`, 400);
}

export async function getCachedNarrative(
  _supabase: SupabaseClient,
  _profileId: string,
  _dateStr: string,
  _type: string,
  _locale: string,
) {
  return null;
}

export async function getValidationFeedback(
  _supabase: SupabaseClient,
  _profileId: string,
): Promise<string[]> {
  return [];
}
