"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { TodayBondLine } from "@/components/bond/today-bond-line";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "@/components/celestial/muh-icon";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import { formatDisplayDate } from "@/lib/format-date";
import { CelestialHeaderCard } from "@/components/celestial/celestial-header-card";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { TodayTimingPanel } from "@/components/today/today-timing-panel";
import { ShareCardButton } from "@/components/share/share-button";
import { InstallChip } from "@/components/pwa/install-chip";
import { formatWindowRange } from "@/lib/format-time";
import { clip } from "@/lib/share/builders";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { isChildStage } from "@/lib/life-stage";
import { todayInTimezone } from "@/lib/local-date";
import type { TimingWindow, TodayPayload } from "@/lib/today-types";
import { scrubList, scrubStaleTimes, windowsSummary } from "@/lib/window-text";

/** How far the day browser goes from today (days). */
const MIN_OFFSET = -30;
const MAX_OFFSET = 60;

function shiftDate(base: string, days: number): string {
  const dt = DateTime.fromISO(base);
  return dt.isValid ? dt.plus({ days }).toISODate()! : base;
}

function HorizonCard({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  if (!headline && !body) return null;
  return (
    <ProseBlock>
      <p className="text-xs uppercase tracking-wide text-gold-text">{eyebrow}</p>
      {headline ? <p className="mt-2 font-serif text-lg text-ink">{headline}</p> : null}
      {body ? <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{body}</p> : null}
    </ProseBlock>
  );
}

function DayNav({
  offset,
  dateLabel,
  onPrev,
  onNext,
  onToday,
}: {
  offset: number;
  dateLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const { t } = useLocale();
  const btn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-gold-text transition-colors hover:border-gold-accent/40 active:bg-gold-wash/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-accent disabled:pointer-events-none disabled:opacity-35";
  const relative =
    offset === 0
      ? t("nav.today")
      : offset === 1
        ? t("today.tomorrow")
        : offset === -1
          ? t("today.yesterday")
          : null;
  return (
    <nav
      aria-label={t("today.dayNav")}
      className="flex items-center justify-between gap-2"
      data-testid="today-day-nav"
    >
      <button
        type="button"
        className={btn}
        onClick={onPrev}
        disabled={offset <= MIN_OFFSET}
        aria-label={t("today.prevDay")}
        data-testid="today-prev-day"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="truncate text-sm font-semibold text-ink">{dateLabel}</p>
        {offset === 0 ? (
          <p className="text-xs text-ink-tertiary">{relative}</p>
        ) : (
          <button
            type="button"
            onClick={onToday}
            className="mt-0.5 inline-flex min-h-8 items-center rounded-full border border-gold-accent/40 bg-gold-wash px-3 text-xs font-semibold text-gold-text"
            data-testid="today-back-to-today"
          >
            {relative ? `${relative} · ` : ""}
            {t("today.backToToday")}
          </button>
        )}
      </div>
      <button
        type="button"
        className={btn}
        onClick={onNext}
        disabled={offset >= MAX_OFFSET}
        aria-label={t("today.nextDay")}
        data-testid="today-next-day"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
    </nav>
  );
}

export default function TodayPage() {
  const { t, locale } = useLocale();
  const {
    views,
    today,
    loading,
    error,
    pack,
    fetchDay,
    profileTimezone,
    activeChartProfileId,
    activeLifeStage,
  } = useAppData();
  const childChart = isChildStage(activeLifeStage);
  const [outlookOpen, setOutlookOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [other, setOther] = useState<{
    key: string;
    data: TodayPayload | null;
    error: string | null;
  } | null>(null);

  const baseDate = today?.date || todayInTimezone(profileTimezone);
  const date = offset === 0 ? today?.date || pack?.date || baseDate : shiftDate(baseDate, offset);
  // Locale and chart are part of the key: a language switch refetches the browsed day too.
  const otherKey = `${locale}:${activeChartProfileId ?? "self"}:${date}`;

  useEffect(() => {
    if (offset === 0) return;
    let cancelled = false;
    fetchDay(date)
      .then((data) => {
        if (!cancelled) setOther({ key: otherKey, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setOther({
            key: otherKey,
            data: null,
            error: e instanceof Error ? e.message : t("ui.unavailable"),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // `t` changes with locale, which is already in otherKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, date, otherKey, fetchDay]);

  if (loading && !pack) return <LoadingState message={t("today.loading")} />;
  if (error || !views) {
    return <ReadingUnavailable title={t("nav.today")} />;
  }

  const isToday = offset === 0;
  const dayLoading = !isToday && other?.key !== otherKey;
  const dayError = !isToday && other?.key === otherKey ? other.error : null;
  const day: TodayPayload | null = isToday ? today : other?.key === otherKey ? other.data : null;

  // Pack prose for other days only when the pack has a card for that exact date (the generic
  // today_guidance fallback is not date-specific).
  const playbook = isToday ? views.playbookFor(date) : (views.todayCard(date) ?? null);

  const goodWindows: TimingWindow[] = day?.goodWindows ?? [];
  const cautionWindows: TimingWindow[] = day?.cautionWindows ?? [];
  const allWindows = [...goodWindows, ...cautionWindows];
  const scrub = (text: unknown) =>
    scrubStaleTimes(typeof text === "string" ? text : text == null ? "" : String(text), allWindows);

  // Any clock time in pack prose must match the live windows below; stale ones are dropped
  // and the summary falls back to a line built from those same windows.
  const rawAdvice =
    scrub(playbook?.one_line) || scrub(playbook?.oneLine) || scrub(day?.oneLine) || "";
  const fromWindows = windowsSummary(goodWindows, cautionWindows, {
    good: t("today.summaryGood"),
    caution: t("today.summaryCaution"),
  });
  const mainAdvice = rawAdvice || fromWindows;
  const cardMissing = !dayLoading && !playbook && !rawAdvice && !fromWindows;
  const detailedBody = scrub(playbook?.body);
  const cardTitle = playbook?.title?.toString() || (isToday ? t("nav.today") : t("today.dayTitle"));
  const dateLabel = date ? formatDisplayDate(date, locale) : t("nav.today");

  const betterFor = scrubList(
    (Array.isArray(playbook?.better_for) ? playbook.better_for.map(String) : null) ??
      day?.betterFor ??
      [],
    allWindows,
  );
  const beCareful = scrubList(
    (Array.isArray(playbook?.be_careful) ? playbook.be_careful.map(String) : null) ??
      day?.beCarefulWith ??
      [],
    allWindows,
  );
  const decorate = (list: TimingWindow[]) =>
    list.map((w) => ({ ...w, whyItWorks: scrub(w.whyItWorks) || undefined }));
  // "Your chapter": the AI-written current chapter from the reading; the engine's template
  // line is only a fallback for readings that have no chapter text yet.
  const aiChapter = views.currentChapter();
  const chapterTitle = aiChapter?.title && aiChapter.title !== aiChapter.periodLabel ? aiChapter.title : null;
  const chapterSummary = scrub(
    aiChapter?.highlight || day?.lifeChapter?.summary || day?.currentLifePeriod?.summary,
  );

  const week = views.horizon("week");
  const month = views.horizon("month");
  const year = views.horizon("year");
  const luck = views.natalLuck;

  const go = (next: number) => {
    setOffset(Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, next)));
  };

  return (
    <div className="space-y-6" data-testid="today-loaded" data-date={date}>
      <DayNav
        offset={offset}
        dateLabel={dateLabel}
        onPrev={() => go(offset - 1)}
        onNext={() => go(offset + 1)}
        onToday={() => go(0)}
      />

      {luck?.moonSignLabel || luck?.moonSymbol ? (
        <CelestialHeaderCard
          heroLabel={dateLabel}
          heroTitle={cardTitle}
          moonSignKey={luck.moonSignKey}
          moonSymbol={luck.moonSymbol}
          moonSignLabel={luck.moonSignLabel}
          heroSubline={mainAdvice || undefined}
        />
      ) : (
        <PageHeader eyebrow={dateLabel} title={cardTitle} subtitle={mainAdvice || undefined} />
      )}

      {isToday && !dayLoading ? <TodayBondLine /> : null}

      {!dayLoading && !dayError && !cardMissing ? (
        <div className="flex flex-wrap items-center justify-end gap-2" data-testid="today-share-row">
          {isToday ? <InstallChip className="mr-auto" /> : null}
          <ShareCardButton
            type="today"
            build={() => {
              const best = goodWindows[0];
              const short = (xs: string[]) => xs.filter((x) => x.length <= 28).slice(0, 2);
              return {
                title: clip(cardTitle, 88) ?? t("nav.today"),
                value: best ? `${t("today.firstGood")}: ${formatWindowRange(best.start, best.end)}` : undefined,
                subtitle: [dateLabel, luck?.moonSignLabel].filter(Boolean).join(" · "),
                body: clip(mainAdvice || detailedBody, 230),
                chips: short(betterFor),
                glyph: "sunrise",
              };
            }}
          />
          {isToday && goodWindows[0] ? (
            <ShareCardButton
              type="window"
              label={t("today.firstGood")}
              build={() => {
                const best = goodWindows[0];
                const caution = cautionWindows[0];
                return {
                  title: best.label || t("today.firstGood"),
                  value: formatWindowRange(best.start, best.end),
                  subtitle: dateLabel,
                  body: clip(scrub(best.whyItWorks) || mainAdvice, 200),
                  chips: caution
                    ? [`${t("today.firstCaution")} ${formatWindowRange(caution.start, caution.end)}`]
                    : undefined,
                  glyph: "goodWindow",
                  verdict: "good",
                };
              }}
            />
          ) : null}
        </div>
      ) : null}

      {dayLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label={t("today.dayLoading")}>
          <div className="h-24 animate-pulse rounded-2xl bg-line/40" />
          <div className="h-40 animate-pulse rounded-2xl bg-line/40" />
        </div>
      ) : null}

      {dayError ? (
        <ProseBlock className="border-dashed">
          <p className="text-sm text-ink-secondary">{dayError}</p>
        </ProseBlock>
      ) : null}

      {cardMissing ? (
        <ProseBlock className="border-dashed">
          <p className="font-serif text-lg text-ink">{t("ui.preparingTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{t("ui.preparingBody")}</p>
        </ProseBlock>
      ) : null}

      {dayLoading || dayError ? null : (
        <>
          {!day?.locationVerified ? (
            <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink-secondary">
              {t("today.locationHint")}{" "}
              <Link href="/settings" className="font-medium text-gold-text">
                {t("common.settings")}
              </Link>
            </p>
          ) : day.locationLabel ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
              <MapPin className="h-4 w-4 shrink-0 text-gold-text" aria-hidden />
              <span>
                {t("ui.timingsFor")} <span className="font-medium text-ink">{day.locationLabel}</span>
              </span>
            </p>
          ) : null}

          {isToday && chapterSummary ? (
            <ProseBlock>
              <p className="text-xs uppercase tracking-wide text-gold-text">{t("today.chapter")}</p>
              {chapterTitle ? <p className="mt-2 font-serif text-lg leading-snug text-ink">{chapterTitle}</p> : null}
              <p className="mt-2 text-sm text-ink-secondary">{chapterSummary}</p>
              <Link href={aiChapter ? `/life/${aiChapter.id}` : "/life"} className="mt-3 inline-block text-sm text-gold-text">
                {t("today.readLife")}
              </Link>
            </ProseBlock>
          ) : null}

          {detailedBody && detailedBody !== mainAdvice ? (
            <ProseBlock>
              <p className="text-sm leading-relaxed text-ink-secondary">{detailedBody}</p>
            </ProseBlock>
          ) : null}

          <TodayTimingPanel
            key={date}
            isToday={isToday}
            goodWindows={decorate(goodWindows)}
            cautionWindows={decorate(cautionWindows)}
            betterFor={betterFor}
            beCareful={beCareful}
          />
        </>
      )}

      {isToday ? (
        <div>
          <DisclosureButton open={outlookOpen} onToggle={() => setOutlookOpen((v) => !v)}>
            {outlookOpen ? t("today.hideOutlook") : t("today.outlook")}
          </DisclosureButton>
          {outlookOpen ? (
            <div className="mt-4 space-y-4">
              <HorizonCard eyebrow={t("today.week")} headline={week.headline} body={week.body} />
              <HorizonCard eyebrow={t("today.month")} headline={month.headline} body={month.body} />
              <HorizonCard eyebrow={t("today.year")} headline={year.headline} body={year.body} />
            </div>
          ) : null}
        </div>
      ) : null}

      <PrimaryButton href="/timing">{t("today.checkTiming")}</PrimaryButton>
      {childChart ? null : (
        <Link href="/decode" className="block text-center text-sm text-gold-text">
          {t("today.whyDecode")}
        </Link>
      )}
    </div>
  );
}
