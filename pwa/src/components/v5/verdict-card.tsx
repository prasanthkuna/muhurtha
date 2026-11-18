"use client";

import { useLocale } from "@/context/locale-context";
import { AREA_ICON } from "@/lib/cal-text";
import { formatWindowRange } from "@/lib/format-time";
import type { TodayCalendar } from "@/lib/today-types";
import { cn } from "@/components/ui/cn";

const TONE_STYLE: Record<TodayCalendar["tone"], string> = {
  supportive: "border-success-ink/30 bg-success-ink/5",
  mixed: "border-gold-accent/40 bg-gold-wash/30",
  rest: "border-line bg-canvas",
};
const DOT: Record<TodayCalendar["tone"], string> = {
  supportive: "bg-success-ink",
  mixed: "bg-gold-accent",
  rest: "bg-ink-tertiary",
};

/**
 * The day verdict (the same call the Calendar, alerts and Ask use): tone, best time,
 * what it favours and what to go easy on, and the reason in plain words (no chart-detail drop-down: t97u).
 */
export function VerdictCard({
  cal,
  why,
  favours,
  avoid,
}: {
  cal: TodayCalendar;
  why?: string;
  /** Areas not already named in the headline (each area is said once per screen). */
  favours: string[];
  avoid: string | null;
}) {
  const { t } = useLocale();
  const best = cal.best;
  return (
    <section className={cn("rounded-2xl border px-4 py-4", TONE_STYLE[cal.tone])} data-testid="verdict-card" data-tone={cal.tone}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", DOT[cal.tone])} aria-hidden />
        <p className="text-sm font-semibold text-ink" data-testid="verdict-tone">{t(`verdict.${cal.tone}`)}</p>
      </div>
      <p className="mt-1 text-sm text-ink-secondary">{t(`verdict.${cal.tone}Sub`)}</p>
      {best ? (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[15px]" data-testid="verdict-best">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
            {cal.bestKind === "calm" ? t("verdict.calm") : t("verdict.best")}
          </span>
          <span className="font-semibold tabular-nums text-ink">{formatWindowRange(best.start, best.end)}</span>
        </p>
      ) : null}
      {favours.length || avoid ? (
        <p className="mt-2 text-sm text-ink" data-testid="today-calendar-tags">
          {favours.length ? (
            <>
              <span className="text-ink-tertiary">{t("cal.favours")}: </span>
              {favours.map((a) => `${AREA_ICON[a] ?? ""} ${t(`cal.area.${a}`)}`).join(" · ")}
            </>
          ) : null}
          {avoid ? (
            <>
              <span className="text-ink-tertiary">{favours.length ? " · " : ""}{t("cal.avoid")}: </span>
              {t(`cal.area.${avoid}`)}
            </>
          ) : null}
        </p>
      ) : null}
      {why ? <p className="mt-2 text-xs leading-relaxed text-ink-secondary" data-testid="verdict-why">{why}</p> : null}
      {cal.chandrashtama ? <p className="mt-1 text-xs text-warning-ink">{t("cal.chandrashtamaGloss")}</p> : null}
    </section>
  );
}
