/** Sidereal rashi — aligned with supabase/functions/muhurtha-api/vedic_labels.ts */

export const RASHI_KEYS = [
  "mesha",
  "vrishabha",
  "mithuna",
  "karka",
  "simha",
  "kanya",
  "tula",
  "vrishchika",
  "dhanu",
  "makara",
  "kumbha",
  "meena",
] as const;

export type RashiKey = (typeof RASHI_KEYS)[number];

export const RASHI_SYMBOL: Record<RashiKey, string> = {
  mesha: "♈",
  vrishabha: "♉",
  mithuna: "♊",
  karka: "♋",
  simha: "♌",
  kanya: "♍",
  tula: "♎",
  vrishchika: "♏",
  dhanu: "♐",
  makara: "♑",
  kumbha: "♒",
  meena: "♓",
};

/** Per-sign accent for medallion gradients (editorial gold + sign tint). */
export const RASHI_THEME: Record<
  RashiKey,
  { rim: string; glow: string; core: string; symbol: string }
> = {
  mesha: { rim: "#c45c4a", glow: "rgba(196, 92, 74, 0.45)", core: "#fff5f2", symbol: "#8b3a2f" },
  vrishabha: { rim: "#6b8f5e", glow: "rgba(107, 143, 94, 0.4)", core: "#f4faf2", symbol: "#3d5c34" },
  mithuna: { rim: "#d4a843", glow: "rgba(212, 168, 67, 0.42)", core: "#fffaf0", symbol: "#7a5a18" },
  karka: { rim: "#7a9eb8", glow: "rgba(122, 158, 184, 0.42)", core: "#f2f8fc", symbol: "#3d5a72" },
  simha: { rim: "#e09030", glow: "rgba(224, 144, 48, 0.5)", core: "#fff8ed", symbol: "#9a5a12" },
  kanya: { rim: "#8a7a62", glow: "rgba(138, 122, 98, 0.38)", core: "#faf7f2", symbol: "#4a4032" },
  tula: { rim: "#c9a0a8", glow: "rgba(201, 160, 168, 0.4)", core: "#fff6f7", symbol: "#7a4a52" },
  vrishchika: { rim: "#8b4040", glow: "rgba(139, 64, 64, 0.45)", core: "#faf2f2", symbol: "#5c2828" },
  dhanu: { rim: "#9a6bb8", glow: "rgba(154, 107, 184, 0.42)", core: "#f8f2fc", symbol: "#5a3870" },
  makara: { rim: "#5a6470", glow: "rgba(90, 100, 112, 0.4)", core: "#f2f4f6", symbol: "#2e3640" },
  kumbha: { rim: "#4a8aa8", glow: "rgba(74, 138, 168, 0.42)", core: "#eef6fa", symbol: "#2a5568" },
  meena: { rim: "#6a8fc4", glow: "rgba(106, 143, 196, 0.42)", core: "#f0f5fc", symbol: "#3a5880" },
};

const SYMBOL_TO_KEY = new Map(
  Object.entries(RASHI_SYMBOL).map(([k, v]) => [v, k as RashiKey]),
);

export function normalizeRashiKey(raw: string | undefined | null): RashiKey | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if ((RASHI_KEYS as readonly string[]).includes(key)) return key as RashiKey;
  const fromSymbol = SYMBOL_TO_KEY.get(raw.trim());
  if (fromSymbol) return fromSymbol;
  return null;
}

export function rashiDisplay(key: RashiKey | null, moonSymbol?: string, moonLabel?: string) {
  const resolved = key ?? (moonSymbol ? normalizeRashiKey(moonSymbol) : null);
  const k = resolved ?? "karka";
  return {
    key: k,
    symbol: moonSymbol && moonSymbol.length <= 2 ? moonSymbol : RASHI_SYMBOL[k],
    label: moonLabel ?? k,
    theme: RASHI_THEME[k],
  };
}
