import type { AskAnswerResult } from "@/lib/engine-parsers";

export type BirthPackPayload = {
  date: string;
  locale: string;
  displayName: string;
  locationLabel: string;
  status: string;
  content: Record<string, unknown>;
  access?: { isPro?: boolean; planCode?: string };
  packMeta?: PackMeta;
  /** Server reading id + updated_at; a change means cached Today cards are stale. */
  readingVersion?: string;
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
  focusAreas: string[];
  pressureThemes: string[];
  domainLenses: string[];
  transitionNote: string;
  periodStart?: string;
  periodEnd?: string;
  /** "summary" = one compact row for a whole mahadasha (or the early years); default "detail". */
  kind: "detail" | "summary";
  /** Summary rows: every mahadasha lord in the span. */
  mdLords: string[];
  early: boolean;
  ageFrom?: number;
  ageTo?: number;
};

export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: AskAnswerResult;
  /** Streamed answer still arriving (typing indicator while empty). */
  streaming?: boolean;
};

export type NatalLuckColour = {
  key: string;
  label: string;
  hex: string;
};

export type NatalLuckInfo = {
  moonSignKey: string;
  moonSignLabel: string;
  moonSymbol: string;
  luckyNumbers: string[];
  luckyDays: string[];
  luckyColours: NatalLuckColour[];
};
