import { chapterIdFrom } from "./chapter-id";
import type { BirthPackPayload, ChapterView, PackMeta } from "./types";

function tenseBySort(
  facts: Record<string, unknown>[],
  sortOrder: number,
): ChapterView["tense"] {
  const row = facts.find((f) => f.sortOrder === sortOrder);
  const t = row?.tense?.toString();
  if (t === "past" || t === "current" || t === "future") return t;
  return "future";
}

export class BirthPackViews {
  constructor(private pack: BirthPackPayload) {}

  get content() {
    return this.pack.content;
  }

  get packMeta(): PackMeta {
    const meta = this.pack.packMeta;
    const cards = this.content.today_cards;
    const weekly = this.content.weekly_cards;
    const monthly = this.content.monthly_cards;
    return (
      meta ?? {
        todayCount: Array.isArray(cards) ? cards.length : 0,
        weeklyCount: Array.isArray(weekly) ? weekly.length : 0,
        monthlyCount: Array.isArray(monthly) ? monthly.length : 0,
      }
    );
  }

  get displayHook(): string {
    const me = this.content.me_profile as Record<string, unknown> | undefined;
    const preview = this.content.free_preview as Record<string, unknown> | undefined;
    return (
      me?.title?.toString() ||
      preview?.decode_hit?.toString() ||
      "Your reading"
    );
  }

  get identitySummary(): string {
    const me = this.content.me_profile as Record<string, unknown> | undefined;
    const identity = this.content.user_identity as Record<string, unknown> | undefined;
    return me?.summary?.toString() || identity?.summary?.toString() || "";
  }

  get strengths(): string[] {
    const me = this.content.me_profile as Record<string, unknown> | undefined;
    const identity = this.content.user_identity as Record<string, unknown> | undefined;
    const raw = (me?.strengths ?? identity?.strengths) as unknown;
    return Array.isArray(raw) ? raw.map(String) : [];
  }

  get watchouts(): string[] {
    const me = this.content.me_profile as Record<string, unknown> | undefined;
    const identity = this.content.user_identity as Record<string, unknown> | undefined;
    const raw = (me?.watchouts ?? identity?.watchouts) as unknown;
    return Array.isArray(raw) ? raw.map(String) : [];
  }

  chapters(): ChapterView[] {
    const phases = this.content.journey_phases;
    const facts = this.content.journey_phase_facts;
    if (!Array.isArray(phases)) return [];

    const factList = Array.isArray(facts)
      ? facts.map((f) => f as Record<string, unknown>)
      : [];

    return phases
      .map((raw) => {
        const p = raw as Record<string, unknown>;
        const sortOrder = Number(p.sortOrder ?? -1);
        const periodLabel = p.periodLabel?.toString() ?? "";
        const tense = tenseBySort(factList, sortOrder);
        const sentences = Array.isArray(p.sentences)
          ? p.sentences.map(String).join("\n\n")
          : p.highlight?.toString() ?? "";
        return {
          id: chapterIdFrom(sortOrder, periodLabel),
          sortOrder,
          periodLabel,
          title: p.title?.toString() ?? periodLabel,
          highlight: p.highlight?.toString() ?? "",
          body: sentences,
          tense,
          proLocked: p.proLocked === true,
          evidenceLine: p.evidenceLine?.toString() ?? "",
          shareHook: p.shareHook?.toString() ?? "",
          mahadashaLord: p.mahadashaLord?.toString() ?? "",
          antardashaLord: p.antardashaLord?.toString() ?? "",
          phasePulse: p.phasePulse?.toString() ?? "",
        } satisfies ChapterView;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  chapterById(id: string): ChapterView | undefined {
    return this.chapters().find((c) => c.id === id);
  }

  todayCard(date: string) {
    const cards = this.content.today_cards;
    if (!Array.isArray(cards)) return null;
    return (
      cards.find((c) => (c as Record<string, unknown>).key === date) as
        | Record<string, unknown>
        | undefined
    );
  }

  askSuggestions(): string[] {
    const raw = this.content.ask_templates;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === "string") return item;
        const m = item as Record<string, unknown>;
        return m.question?.toString() ?? "";
      })
      .filter(Boolean);
  }

  askTemplateAnswer(question: string): string {
    const raw = this.content.ask_templates;
    if (!Array.isArray(raw)) return "";
    for (const item of raw) {
      const m = item as Record<string, unknown>;
      if (m.question?.toString() === question) {
        return m.direct_answer?.toString() ?? m.action_line?.toString() ?? "";
      }
    }
    const knowledge = this.content.ask_knowledge as Record<string, unknown> | undefined;
    return knowledge?.compact_summary?.toString() ?? "";
  }

  domainReports(): { key: string; title: string; body: string }[] {
    const raw = this.content.category_reports as Record<string, unknown> | undefined;
    if (!raw) return [];
    const keys = [
      "career",
      "money",
      "business",
      "relationship",
      "family",
      "health_routine",
    ];
    const out: { key: string; title: string; body: string }[] = [];
    for (const key of keys) {
      const section = raw[key] as Record<string, unknown> | undefined;
      if (!section) continue;
      const body = section.body?.toString() || section.summary?.toString() || "";
      const headline = section.headline?.toString() || key.replace(/_/g, " ");
      if (!body && !headline) continue;
      out.push({ key, title: headline, body });
    }
    return out;
  }
}

export function normalizePackResponse(j: Record<string, unknown>): BirthPackPayload {
  const content =
    j.content && typeof j.content === "object"
      ? (j.content as Record<string, unknown>)
      : {};
  const topMeta = j.packMeta;
  if (topMeta && typeof topMeta === "object") {
    content.pack_meta = topMeta;
  }
  const access =
    j.access && typeof j.access === "object"
      ? (j.access as BirthPackPayload["access"])
      : undefined;
  return {
    date: j.date?.toString() ?? "",
    locale: j.locale?.toString() ?? "en",
    displayName: j.displayName?.toString() ?? "",
    locationLabel: j.locationLabel?.toString() ?? "",
    status: j.status?.toString() ?? "ready",
    content,
    access,
    packMeta:
      topMeta && typeof topMeta === "object"
        ? (topMeta as PackMeta)
        : undefined,
  };
}
