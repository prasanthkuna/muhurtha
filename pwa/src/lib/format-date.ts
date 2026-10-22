import { DateTime } from "luxon";
import type { AppLocale } from "./locale";

const INTL_LOCALE: Record<AppLocale, string> = { en: "en-IN", te: "te-IN", hi: "hi-IN" };

/** One date style everywhere: "Thu, 23 Oct 2026" (localized). Input is YYYY-MM-DD or ISO. */
export function formatDisplayDate(
  value: string | null | undefined,
  locale: AppLocale = "en",
  opts: { weekday?: boolean; year?: boolean } = {},
): string {
  if (!value) return "";
  const dt = DateTime.fromISO(value.slice(0, 10));
  if (!dt.isValid) return value;
  return dt.setLocale(INTL_LOCALE[locale] ?? "en-IN").toLocaleString({
    ...(opts.weekday === false ? {} : { weekday: "short" }),
    day: "numeric",
    month: "short",
    ...(opts.year === false ? {} : { year: "numeric" }),
  });
}

/** "Mon YYYY" for life chapter boundaries. */
export function formatMonthYear(value: string | null | undefined, locale: AppLocale = "en"): string {
  if (!value) return "";
  const dt = DateTime.fromISO(value.slice(0, 10));
  if (!dt.isValid) return value;
  return dt.setLocale(INTL_LOCALE[locale] ?? "en-IN").toLocaleString({
    month: "short",
    year: "numeric",
  });
}

/** Normalize a chapter period to "Jan 2019 – Jul 2020" whichever source shape it has. */
export function formatPeriod(
  label: string,
  start: string | undefined,
  end: string | undefined,
  locale: AppLocale = "en",
): string {
  if (start && end && /^\d{4}-\d{2}/.test(start) && /^\d{4}-\d{2}/.test(end)) {
    return `${formatMonthYear(start, locale)} – ${formatMonthYear(end, locale)}`;
  }
  return label.replace(/\s+-\s+/g, " – ");
}
