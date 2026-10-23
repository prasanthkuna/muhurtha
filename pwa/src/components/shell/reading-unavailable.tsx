"use client";

import { Loader2, RefreshCw } from "@/components/celestial/muh-icon";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";

/**
 * What a tab shows when there is no reading to render: a live progress card while the
 * reading is generating (it swaps itself out when ready), otherwise the error/unavailable
 * header.
 */
export function ReadingUnavailable({
  title,
  fallback,
}: {
  title: string;
  fallback?: string;
}) {
  const { t } = useLocale();
  const { preparing, retryPreparing, error, activeChartLabel, activeChartProfileId } = useAppData();

  if (preparing) {
    const name = activeChartProfileId && activeChartLabel ? activeChartLabel : null;
    const pct =
      preparing.total > 0 ? Math.round((Math.min(preparing.done, preparing.total) / preparing.total) * 100) : 0;
    return (
      <div className="space-y-4" data-testid="reading-preparing">
        <PageHeader title={title} />
        <ProseBlock>
          <div className="flex items-start gap-3">
            {preparing.stalled ? (
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-gold-text" aria-hidden />
            ) : (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-gold-text" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg text-ink">
                {name ? `${t("ui.preparingFor")} ${name}` : t("ui.preparingReading")}
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                {preparing.stalled ? t("ui.preparingStalled") : t("ui.preparingAuto")}
              </p>
              {preparing.total > 0 ? (
                <div className="mt-3">
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-line/60"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={preparing.total}
                    aria-valuenow={preparing.done}
                    aria-label={t("ui.preparingReading")}
                  >
                    <div
                      className="h-full rounded-full bg-gold-accent transition-all duration-700"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-tertiary">
                    {t("ui.preparingStep")} {Math.min(preparing.done + 1, preparing.total)} / {preparing.total}
                  </p>
                </div>
              ) : null}
              {preparing.stalled ? (
                <button
                  type="button"
                  onClick={retryPreparing}
                  className="mt-3 inline-flex min-h-10 items-center rounded-full border border-gold-accent/40 bg-gold-wash px-4 text-sm font-semibold text-gold-text"
                >
                  {t("ui.retry")}
                </button>
              ) : null}
            </div>
          </div>
        </ProseBlock>
      </div>
    );
  }

  return <PageHeader title={title} subtitle={error ?? fallback ?? t("ui.unavailable")} />;
}
