"use client";

import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";

export function ChartProfileBanner() {
  const { t } = useLocale();
  const { activeChartProfileId, activeChartLabel, setActiveChartProfile } = useAppData();

  if (!activeChartProfileId || !activeChartLabel) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-gold-accent/30 bg-gold-wash/60 px-3 py-2 text-xs">
      <span className="text-ink-secondary">
        {t("chart.viewing")}{" "}
        <span className="font-semibold text-ink">{activeChartLabel}</span>
      </span>
      <button
        type="button"
        className="shrink-0 font-semibold text-gold-text"
        onClick={() => void setActiveChartProfile(null)}
      >
        {t("chart.backToMine")}
      </button>
    </div>
  );
}
