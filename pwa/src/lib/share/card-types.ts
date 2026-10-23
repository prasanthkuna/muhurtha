import { GLYPHS, type GlyphName } from "@/lib/glyphs";

export const CARD_TYPES = [
  "today",
  "window",
  "chapter",
  "decode",
  "timing",
  "finddate",
  "ask",
  "milestone",
] as const;
export type CardType = (typeof CARD_TYPES)[number];
export type CardLocale = "en" | "te" | "hi";
export type CardSize = "feed" | "og" | "story";
export type CardVerdict = "good" | "mixed" | "avoid";

export const CARD_DIMENSIONS: Record<CardSize, { w: number; h: number }> = {
  feed: { w: 1080, h: 1350 },
  og: { w: 1200, h: 630 },
  story: { w: 1080, h: 1920 },
};

/** Everything a card shows. Built on the device from data the user can already see. */
export type CardData = {
  title: string;
  value?: string;
  subtitle?: string;
  body?: string;
  chips?: string[];
  glyph?: GlyphName;
  verdict?: CardVerdict;
  /** First name only. */
  name?: string;
  /** Present only when the sharer opts in (privacy toggles default off). */
  birth?: { date?: string; time?: string; place?: string };
};

export type CardPayload = {
  v: 1;
  type: CardType;
  locale: CardLocale;
  data: CardData;
};

/** Types whose cards can carry birth details (behind the privacy toggles). */
export const CARD_TYPES_WITH_BIRTH: CardType[] = ["decode", "chapter", "milestone"];

export const CARD_LABELS: Record<
  CardLocale,
  {
    eyebrow: Record<CardType, string>;
    cta: string;
    forName: (name: string) => string;
    born: string;
    brand: string;
  }
> = {
  en: {
    eyebrow: {
      today: "Today's brief",
      window: "Best window today",
      chapter: "Life chapter",
      decode: "Birth star profile",
      timing: "Timing check",
      finddate: "Best dates",
      ask: "Asked Muhūrta",
      milestone: "Child milestone",
    },
    cta: "See your own day · free",
    forName: (n) => `For ${n}`,
    born: "Born",
    brand: "Muhūrta",
  },
  te: {
    eyebrow: {
      today: "ఈ రోజు సారాంశం",
      window: "ఈ రోజు మంచి సమయం",
      chapter: "జీవన అధ్యాయం",
      decode: "జన్మ నక్షత్ర స్వరూపం",
      timing: "సమయ పరిశీలన",
      finddate: "మంచి తేదీలు",
      ask: "ముహూర్తాన్ని అడిగాను",
      milestone: "పిల్లల శుభ ఘట్టం",
    },
    cta: "మీ రోజు కూడా చూడండి · ఉచితం",
    forName: (n) => `${n} కోసం`,
    born: "జననం",
    brand: "Muhūrta",
  },
  hi: {
    eyebrow: {
      today: "आज का सार",
      window: "आज का शुभ समय",
      chapter: "जीवन अध्याय",
      decode: "जन्म नक्षत्र स्वरूप",
      timing: "समय जाँच",
      finddate: "शुभ तिथियाँ",
      ask: "मुहूर्त से पूछा",
      milestone: "शिशु संस्कार",
    },
    cta: "अपना दिन भी देखें · मुफ़्त",
    forName: (n) => `${n} के लिए`,
    born: "जन्म",
    brand: "Muhūrta",
  },
};

export const DEFAULT_GLYPH: Record<CardType, GlyphName> = {
  today: "sunrise",
  window: "goodWindow",
  chapter: "chapter",
  decode: "decode",
  timing: "goodWindow",
  finddate: "findDate",
  ask: "ask",
  milestone: "child",
};

function clean(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  // Strip control chars and markdown emphasis; collapse whitespace.
  const s = raw
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function isCardType(v: unknown): v is CardType {
  return typeof v === "string" && (CARD_TYPES as readonly string[]).includes(v);
}

/** Validate + clamp an untrusted payload. Returns null when unusable. */
export function sanitizeCardPayload(input: unknown): CardPayload | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (!isCardType(o.type)) return null;
  const locale: CardLocale = o.locale === "te" || o.locale === "hi" ? o.locale : "en";
  const d = (o.data && typeof o.data === "object" ? o.data : {}) as Record<string, unknown>;
  const title = clean(d.title, 90);
  if (!title) return null;
  const glyph =
    typeof d.glyph === "string" && d.glyph in GLYPHS ? (d.glyph as GlyphName) : undefined;
  const verdict =
    d.verdict === "good" || d.verdict === "mixed" || d.verdict === "avoid" ? d.verdict : undefined;
  const chips = Array.isArray(d.chips)
    ? d.chips.map((c) => clean(c, 40)).filter((c): c is string => Boolean(c)).slice(0, 3)
    : undefined;
  let birth: CardData["birth"];
  if (CARD_TYPES_WITH_BIRTH.includes(o.type) && d.birth && typeof d.birth === "object") {
    const b = d.birth as Record<string, unknown>;
    const date = clean(b.date, 32);
    const time = clean(b.time, 16);
    const place = clean(b.place, 48);
    if (date || time || place) birth = { date, time, place };
  }
  return {
    v: 1,
    type: o.type,
    locale,
    data: {
      title,
      value: clean(d.value, 48),
      subtitle: clean(d.subtitle, 70),
      body: clean(d.body, 300),
      chips: chips && chips.length ? chips : undefined,
      glyph,
      verdict,
      name: clean(d.name, 24)?.split(" ")[0],
      birth,
    },
  };
}

/** Plain-text caption that travels with the image / link. */
export function cardCaption(p: CardPayload, url: string): string {
  const L = CARD_LABELS[p.locale];
  const lines = [`${L.eyebrow[p.type]} · ${p.data.title}`];
  if (p.data.value) lines.push(p.data.value);
  lines.push("", `${L.cta}: ${url}`);
  return lines.join("\n");
}
