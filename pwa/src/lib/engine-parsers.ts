export type TimingWindow = {
  start: string;
  end: string;
  label: string;
};

export type PurposeCheckResult = {
  status: string;
  headline: string;
  summary: string;
  actionLine: string;
  timingNote: string;
  bestWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterOptions: { label: string; detail: string }[];
  supportingFactors: string[];
  cautionFactors: string[];
  limitations: string[];
  factors: { name?: string; value?: string }[];
  personalSignals: string[];
  domainLenses: string[];
  shareHook?: string;
  targetDate?: string;
  locationLabel?: string;
  timezone?: string;
};

export type AskAnswerResult = {
  sessionId: string;
  directAnswer: string;
  bestTime: string;
  cautionTime: string;
  betterOption: string;
  actionLine: string;
  simpleWhy?: string;
  shareHook?: string;
  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  freeRemainingToday?: number;
};

function windows(raw: unknown): TimingWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w): w is Record<string, unknown> => typeof w === "object" && w !== null)
    .map((w) => ({
      start: w.start?.toString() ?? "",
      end: w.end?.toString() ?? "",
      label: w.label?.toString() ?? "",
    }))
    .filter((w) => w.start && w.end);
}

export function parsePurposeCheck(json: Record<string, unknown>): PurposeCheckResult {
  const betterRaw = json.better_options;
  const betterOptions = Array.isArray(betterRaw)
    ? betterRaw
        .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null)
        .map((o) => ({
          label: o.label?.toString() ?? "",
          detail: o.detail?.toString() ?? "",
        }))
    : [];

  const factorsRaw = json.factors;
  const factors = Array.isArray(factorsRaw)
    ? factorsRaw
        .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
        .map((f) => ({
          name: f.name?.toString(),
          value: f.value?.toString(),
        }))
    : [];

  const strList = (k: string) => {
    const v = json[k];
    return Array.isArray(v) ? v.map(String) : [];
  };

  return {
    status: json.status?.toString() ?? "",
    headline: json.headline?.toString() ?? "",
    summary: json.summary?.toString() ?? "",
    actionLine: json.action_line?.toString() ?? "",
    timingNote: json.timing_note?.toString() ?? "",
    bestWindows: windows(json.best_windows),
    cautionWindows: windows(json.caution_windows),
    betterOptions,
    supportingFactors: strList("supportingFactors"),
    cautionFactors: strList("cautionFactors"),
    limitations: strList("limitations"),
    factors,
    personalSignals: strList("personalSignals"),
    domainLenses: strList("domainLenses"),
    shareHook: json.shareHook?.toString(),
    targetDate: json.targetDate?.toString(),
    locationLabel: json.locationLabel?.toString(),
    timezone: json.timezone?.toString(),
  };
}

export function parseAskAnswer(json: Record<string, unknown>): AskAnswerResult {
  const access =
    json.askAccess && typeof json.askAccess === "object"
      ? (json.askAccess as Record<string, unknown>)
      : {};
  return {
    sessionId: json.sessionId?.toString() ?? "",
    directAnswer: json.directAnswer?.toString() ?? "",
    bestTime: json.bestTime?.toString() ?? "",
    cautionTime: json.cautionTime?.toString() ?? "",
    betterOption: json.betterOption?.toString() ?? "",
    actionLine: json.actionLine?.toString() ?? "",
    simpleWhy: json.simpleWhy?.toString(),
    shareHook: json.shareHook?.toString(),
    goodWindows: windows(json.goodWindows),
    cautionWindows: windows(json.cautionWindows),
    freeRemainingToday:
      typeof access.freeRemainingToday === "number"
        ? access.freeRemainingToday
        : Number(access.freeRemainingToday) || undefined,
  };
}

export function formatAskMessage(result: AskAnswerResult): string {
  const parts = [result.directAnswer];
  if (result.bestTime) parts.push(`Best time: ${result.bestTime}`);
  if (result.cautionTime) parts.push(`Go lighter: ${result.cautionTime}`);
  if (result.betterOption) parts.push(`Better option: ${result.betterOption}`);
  if (result.actionLine) parts.push(result.actionLine);
  if (result.simpleWhy) parts.push(result.simpleWhy);
  return parts.filter(Boolean).join("\n\n");
}
