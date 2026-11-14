import { DateTime } from "luxon";
import type { AppLocale } from "./locale";

const INTL_LOCALE: Record<AppLocale, string> = { en: "en-IN", te: "te-IN", hi: "hi-IN" };

/** en-IN spells September "Sept"; every other month is three letters, so use "Sep" everywhere. */
export function fixSept(s: string): string {
  return s.replace(/\bSept\b\.?/g, "Sep");
}

/** One date style everywhere: "Thu, 23 Oct 2026" (localized). Input is YYYY-MM-DD or ISO. */
export function formatDisplayDate(
  value: string | null | undefined,
  locale: AppLocale = "en",
  opts: { weekday?: boolean; year?: boolean } = {},
): string {
  if (!value) return "";
  const dt = DateTime.fromISO(value.slice(0, 10));
  if (!dt.isValid) return value;
  return fixSept(dt.setLocale(INTL_LOCALE[locale] ?? "en-IN").toLocaleString({
    ...(opts.weekday === false ? {} : { weekday: "short" }),
    day: "numeric",
    month: "short",
    ...(opts.year === false ? {} : { year: "numeric" }),
  }));
}

/** "Mon YYYY" for life chapter boundaries. */
export function formatMonthYear(value: string | null | undefined, locale: AppLocale = "en"): string {
  if (!value) return "";
  // Full ISO instants (chapter boundaries) are read in IST, the same months the engine labels use;
  // slicing the UTC date made e.g. 31 Mar 20:00Z (1 Apr IST) read "Mar".
  const dt = value.length > 10 ? DateTime.fromISO(value).setZone("Asia/Kolkata") : DateTime.fromISO(value);
  if (!dt.isValid) return value;
  return fixSept(dt.setLocale(INTL_LOCALE[locale] ?? "en-IN").toLocaleString({
    month: "short",
    year: "numeric",
  }));
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
  const dashed = label.replace(/\s+-\s+/g, " – ");
  return locale === "en" ? fixSept(dashed) : localizeMonthNames(dashed, locale);
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Translate English "Feb 2026" / bare "Feb" tokens in an engine label ("Feb – Dec 2026"). */
function localizeMonthNames(label: string, locale: AppLocale): string {
  const loc = INTL_LOCALE[locale] ?? "en-IN";
  return label.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?:\s+(\d{4}))?\b/g, (m, mon: string, year?: string) => {
    const month = MONTHS.indexOf(mon.toLowerCase()) + 1;
    if (month < 1) return m;
    const dt = DateTime.fromObject({ year: year ? Number(year) : 2000, month, day: 1 }).setLocale(loc);
    return year
      ? dt.toLocaleString({ month: "short", year: "numeric" })
      : dt.toLocaleString({ month: "short" });
  });
}
