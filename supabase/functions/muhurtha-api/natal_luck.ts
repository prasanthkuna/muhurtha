import {
  type AppLocale,
  luckyColoursLocalized,
  luckyDaysLocalized,
  parseLuckyNumbers,
  rashiDisplay,
  type SignDisplay,
} from "./vedic_labels.ts";

export type NatalLuckColour = {
  key: string;
  label: string;
  hex: string;
};

export type NatalLuck = {
  moon_sign_key: string;
  moon_sign_label: string;
  moon_symbol: string;
  lucky_numbers: string[];
  lucky_days: string[];
  lucky_colours: NatalLuckColour[];
};

export function attachNatalLuckToContent(
  content: { [key: string]: unknown },
  moonSign: SignDisplay | null | undefined,
  locale: AppLocale,
): void {
  const luck = buildNatalLuck(moonSign, locale);
  if (luck) {
    content.natal_luck = luck;
  }
}

export function buildNatalLuck(
  moonSign: SignDisplay | null | undefined,
  locale: AppLocale,
): NatalLuck | null {
  if (!moonSign?.key) return null;
  const display = rashiDisplay(moonSign.key, locale);
  return {
    moon_sign_key: display.key,
    moon_sign_label: display.label,
    moon_symbol: display.symbol,
    lucky_numbers: parseLuckyNumbers(display.luckyNumbers),
    lucky_days: luckyDaysLocalized(display.luckyDays, locale),
    lucky_colours: luckyColoursLocalized(display.goodColors, locale),
  };
}
