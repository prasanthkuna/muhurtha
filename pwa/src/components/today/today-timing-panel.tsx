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
}: {
  isToday?: boolean;
  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterFor: string[];
  beCareful: string[];
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const nextGood = goodWindows[0];
  const nextCaution = cautionWindows[0];

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper px-4 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
          {isToday ? t("today.clockTitle") : t("today.clockTitleDay")}
        </p>
      </div>

      {nextGood || nextCaution ? (
        <div className="space-y-3">
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

      {nextGood && !expanded ? (
        <p className="text-xs text-ink-tertiary">
          {t("today.generalPanchanga")}: {formatWindowRange(nextGood.start, nextGood.end)}
        </p>
      ) : null}
    </section>
  );
}
