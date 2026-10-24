import { DateTime } from "luxon";
import type { AdSegment } from "./vimshottari.ts";
import type { AppLocale } from "./vedic_labels.ts";
import { lordFlavor } from "./copy.ts";
import type { DomainLens, ForecastScope, PersonalizationKernel } from "./personalization_kernel.ts";

export const PLANNER_VERSION = "v3-personalization";

export type GenerationProvenance = {
  engineVersion: string;
  plannerVersion: string;
  promptVersion: string;
  provider: string;
  model: string;
  source: "llm" | "fallback" | "deterministic";
  factSignature: string;
};

export type PhasePlan = {
  id: number;
  periodLabel: string;
  mahadashaLord: string;
  antardashaLord: string;
  tense: "past" | "current" | "future";
  activeDomains: string[];
  supportThemes: string[];
  pressureThemes: string[];
  dailyTexture: string[];
  phasePulse: string;
  kernelSignals?: string[];
  lifeStage?: string;
  domainLenses?: string[];
  shareHook?: string;
  transitionNote: string;
  evidenceLine: string;
  confidenceLabel: "high" | "medium";
  fallbackTitle: string;
  fallbackSentences: string[];
};

export type TodayPlanner = {
  activeDomains: string[];
  supportThemes: string[];
  pressureThemes: string[];
  actionBias: string[];
  cautionBias: string[];
  dailyTexture: string[];
  oneLineSeed: string;
  evidenceLine: string;
  screenIntent: "today" | "weekly" | "monthly";
  domainLenses: string[];
  personalSignals: string[];
  shareHook: string;
};

export type PurposePlanner = {
  headline: string;
  supportSummary: string;
  cautionSummary: string;
  actionBias: string[];
  cautionBias: string[];
  domainLenses: string[];
  personalSignals: string[];
  shareHook: string;
  betterOptionSeed?: string;
};

const GRAHA_LOCAL: Record<"te" | "hi", Record<string, string>> = {
  te: {
    Sun: "సూర్యుడు", Moon: "చంద్రుడు", Mars: "కుజుడు", Mercury: "బుధుడు", Jupiter: "గురువు",
    Venus: "శుక్రుడు", Saturn: "శని", Rahu: "రాహువు", Ketu: "కేతువు",
  },
  hi: {
    Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु",
    Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु",
  },
};

/** Graha name in the reader's language (engine keys are English). */
export function grahaLocal(name: string, loc: AppLocale): string {
  return loc === "en" ? name : GRAHA_LOCAL[loc][name] ?? name;
}

/** Swap English graha names inside an engine sentence for te/hi (also fixes older stored facts). */
export function localizeGrahaNames(text: string, loc: AppLocale): string {
  if (loc === "en" || !text) return text;
  return text.replace(/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/g, (m) => GRAHA_LOCAL[loc][m] ?? m);
}

// Engine phrase banks (archetypes, life-area signals/cautions) are English. In te/hi the
// screens must never show them raw, so keep only items written in the reader's script.
const NATIVE_SCRIPT = /[\u0900-\u097F\u0C00-\u0C7F]/;

function nativeOnly(loc: AppLocale, values: (string | null | undefined | false)[]): string[] {
  const list = compact(values);
  return loc === "en" ? list : list.filter((s) => NATIVE_SCRIPT.test(s));
}

function compact<T>(values: (T | null | undefined | false)[]): T[] {
  return values.filter(Boolean) as T[];
}

function pulseLabel(ratio: number, loc: AppLocale): string {
  if (loc === "te") {
    if (ratio < 0.18) return "స్టార్టింగ్ దశ";
    if (ratio < 0.5) return "బిల్డింగ్ దశ";
    if (ratio < 0.82) return "పీక్ దశ";
    return "వదిలేసే దశ";
  }
  if (loc === "hi") {
    if (ratio < 0.18) return "प्रवेश चरण";
    if (ratio < 0.5) return "निर्माण चरण";
    if (ratio < 0.82) return "चरम चरण";
    return "समापन चरण";
  }
  if (ratio < 0.18) return "Starting out";
  if (ratio < 0.5) return "Building up";
  if (ratio < 0.82) return "Peak";
  return "Wrapping up";
}

function phaseTransition(
  prev: AdSegment | null,
  seg: AdSegment,
  loc: AppLocale,
): string {
  if (!prev) {
    return loc === "te"
      ? "ఇది క్లియర్‌గా కనిపించే మొదటి చిన్న దశల్లో ఒకటి."
      : loc === "hi"
      ? "यह शुरुआती साफ दिखने वाले उप-चरणों में से एक है।"
      : "One of the first clearly visible mini-phases in this chapter.";
  }
  if (prev.adLord === seg.adLord) {
    return loc === "te"
      ? "ముందు ఉన్న ఫీలే ఇక్కడ ఇంకా క్లియర్‌గా బయటపడుతుంది."
      : loc === "hi"
      ? "पिछले चरण का वही स्वर यहां और साफ होकर दिखा।"
      : "Same mood as before, just louder here.";
  }
  return loc === "te"
    ? `${grahaLocal(prev.adLord, "te")} మూడ్ నుంచి ${grahaLocal(seg.adLord, "te")} వైపు టర్న్ తీసుకునే దశ.`
    : loc === "hi"
    ? `यह ${grahaLocal(prev.adLord, "hi")} के स्वर से ${grahaLocal(seg.adLord, "hi")} की तरफ मुड़ने वाला चरण था।`
    : `This is where the story turned from ${prev.adLord} mode to ${seg.adLord} mode.`;
}

function evidenceLine(
  adAreas: string[],
  mdAreas: string[],
  loc: AppLocale,
): string {
  const a0 = adAreas[0] ?? adAreas[1] ?? "";
  const a1 = adAreas[1] ?? mdAreas[0] ?? "";
  const m0 = mdAreas[0] ?? "";
  if (loc === "te") {
    return `${a0}, ${a1}, ${m0} లాంటి విషయాల్లో ఇది ముందు కనిపిస్తుంది.`;
  }
  if (loc === "hi") {
    return `${a0}, ${a1}, और ${m0} जैसे क्षेत्रों में यह सबसे पहले महसूस होता है।`;
  }
  return `You usually notice it first in ${a0}, ${a1} and ${m0}.`;
}

function blendActionBias(adAreas: string[], mdAreas: string[]): string[] {
  return compact([
    adAreas[0],
    adAreas[1],
    mdAreas[0],
  ]).slice(0, 3);
}

function blendCautionBias(adMood: string[], mdMood: string[]): string[] {
  return compact([
    adMood[1] ?? adMood[0],
    mdMood[1] ?? mdMood[0],
  ]).slice(0, 2);
}

function kernelDomainLabels(
  kernel: PersonalizationKernel | undefined,
  scope: ForecastScope,
): string[] {
  const lenses = kernel?.screenLenses[scope] ?? kernel?.domains ?? [];
  return lenses.map((d: DomainLens) => d.label).filter(Boolean).slice(0, 5);
}

function kernelActions(
  kernel: PersonalizationKernel | undefined,
  scope: ForecastScope,
): string[] {
  const lenses = kernel?.screenLenses[scope] ?? kernel?.domains ?? [];
  return compact([
    lenses[0]?.actions[0],
    lenses[1]?.actions[0],
    lenses[2]?.signals[0],
  ]).slice(0, 3);
}

function kernelCautions(
  kernel: PersonalizationKernel | undefined,
  scope: ForecastScope,
): string[] {
  const lenses = kernel?.screenLenses[scope] ?? kernel?.domains ?? [];
  return compact([
    lenses[0]?.cautions[0],
    lenses[1]?.cautions[0],
    kernel?.natal.archetype.stressPattern,
  ]).slice(0, 3);
}

function screenIntentSeed(scope: "today" | "weekly" | "monthly", domains: string[]): string {
  const d0 = domains[0] ?? "practical decisions";
  const d1 = domains[1] ?? "speech";
  if (scope === "weekly") {
    return `This week, keep ${d0} and ${d1} separate instead of juggling every stress at once.`;
  }
  if (scope === "monthly") {
    return `This month needs one bigger focus on ${d0}, with ${d1} kept steady.`;
  }
  return `Today's best for ${d0}. Keep ${d1} simple.`;
}

function personalizedOneLine(
  kernel: PersonalizationKernel | undefined,
  loc: AppLocale,
  scope: "today" | "weekly" | "monthly",
): string | null {
  if (!kernel) return null;
  const key = kernel.natal.archetype.key;
  const firstAction = kernelActions(kernel, scope)[0] ?? "finish one small step";
  if (loc === "te") {
    return kernel.period.isDashaSandhi
      ? "పాత పని ముందు పూర్తి చేయండి. నెక్స్ట్ పెద్ద స్టెప్ ఆ తర్వాతే."
      : `${firstAction}. తొందరపడి కన్ఫ్యూజ్ అవ్వకండి.`;
  }
  if (loc === "hi") {
    return kernel.period.isDashaSandhi
      ? "पुराना काम साफ करें. अगला बड़ा कदम उसके बाद लें."
      : `${firstAction}. जल्दबाजी में बात खराब न करें.`;
  }
  if (kernel.period.isDashaSandhi) {
    return `${key}: finish one thing before chasing the next chapter.`;
  }
  return `${key}: ${firstAction}. Stop before pressure turns into perfectionism.`;
}

export function buildPhasePlan(
  seg: AdSegment,
  idx: number,
  loc: AppLocale,
  opts: {
    now: Date;
    previous: AdSegment | null;
    confidenceLabel: "high" | "medium";
    periodLabel: string;
    fallbackTitle: string;
    fallbackSentences: string[];
    kernel?: PersonalizationKernel;
  },
): PhasePlan {
  const md = lordFlavor(seg.mdLord, loc);
  const ad = lordFlavor(seg.adLord, loc);
  const totalMs = Math.max(1, seg.end.getTime() - seg.start.getTime());
  const clampedNow = Math.min(
    Math.max(opts.now.getTime(), seg.start.getTime()),
    seg.end.getTime(),
  );
  const tense = opts.now.getTime() > seg.end.getTime()
    ? "past"
    : opts.now.getTime() < seg.start.getTime()
    ? "future"
    : "current";
  const liveRatio = (clampedNow - seg.start.getTime()) / totalMs;
  const ratio = tense === "past" ? 0.66 : liveRatio;
  const domainLabels = kernelDomainLabels(opts.kernel, "journey");
  const kernelSignals = compact([
    opts.kernel?.natal.archetype.core,
    opts.kernel?.natal.archetype.workStyle,
    opts.kernel?.period.line,
    opts.kernel?.lifeStage,
  ]).slice(0, 4);
  const dailyTexture = compact([
    ad.mood[0],
    ad.areas[0],
    md.mood[0],
  ]).slice(0, 3);

  return {
    id: idx,
    periodLabel: opts.periodLabel,
    mahadashaLord: seg.mdLord,
    antardashaLord: seg.adLord,
    tense,
    activeDomains: nativeOnly(loc, [
      ...domainLabels.slice(0, 3),
      ...blendActionBias(ad.areas, md.areas),
    ]).slice(0, 4),
    supportThemes: nativeOnly(loc, [
      opts.kernel?.natal.archetype.strength,
      ad.mood[0],
      md.mood[0],
      md.areas[1],
    ]).slice(0, 4),
    pressureThemes: nativeOnly(loc, [
      opts.kernel?.natal.archetype.stressPattern,
      ...blendCautionBias(ad.mood, md.mood),
    ]).slice(0, 3),
    dailyTexture,
    phasePulse: tense === "past"
      ? (loc === "te" ? "ముందు చాప్టర్" : loc === "hi" ? "पिछला अध्याय" : "Past chapter")
      : pulseLabel(ratio, loc),
    kernelSignals,
    lifeStage: opts.kernel?.lifeStage,
    domainLenses: domainLabels,
    shareHook: opts.kernel?.shareSeed,
    transitionNote: phaseTransition(opts.previous, seg, loc),
    evidenceLine: evidenceLine(ad.areas, md.areas, loc),
    confidenceLabel: opts.confidenceLabel,
    fallbackTitle: opts.fallbackTitle,
    fallbackSentences: opts.fallbackSentences,
  };
}

export function buildTodayPlan(
  mdLord: string,
  adLord: string,
  loc: AppLocale,
  kernel?: PersonalizationKernel,
  scope: "today" | "weekly" | "monthly" = "today",
): TodayPlanner {
  const md = lordFlavor(mdLord || "Saturn", loc);
  const ad = lordFlavor(adLord || mdLord || "Moon", loc);
  const domainLabels = kernelDomainLabels(kernel, scope);
  const activeDomains = nativeOnly(loc, [
    ...domainLabels.slice(0, scope === "today" ? 3 : 4),
    ...blendActionBias(ad.areas, md.areas),
  ]).slice(0, scope === "today" ? 4 : 5);
  const supportThemes = nativeOnly(loc, [
    kernel?.natal.archetype.strength,
    kernel?.period.line,
    ad.mood[0],
    md.mood[0],
    ad.areas[1],
  ]).slice(0, 5);
  const pressureThemes = nativeOnly(loc, [
    ...kernelCautions(kernel, scope),
    ...blendCautionBias(ad.mood, md.mood),
  ]).slice(0, 4);
  const actionBias = nativeOnly(loc, [
    ...kernelActions(kernel, scope),
    ...activeDomains,
  ]).slice(0, scope === "today" ? 2 : 3);
  const cautionBias = pressureThemes.slice(0, 2);
  const dailyTexture = nativeOnly(loc, [
    kernel?.natal.archetype.workStyle,
    ad.areas[0],
    ad.mood[0],
    md.areas[0],
  ]).slice(0, 4);

  const oneLineSeed = personalizedOneLine(kernel, loc, scope) ??
    (loc === "te"
      ? `${activeDomains[0] ?? "ఈరోజు"} బాగుంటుంది, కానీ ${pressureThemes[0] ?? "ఆవేశం"} విషయంలో జాగ్రత్త.`
      : loc === "hi"
      ? `${activeDomains[0] ?? "आज"} अच्छा रहेगा, लेकिन ${pressureThemes[0] ?? "आवेग"} में सावधानी रखें।`
      : `${activeDomains[0] ?? "Today"} looks stronger, but watch ${
        pressureThemes[0] ?? "knee-jerk decisions"
      }.`);

  return {
    activeDomains,
    supportThemes,
    pressureThemes,
    actionBias,
    cautionBias,
    dailyTexture,
    oneLineSeed,
    evidenceLine: evidenceLine(ad.areas, md.areas, loc),
    screenIntent: scope,
    domainLenses: domainLabels,
    personalSignals: kernel?.personalSignals.slice(0, 5) ?? [],
    shareHook: kernel?.shareSeed ?? screenIntentSeed(scope, activeDomains),
  };
}

export function buildRangePlan(
  scope: "weekly" | "monthly",
  mdLord: string,
  adLord: string,
  loc: AppLocale,
  kernel?: PersonalizationKernel,
): TodayPlanner {
  return buildTodayPlan(mdLord, adLord, loc, kernel, scope);
}

function purposeLabel(purposeType: string, loc: AppLocale): string {
  const map = {
    career_interview: {
      en: "career move",
      hi: "कैरियर बात",
      te: "కెరీర్ స్టెప్",
    },
    business_launch: { en: "launch", hi: "लॉन्च", te: "లాంచ్" },
    money_talk: { en: "money talk", hi: "पैसे की बात", te: "డబ్బు మాట" },
    property_vehicle: { en: "property step", hi: "जायदाद कदम", te: "ఆస్తి పని" },
    relationship_marriage_talk: {
      en: "relationship talk",
      hi: "रिश्ते की बात",
      te: "రిలేషన్‌షిప్ మాట",
    },
    family_discussion: { en: "family talk", hi: "परिवार की बात", te: "ఫ్యామిలీ మాట" },
    travel: { en: "travel start", hi: "यात्रा शुरू", te: "ప్రయాణం స్టార్ట్" },
    study_exam: { en: "study push", hi: "पढ़ाई जोर", te: "చదువు ఫోకస్" },
    health_routine: { en: "health routine", hi: "स्वास्थ्य दिनचर्या", te: "హెల్త్ అలవాటు" },
    legal_dispute: { en: "legal step", hi: "कानूनी कदम", te: "లీగల్ పని" },
    spiritual_puja: { en: "puja", hi: "पूजा", te: "పూజ" },
    creative_public: { en: "public share", hi: "सार्वजनिक प्रस्तुति", te: "పబ్లిక్ షేర్" },
    child_naming: { en: "naming ceremony", hi: "नामकरण", te: "నామకరణం" },
    child_first_food: { en: "first food", hi: "अन्नप्राशन", te: "అన్నప్రాశన" },
    child_first_haircut: { en: "first haircut", hi: "मुंडन", te: "పుట్టు వెంట్రుకలు" },
    child_doctor_visit: { en: "doctor visit", hi: "डॉक्टर विज़िट", te: "డాక్టర్ దగ్గరికి" },
    child_school_start: { en: "school start", hi: "स्कूल की शुरुआत", te: "స్కూల్ స్టార్ట్" },
  } as const;
  const row = map[purposeType as keyof typeof map];
  if (!row) return purposeType;
  return row[loc] ?? row.en;
}

export function buildPurposePlan(
  purposeType: string,
  status: string,
  _score: number,
  mdLord: string,
  adLord: string,
  loc: AppLocale,
  kernel?: PersonalizationKernel,
): PurposePlanner {
  const md = lordFlavor(mdLord || "Saturn", loc);
  const ad = lordFlavor(adLord || mdLord || "Moon", loc);
  const label = purposeLabel(purposeType, loc);
  const purposeLens = kernel?.purposeLenses[purposeType];
  const support = nativeOnly(loc, [
    ...(purposeLens?.supportSignals ?? []),
    ad.areas[0],
    ad.mood[0],
    md.areas[0],
  ]).slice(0, 5);
  const caution = nativeOnly(loc, [
    ...(purposeLens?.cautionSignals ?? []),
    ad.mood[1] ?? ad.mood[0],
    md.mood[1] ?? md.mood[0],
  ]).slice(0, 4);

  const headline = loc === "te"
    ? `${label} కోసం ${
      status === "matched" ? "మంచి సపోర్ట్" : status === "partly_matched" ? "అటూ ఇటూ" : "ఆగడం బెటర్"
    }`
    : loc === "hi"
    ? `${label} के लिए ${
      status === "matched"
        ? "अच्छा सहारा"
        : status === "partly_matched"
        ? "मिला-जुला सहारा"
        : "रुकना बेहतर"
    }`
    : `${
      status === "matched" ? "Good to go" : status === "partly_matched" ? "Mixed" : "Better wait"
    } for ${label}`;

  return {
    headline,
    supportSummary: support.join(", "),
    cautionSummary: caution.join(", "),
    actionBias: support.slice(0, 3),
    cautionBias: caution.slice(0, 2),
    domainLenses: (purposeLens?.domains ?? []).map((d) => d.label).slice(0, 4),
    personalSignals: compact([
      ...(purposeLens?.actionSignals ?? []),
      kernel?.natal.archetype.workStyle,
      kernel?.lifeStage,
    ]).slice(0, 5),
    shareHook: purposeLens?.shareSeed ??
      `${label}: pick a time that keeps the mood calm and lets you follow through.`,
    betterOptionSeed: status === "not_matched"
      ? (loc === "te"
        ? `రేపు ఉదయం ${label} మళ్లీ ట్రై చేయండి.`
        : loc === "hi"
        ? `कल सुबह ${label} फिर से आज़माएं।`
        : `Try ${label} again tomorrow morning.`)
      : undefined,
  };
}

export function buildFactSignature(parts: Array<string | null | undefined>): string {
  return parts.map((v) => (v ?? "").trim()).join("|");
}

export function isoDateLabel(date: Date): string {
  return DateTime.fromJSDate(date).toISODate() ?? date.toISOString().slice(0, 10);
}
