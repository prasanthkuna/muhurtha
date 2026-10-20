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
};

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
  const lc = raw.lifeChapter as Record<string, unknown> | undefined;

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
  };
}
