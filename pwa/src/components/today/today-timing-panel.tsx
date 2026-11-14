"use client";

import { useState } from "react";
import { WindowPillRow, WindowTimePill } from "@/components/editorial/window-time-pill";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import { useLocale } from "@/context/locale-context";
import { formatWindowRange } from "@/lib/format-time";
import type { TimingWindow } from "@/lib/today-types";

export function TodayTimingPanel({
  isToday = true,
  goodWindows,
  cautionWindows,
  betterFor,
  beCareful,
  allPassed = false,
  onTomorrow,
  best = null,
}: {
  /** The verdict's best window (Calendar/alerts name the same one); label = "Best time"/"Calmest time". */
  best?: TimingWindow | null;
  isToday?: boolean;
  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterFor: string[];
  beCareful: string[];
  /** Today's windows have all ended (only past ones existed). */
  allPassed?: boolean;
  onTomorrow?: () => void;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const same = (a?: TimingWindow | null, b?: TimingWindow | null) => Boolean(a && b) && formatWindowRange(a!.start, a!.end) === formatWindowRange(b!.start, b!.end);
  const bestMatch = best ? goodWindows.find((w) => same(w, best)) : undefined;
  const bestWin = best ? { ...best, label: bestMatch?.label, whyItWorks: bestMatch?.whyItWorks } : null;
  // "Next good time" only when it comes before the best one and is a different slot.
  const first = goodWindows[0];
  const nextGood = bestWin && (same(first, bestWin) || !first || first.start >= bestWin.start) ? undefined : first;
  const nextCaution = cautionWindows[0];

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper px-4 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
          {isToday ? t("today.clockTitle") : t("today.clockTitleDay")}
        </p>
      </div>

      {bestWin || nextGood || nextCaution ? (
        <div className="space-y-3">
          {bestWin ? (
            <div data-testid="today-best-window">
              <p className="mb-2 text-xs font-semibold text-success-ink">{best?.label}</p>
              <WindowTimePill window={bestWin} tone="good" />
              {bestWin.whyItWorks ? <p className="mt-2 text-xs leading-relaxed text-ink-tertiary">{bestWin.whyItWorks}</p> : null}
            </div>
          ) : null}
          {nextGood ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-success-ink">{isToday ? t("today.nextGood") : t("today.firstGood")}</p>
              <WindowTimePill window={nextGood} tone="good" />
              {nextGood.whyItWorks ? (
                <p className="mt-2 text-xs leading-relaxed text-ink-tertiary">{nextGood.whyItWorks}</p>
              ) : null}
            </div>
          ) : null}
          {nextCaution ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-warning-ink">{isToday ? t("today.nextCaution") : t("today.firstCaution")}</p>
              <WindowTimePill window={nextCaution} tone="caution" />
            </div>
          ) : null}
        </div>
      ) : allPassed ? (
        <div className="space-y-2" data-testid="today-windows-done">
          <p className="text-sm text-ink-secondary">{t("today.windowsDone")}</p>
          {onTomorrow ? (
            <button type="button" onClick={onTomorrow} className="min-h-9 text-sm font-medium text-gold-text">
              {t("today.seeTomorrow")} →
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">{t("today.clockMissing")}</p>
      )}

      {(betterFor.length > 0 || beCareful.length > 0) && (
        <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          {betterFor.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-success-ink">{t("today.betterFor")}</p>
              <ul className="mt-1.5 list-inside list-disc text-sm text-ink-secondary">
                {betterFor.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {beCareful.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-warning-ink">{t("today.beCareful")}</p>
              <ul className="mt-1.5 list-inside list-disc text-sm text-ink-secondary">
                {beCareful.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {(goodWindows.length > 1 || cautionWindows.length > 0) && (
        <>
          <DisclosureButton open={expanded} onToggle={() => setExpanded((v) => !v)}>
            {expanded
              ? t("today.hideTimeline")
              : isToday
                ? t("today.showTimeline")
                : t("today.showTimelineDay")}
          </DisclosureButton>
          {expanded ? (
            <div className="space-y-4">
              {goodWindows.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-success-ink">
                    {t("today.allGood")}
                  </p>
                  <WindowPillRow windows={goodWindows} tone="good" limit={6} />
                </div>
              ) : null}
              {cautionWindows.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-warning-ink">
                    {t("today.allCaution")}
                  </p>
                  <WindowPillRow windows={cautionWindows} tone="caution" limit={6} />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

    </section>
  );
}
