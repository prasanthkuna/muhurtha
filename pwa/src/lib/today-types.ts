export type TimingWindow = {
  start: string;
  end: string;
  label?: string;
  whyItWorks?: string;
};

export type TodayPayload = {
  date: string;
  locationLabel: string;
  locationVerified: boolean;
  engineMode: string;
  oneLine?: string;
  betterFor: string[];
  beCarefulWith: string[];
  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  currentLifePeriod?: { label?: string; summary?: string };
  lifeChapter?: { title?: string; summary?: string; currentChapterLabel?: string };
  /** Sunrise panchang for the day (engine). */
  dayStar?: string;
  tithi?: string;
  tara?: string;
  birthStarToday?: boolean;
  /** The natal (birth) star, for Decode's hero. */
  birthStar?: string | null;
  /** The Calendar tab's verdict for the same date (same scoring). */
  calendar?: TodayCalendar | null;
  /** Next full / new moon dates (yyyy-MM-dd), so month cards can name the date. */
  moonDates?: { purnima: string | null; amavasya: string | null } | null;
};

export type TodayCalendar = {
  tone: "supportive" | "mixed" | "rest";
  favours: string[];
  avoid: string | null;
  why?: string;
  chandrashtama?: boolean;
  birthStar?: boolean;
  natalStar?: string | null;
  /** The day's best window (the one every screen and alert names) and what kind it is. */
  best?: { start: string; end: string } | null;
  bestKind?: "go" | "calm";
  rahu?: { start: string; end: string } | null;
};

function slot(v: unknown): { start: string; end: string } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return typeof o.start === "string" && typeof o.end === "string" ? { start: o.start, end: o.end } : null;
}

export function parseTodayPayload(raw: Record<string, unknown>): TodayPayload {
  const windows = (key: string): TimingWindow[] => {
    const list = raw[key];
    if (!Array.isArray(list)) return [];
    return list
      .filter((w): w is Record<string, unknown> => typeof w === "object" && w !== null)
      .map((w) => ({
        start: w.start?.toString() ?? "",
        end: w.end?.toString() ?? "",
        label: w.label?.toString(),
        whyItWorks: w.whyItWorks?.toString() ?? w.why_it_works?.toString(),
      }));
  };

  const clp = raw.currentLifePeriod as Record<string, unknown> | undefined;
  const pan = (raw.panchanga ?? null) as Record<string, Record<string, unknown> | undefined> | null;
  const cal = (raw.calendar ?? null) as Record<string, unknown> | null;
  const lc = raw.lifeChapter as Record<string, unknown> | undefined;
  const md = (raw.moonDates ?? null) as Record<string, unknown> | null;

  return {
    date: raw.date?.toString() ?? "",
    locationLabel: raw.locationLabel?.toString() ?? "",
    locationVerified: raw.locationVerified === true,
    engineMode: raw.engineMode?.toString() ?? "",
    oneLine: raw.oneLine?.toString(),
    betterFor: Array.isArray(raw.betterFor) ? raw.betterFor.map(String) : [],
    beCarefulWith: Array.isArray(raw.beCarefulWith) ? raw.beCarefulWith.map(String) : [],
    goodWindows: windows("goodWindows"),
    cautionWindows: windows("cautionWindows"),
    currentLifePeriod: clp
      ? { label: clp.label?.toString(), summary: clp.summary?.toString() }
      : undefined,
    lifeChapter: lc
      ? {
          title: lc.title?.toString(),
          summary: lc.summary?.toString(),
          currentChapterLabel: lc.currentChapterLabel?.toString(),
        }
      : undefined,
    // Sunrise values from the Calendar's own scoring first, so both tabs name the same star.
    dayStar: cal?.nakshatra?.toString() || pan?.nakshatra?.value?.toString() || raw.moonNakshatra?.toString(),
    tithi: cal?.tithi?.toString() || pan?.tithi?.value?.toString(),
    tara: pan?.tarabala?.value?.toString(),
    birthStar: typeof raw.birthMoonNakshatra === "string" ? raw.birthMoonNakshatra : null,
    birthStarToday: raw.birthStarToday === true || cal?.birth_star === true,
    calendar: cal && typeof cal.tone === "string"
      ? {
          tone: cal.tone as TodayCalendar["tone"],
          favours: Array.isArray(cal.favours) ? cal.favours.map(String) : [],
          avoid: cal.avoid ? String(cal.avoid) : null,
          why: cal.why ? String(cal.why) : undefined,
          chandrashtama: cal.chandrashtama === true,
          birthStar: cal.birth_star === true,
          natalStar: cal.natal_star ? String(cal.natal_star) : null,
          best: slot(cal.best),
          bestKind: cal.best_kind === "calm" ? "calm" : "go",
          rahu: slot(cal.rahu),
        }
      : null,
    moonDates: md
      ? {
          purnima: typeof md.purnima === "string" ? md.purnima : null,
          amavasya: typeof md.amavasya === "string" ? md.amavasya : null,
        }
      : null,
  };
}
