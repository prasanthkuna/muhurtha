import type { AppLocale } from "@/lib/locale";
import { fill, nakLabel } from "@/lib/messages-bond";

/** One glyph per area; shared by Calendar cells, the Calendar legend and Today's calendar line. */
export const AREA_ICON: Record<string, string> = {
  money: "₹",
  travel: "✈",
  talks: "💬",
  love: "♥",
  health: "✚",
  rest: "☾",
  new_starts: "✦",
};
export const AREA_ORDER = ["new_starts", "love", "talks", "money", "travel", "health", "rest"] as const;

const TITHI_EN = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"];
const TITHI_TE = ["పాడ్యమి", "విదియ", "తదియ", "చవితి", "పంచమి", "షష్ఠి", "సప్తమి", "అష్టమి", "నవమి", "దశమి", "ఏకాదశి", "ద్వాదశి", "త్రయోదశి", "చతుర్దశి", "పౌర్ణమి", "అమావాస్య"];
const TITHI_HI = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पूर्णिमा", "अमावस्या"];

/** "Shukla Trayodashi" → localized; unknown strings pass through. */
export function tithiLabel(name: string | null | undefined, locale: AppLocale): string {
  const s = (name ?? "").trim();
  if (!s || locale === "en") return s;
  const [paksha, ...rest] = s.split(/\s+/);
  const base = rest.join(" ") || paksha;
  const i = TITHI_EN.indexOf(base);
  if (i < 0) return s;
  const names = locale === "te" ? TITHI_TE : TITHI_HI;
  // Purnima / Amavasya already name the fortnight.
  if (i >= 14) return names[i];
  const p = /^shukla$/i.test(paksha)
    ? locale === "te" ? "శుద్ధ" : "शुक्ल"
    : /^krishna$/i.test(paksha)
      ? locale === "te" ? "బహుళ" : "कृष्ण"
      : "";
  return p ? `${p} ${names[i]}` : names[i];
}

type T = (key: string) => string;

/** The day's one-line reason, from a fixed phrase bank (no LLM), naming the day's star. */
export function calWhyLine(
  d: { why?: string | null; nakshatra?: string | null },
  t: T,
  locale: AppLocale,
): string {
  if (!d.why) return "";
  const key = `cal.why.${d.why}`;
  const s = t(key);
  if (!s || s === key) return "";
  return fill(s, { star: nakLabel(d.nakshatra ?? "", locale) });
}
