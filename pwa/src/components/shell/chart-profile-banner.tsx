"use client";

import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { initialOf } from "@/lib/chart-profiles";

/** Always-visible reminder (every tab) that the reading belongs to someone else. */
export function ChartProfileBanner() {
  const { t } = useLocale();
  const { activeChartProfileId, activeChartLabel, chartProfiles, setActiveChartProfile } =
    useAppData();

  if (!activeChartProfileId) return null;
  const label =
    activeChartLabel || chartProfiles.find((p) => p.id === activeChartProfileId)?.label || "…";

  return (
    <div
      className="sticky top-0 z-40 -mx-5 mb-3 flex items-center justify-between gap-2 border-y border-gold-accent/40 bg-gold-wash px-5 py-2 text-sm shadow-sm"
      role="status"
      data-testid="chart-viewing-banner"
    >
      <span className="flex min-w-0 items-center gap-2 text-ink-secondary">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-accent text-xs font-semibold text-paper"
          aria-hidden
        >
          {initialOf(label)}
        </span>
        <span className="truncate">
          {t("chart.viewing")} <span className="font-semibold text-ink">{label}</span>
        </span>
      </span>
      <button
        type="button"
        className="min-h-9 shrink-0 rounded-full border border-gold-accent/50 bg-paper px-3 text-xs font-semibold text-gold-text"
        onClick={() => void setActiveChartProfile(null)}
      >
        {t("chart.backToMine")}
      </button>
    </div>
  );
}
