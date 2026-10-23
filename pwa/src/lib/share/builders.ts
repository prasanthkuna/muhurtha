import { RASHI_KEYS, normalizeRashiKey } from "@/design-system/rashi";
import { RASHI_GLYPHS, grahaGlyph, purposeGlyph, type GlyphName } from "@/lib/glyphs";
import type { CardVerdict } from "@/lib/share/card-types";

export function rashiGlyph(keyOrSymbol: string | null | undefined): GlyphName | undefined {
  const key = normalizeRashiKey(keyOrSymbol ?? "");
  if (!key) return undefined;
  const i = RASHI_KEYS.indexOf(key);
  return i >= 0 ? RASHI_GLYPHS[i] : undefined;
}

export function verdictFromStatus(status: string | null | undefined): CardVerdict {
  const s = (status ?? "").toLowerCase();
  if (/(not_matched|avoid|poor|weak|unfavou?rable)/.test(s)) return "avoid";
  if (/(^matched$|excellent|good|favou?rable|strong|best|auspicious)/.test(s)) return "good";
  return "mixed";
}

export { grahaGlyph, purposeGlyph };

/** First sentence(s) up to ~max chars, for card bodies. */
export function clip(text: string | null | undefined, max = 220): string | undefined {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("। "), cut.lastIndexOf("? "));
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}
