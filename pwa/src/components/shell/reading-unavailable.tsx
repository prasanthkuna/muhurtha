"use client";

import { PageHeader } from "@/components/editorial/page-header";
import { NavagrahaLoader } from "@/components/shell/navagraha-loader";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";

/**
 * What a tab shows when there is no reading to render: the Navagraha loader while the
 * reading is generating (it swaps itself out when ready), otherwise the error/unavailable
 * header. Never routes back to the birth form.
 */
export function ReadingUnavailable({
  title,
  fallback,
}: {
  title: string;
  fallback?: string;
}) {
  const { t } = useLocale();
  const { preparing, error, activeChartLabel, activeChartProfileId } = useAppData();

  if (preparing) {
    const name = activeChartProfileId && activeChartLabel ? activeChartLabel : null;
    return <NavagrahaLoader preparing={preparing} name={name} />;
  }

  return <PageHeader title={title} subtitle={error ?? fallback ?? t("ui.unavailable")} />;
}
