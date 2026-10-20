export type BirthPackPayload = {
  date: string;
  locale: string;
  displayName: string;
  locationLabel: string;
  status: string;
  content: Record<string, unknown>;
  access?: { isPro?: boolean; planCode?: string };
  packMeta?: PackMeta;
};

export type PackMeta = {
  todayCount: number;
  todayRange?: { start: string; end: string };
  weeklyCount: number;
  monthlyCount: number;
};

export type ChapterView = {
  id: string;
  sortOrder: number;
  periodLabel: string;
  title: string;
  highlight: string;
  body: string;
  tense: "past" | "current" | "future";
  proLocked: boolean;
  evidenceLine: string;
  shareHook: string;
  mahadashaLord: string;
  antardashaLord: string;
  phasePulse: string;
};

export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};
