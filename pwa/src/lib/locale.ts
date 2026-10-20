export const APP_LOCALES = ["en", "te", "hi"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "muh_locale_v1";
export const CHART_PROFILE_STORAGE_KEY = "muh_active_chart_profile_v1";

export function normalizeLocale(raw: string | null | undefined): AppLocale {
  const code = (raw ?? "en").toLowerCase().slice(0, 2);
  if (code === "te" || code === "hi") return code;
  return "en";
}

export function localeLabel(locale: AppLocale): string {
  if (locale === "te") return "తెలుగు";
  if (locale === "hi") return "हिन्दी";
  return "English";
}
