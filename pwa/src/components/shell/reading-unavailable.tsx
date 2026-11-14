"use client";

import { PageHeader } from "@/components/editorial/page-header";
import { NavagrahaLoader } from "@/components/shell/navagraha-loader";
import { ErrorState, NotWrittenCard } from "@/components/v5/states";
import { useAppData } from "@/context/app-data-context";

/**
 * What a tab shows when there is no reading to render: the Navagraha loader (with the chart
 * facts already worked out) while the reading is written, the "write it in this language"
 * card when only another language exists, otherwise a friendly error with Retry.
 * Never routes back to the birth form.
 */
export function ReadingUnavailable({
  title,
}: {
  title: string;
  fallback?: string;
}) {
  const { preparing, notWritten, activeChartLabel, activeChartProfileId } = useAppData();

  if (preparing) {
    const name = activeChartProfileId && activeChartLabel ? activeChartLabel : null;
    return <NavagrahaLoader preparing={preparing} name={name} />;
  }
  if (notWritten) {
    return (
      <div className="space-y-2">
        <PageHeader title={title} />
        <NotWrittenCard />
      </div>
    );
  }
  return <ErrorState title={title} />;
}
