import { chapterIdFrom } from "./chapter-id";
import type {
  BirthPackPayload,
  ChapterView,
  NatalLuckInfo,
  PackMeta,
} from "./types";

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

  get natalLuck(): NatalLuckInfo | null {
    const person = this.content.person as Record<string, unknown> | undefined;
    const raw =
      this.content.natal_luck ??
      person?.natal_luck ??
      (this.content.me_profile as Record<string, unknown> | undefined)?.natal_luck;
    if (!raw || typeof raw !== "object") return null;
    const j = raw as Record<string, unknown>;
    const coloursRaw = j.lucky_colours ?? j.luckyColours;
    const colours = Array.isArray(coloursRaw)
      ? coloursRaw
          .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
          .map((c) => ({
            key: c.key?.toString() ?? "",
            label: c.label?.toString() ?? "",
            hex: c.hex?.toString() ?? "#6B7280",
          }))
      : [];
    const nums = j.lucky_numbers ?? j.luckyNumbers;
    const days = j.lucky_days ?? j.luckyDays;
    return {
      moonSignKey: j.moon_sign_key?.toString() ?? "",
      moonSignLabel: j.moon_sign_label?.toString() ?? "",
      moonSymbol: j.moon_symbol?.toString() ?? "☽",
      luckyNumbers: Array.isArray(nums) ? nums.map(String).slice(0, 3) : [],
      luckyDays: Array.isArray(days) ? days.map(String).slice(0, 3) : [],
      luckyColours: colours.slice(0, 3),
    };
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
        const fact =
          factList.find((f) => Number(f.sortOrder) === sortOrder) ??
          factList[sortOrder] ??
          null;
        const sentences = Array.isArray(p.sentences)
          ? p.sentences.map(String).join("\n\n")
          : p.highlight?.toString() ?? "";
        const strList = (raw: unknown) =>
          Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
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
          focusAreas: strList(p.focusAreas ?? fact?.focusAreas),
          pressureThemes: strList(p.pressureThemes ?? fact?.pressureThemes),
          domainLenses: strList(p.domainLenses ?? fact?.domainLenses),
          transitionNote:
            p.transitionNote?.toString() ?? fact?.transitionNote?.toString() ?? "",
          periodStart:
            p.periodStart?.toString() ?? fact?.periodStart?.toString() ?? fact?.start?.toString(),
          periodEnd: p.periodEnd?.toString() ?? fact?.periodEnd?.toString() ?? fact?.end?.toString(),
        } satisfies ChapterView;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  chapterById(id: string): ChapterView | undefined {
    return this.chapters().find((c) => c.id === id);
  }

  currentChapter(): ChapterView | undefined {
    return this.chapters().find((c) => c.tense === "current");
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

  playbookFor(date: string) {
    const playbook = this.content.playbook;
    if (playbook && typeof playbook === "object") {
      const day = (playbook as Record<string, unknown>)[date];
      if (day && typeof day === "object") return day as Record<string, unknown>;
    }
    const card = this.todayCard(date);
    if (card) return card;
    const guidance = this.content.today_guidance;
    if (guidance && typeof guidance === "object") {
      return guidance as Record<string, unknown>;
    }
    return null;
  }

  horizon(scope: "week" | "month" | "year") {
    const horizons = this.content.horizons as Record<string, unknown> | undefined;
    const timing = this.content.timing_plan as Record<string, unknown> | undefined;
    const fromHorizons = horizons?.[scope];
    const fromTiming = timing?.[scope];
    const parsed = this.parseHorizon(fromHorizons ?? fromTiming);
    if (parsed.headline || parsed.body) return parsed;

    const cardsKey = scope === "week" ? "weekly_cards" : scope === "month" ? "monthly_cards" : "yearly_cards";
    const cards = this.content[cardsKey];
    if (Array.isArray(cards) && cards[0] && typeof cards[0] === "object") {
      return this.horizonFromCard(cards[0] as Record<string, unknown>);
    }
    return { headline: "", body: "", caution: "" };
  }

  private parseHorizon(raw: unknown) {
    if (!raw || typeof raw !== "object") {
      return { headline: "", body: "", caution: "" };
    }
    const h = raw as Record<string, unknown>;
    return {
      headline: h.headline?.toString() ?? h.title?.toString() ?? "",
      body: h.body?.toString() ?? h.summary?.toString() ?? "",
      caution: h.caution?.toString() ?? "",
    };
  }

  private horizonFromCard(card: Record<string, unknown>) {
    const careful = card.be_careful;
    return {
      headline: card.title?.toString() ?? card.key?.toString() ?? "",
      body: card.body?.toString() ?? "",
      caution: Array.isArray(careful) ? careful.map(String).join("\n") : "",
    };
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
