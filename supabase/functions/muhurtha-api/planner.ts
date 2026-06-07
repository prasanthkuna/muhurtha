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

function compact<T>(values: (T | null | undefined | false)[]): T[] {
  return values.filter(Boolean) as T[];
}

function pulseLabel(ratio: number, loc: AppLocale): string {
  if (loc === "te") {
    if (ratio < 0.18) return "ప్రవేశ దశ";
    if (ratio < 0.5) return "నిర్మాణ దశ";
    if (ratio < 0.82) return "పీక్ దశ";
    return "విడిచే దశ";
  }
  if (loc === "hi") {
    if (ratio < 0.18) return "प्रवेश चरण";
    if (ratio < 0.5) return "निर्माण चरण";
    if (ratio < 0.82) return "चरम चरण";
    return "समापन चरण";
  }
  if (ratio < 0.18) return "Entry phase";
  if (ratio < 0.5) return "Build phase";
  if (ratio < 0.82) return "Peak phase";
  return "Release phase";
}

function phaseTransition(
  prev: AdSegment | null,
  seg: AdSegment,
  loc: AppLocale,
): string {
  if (!prev) {
    return loc === "te"
      ? "ఇది కనిపించే మొదటి స్పష్టమైన ఉపదశల్లో ఒకటి."
      : loc === "hi"
      ? "यह शुरुआती साफ दिखने वाले उप-चरणों में से एक है।"
      : "This is one of the earliest clearly visible sub-phases in the current arc.";
  }
  if (prev.adLord === seg.adLord) {
    return loc === "te"
      ? "మునుపటి స్వరమే ఇక్కడ మరింత స్పష్టంగా బయటపడింది."
      : loc === "hi"
      ? "पिछले चरण का वही स्वर यहां और साफ होकर दिखा।"
      : "The same underlying tone continued here, but in a more visible way.";
  }
  return loc === "te"
    ? `${prev.adLord} స్వరం నుంచి ${seg.adLord} వైపు మలుపు తిరిగిన దశ.`
    : loc === "hi"
    ? `यह ${prev.adLord} के स्वर से ${seg.adLord} की तरफ मुड़ने वाला चरण था।`
    : `This phase turned the story from ${prev.adLord} tone into ${seg.adLord} tone.`;
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
    return `${a0}, ${a1}, మరియు ${m0} లాంటి విషయాల్లో ఇది ముందుగా కనిపిస్తుంది.`;
  }
  if (loc === "hi") {
    return `${a0}, ${a1}, और ${m0} जैसे क्षेत्रों में यह सबसे पहले महसूस होता है।`;
  }
  return `This usually shows up first through ${a0}, ${a1}, and ${m0}.`;
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
    return `This week should separate ${d0} from ${d1} instead of mixing every pressure together.`;
  }
  if (scope === "monthly") {
    return `This month needs one larger theme around ${d0}, with ${d1} kept steady.`;
  }
  return `Today is mainly useful for ${d0}; keep ${d1} clean and simple.`;
}

function personalizedOneLine(
  kernel: PersonalizationKernel | undefined,
  loc: AppLocale,
  scope: "today" | "weekly" | "monthly",
): string | null {
  if (!kernel) return null;
  const key = kernel.natal.archetype.key;
  const firstAction = kernelActions(kernel, scope)[0] ?? "finish one clean step";
  if (loc === "te") {
    return kernel.period.isDashaSandhi
      ? "పాత పని ముగించండి. తర్వాతి పెద్ద అడుగు అప్పుడు వేయండి."
      : `${firstAction}. తొందరపడి గందరగోళం చేసుకోవద్దు.`;
  }
  if (loc === "hi") {
    return kernel.period.isDashaSandhi
      ? "पुराना काम साफ करें. अगला बड़ा कदम उसके बाद लें."
      : `${firstAction}. जल्दबाजी में बात खराब न करें.`;
  }
  if (kernel.period.isDashaSandhi) {
    return `${key}: close one loop before chasing the next chapter.`;
  }
  return `${key}: ${firstAction}; stop before pressure becomes perfection.`;
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
    activeDomains: compact([
      ...domainLabels.slice(0, 3),
      ...blendActionBias(ad.areas, md.areas),
    ]).slice(0, 4),
    supportThemes: compact([
      opts.kernel?.natal.archetype.strength,
      ad.mood[0],
      md.mood[0],
      md.areas[1],
    ]).slice(0, 4),
    pressureThemes: compact([
      opts.kernel?.natal.archetype.stressPattern,
      ...blendCautionBias(ad.mood, md.mood),
    ]).slice(0, 3),
    dailyTexture,
    phasePulse: tense === "past" ? "Past chapter" : pulseLabel(ratio, loc),
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
  const activeDomains = compact([
    ...domainLabels.slice(0, scope === "today" ? 3 : 4),
    ...blendActionBias(ad.areas, md.areas),
  ]).slice(0, scope === "today" ? 4 : 5);
  const supportThemes = compact([
    kernel?.natal.archetype.strength,
    kernel?.period.line,
    ad.mood[0],
    md.mood[0],
    ad.areas[1],
  ]).slice(0, 5);
  const pressureThemes = compact([
    ...kernelCautions(kernel, scope),
    ...blendCautionBias(ad.mood, md.mood),
  ]).slice(0, 4);
  const actionBias = compact([
    ...kernelActions(kernel, scope),
    ...activeDomains,
  ]).slice(0, scope === "today" ? 2 : 3);
  const cautionBias = pressureThemes.slice(0, 2);
  const dailyTexture = compact([
    kernel?.natal.archetype.workStyle,
    ad.areas[0],
    ad.mood[0],
    md.areas[0],
  ]).slice(0, 4);

  const oneLineSeed = personalizedOneLine(kernel, loc, scope) ??
    (loc === "te"
      ? `${activeDomains[0] ?? "ఈరోజు"} బాగుంటుంది, కానీ ${pressureThemes[0] ?? "ఆవేశం"}లో జాగ్రత్త అవసరం.`
      : loc === "hi"
      ? `${activeDomains[0] ?? "आज"} अच्छा रहेगा, लेकिन ${pressureThemes[0] ?? "आवेग"} में सावधानी रखें।`
      : `${activeDomains[0] ?? "Today"} looks stronger, but watch ${
        pressureThemes[0] ?? "reactive decisions"
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
      te: "కెరీర్ అడుగు",
    },
    business_launch: { en: "launch", hi: "लॉन्च", te: "లాంచ్" },
    money_talk: { en: "money talk", hi: "पैसे की बात", te: "డబ్బు మాట" },
    property_vehicle: { en: "property step", hi: "जायदाद कदम", te: "ఆస్తి అడుగు" },
    relationship_marriage_talk: {
      en: "relationship talk",
      hi: "रिश्ते की बात",
      te: "సంబంధం మాట",
    },
    family_discussion: { en: "family talk", hi: "परिवार की बात", te: "కుటుంబ మాట" },
    travel: { en: "travel start", hi: "यात्रा शुरू", te: "ప్రయాణ ప్రారంభం" },
    study_exam: { en: "study push", hi: "पढ़ाई जोर", te: "చదువు దృష్టి" },
    health_routine: { en: "health routine", hi: "स्वास्थ्य दिनचर्या", te: "ఆరోగ్య అలవాటు" },
    legal_dispute: { en: "legal step", hi: "कानूनी कदम", te: "న్యాయ అడుగు" },
    spiritual_puja: { en: "puja", hi: "पूजा", te: "పూజ" },
    creative_public: { en: "public share", hi: "सार्वजनिक प्रस्तुति", te: "పబ్లిక్ షేర్" },
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
  const support = compact([
    ...(purposeLens?.supportSignals ?? []),
    ad.areas[0],
    ad.mood[0],
    md.areas[0],
  ]).slice(0, 5);
  const caution = compact([
    ...(purposeLens?.cautionSignals ?? []),
    ad.mood[1] ?? ad.mood[0],
    md.mood[1] ?? md.mood[0],
  ]).slice(0, 4);

  const headline = loc === "te"
    ? `${label} కోసం ${
      status === "matched" ? "మంచి సపోర్ట్" : status === "partly_matched" ? "మిక్స్ సపోర్ట్" : "వేచి చూడటం మంచిది"
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
      status === "matched" ? "Supportive" : status === "partly_matched" ? "Mixed" : "Wait a bit"
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
      `${label}: choose a window that protects tone and follow-through.`,
    betterOptionSeed: status === "not_matched"
      ? (loc === "te"
        ? `రేపు ఉదయం ${label} మళ్లీ ప్రయత్నించండి.`
        : loc === "hi"
        ? `कल सुबह ${label} फिर से आज़माएं।`
        : `Retry ${label} tomorrow morning.`)
      : undefined,
  };
}

export function buildFactSignature(parts: Array<string | null | undefined>): string {
  return parts.map((v) => (v ?? "").trim()).join("|");
}

export function isoDateLabel(date: Date): string {
  return DateTime.fromJSDate(date).toISODate() ?? date.toISOString().slice(0, 10);
}
