"use client";

import Link from "next/link";
import { useState } from "react";
import { ChapterHeroCard } from "@/components/celestial/chapter-hero-card";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { ChevronRight, Lock } from "@/components/celestial/muh-icon";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { UpgradeSheet } from "@/components/life/upgrade-sheet";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { grahaSymbol, normalizeGraha } from "@/design-system/graha";
import { formatPeriod } from "@/lib/format-date";
import type { AppLocale } from "@/lib/locale";
import type { ChapterView } from "@/lib/types";
import { cn } from "@/components/ui/cn";

/** How many past chapters stay visible before "Show earlier chapters". */
const RECENT_PAST = 2;

function ChapterRow({
  c,
  isPro,
  locale,
  t,
  onLocked,
}: {
  c: ChapterView;
  isPro: boolean;
  locale: AppLocale;
  t: (key: string) => string;
  onLocked: (c: ChapterView) => void;
}) {
  const locked = c.proLocked && !isPro;
  const period = formatPeriod(c.periodLabel, c.periodStart, c.periodEnd, locale);
  const isNow = c.tense === "current";
  return (
    <li className="relative pb-4 last:pb-0" id={isNow ? "current-chapter" : undefined}>
      <span
        className={cn(
          "absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas",
          isNow ? "bg-gold-accent" : "bg-line",
        )}
      />
      {locked ? (
        <button
          type="button"
          onClick={() => onLocked(c)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-gold-accent/40 bg-paper/70 px-4 py-3 text-left transition-transform active:scale-[0.99]"
        >
          <GrahaMedallion lord={c.mahadashaLord} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-tertiary">{period}</p>
            <p className="text-sm font-medium text-ink">{t("ui.lockedTap")}</p>
          </div>
          <Lock className="h-4 w-4 shrink-0 text-gold-text" aria-hidden />
        </button>
      ) : (
        <Link
          href={`/life/${c.id}`}
          prefetch
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-paper px-4 py-3 transition-[transform,border-color] hover:border-gold-accent/40 active:scale-[0.99] active:border-gold-accent/60",
            isNow ? "border-gold-accent/50 ring-1 ring-gold-accent/25" : "border-line",
          )}
        >
          <GrahaMedallion lord={c.mahadashaLord} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-tertiary">{period}</p>
            <p className="font-serif text-lg text-ink">{c.title}</p>
            {isNow ? <p className="mt-1 text-xs font-semibold text-gold-text">{t("life.now")}</p> : null}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gold-text/80" aria-hidden />
        </Link>
      )}
    </li>
  );
}

function SpineSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="sticky top-0 z-20 -mx-5 border-b border-line bg-canvas px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
        {label}
      </h2>
      <ol className="relative ml-1 border-l border-line pl-4">{children}</ol>
    </section>
  );
}

function GlyphLegend({ chapters, t }: { chapters: ChapterView[]; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const lords = Array.from(
    new Set(chapters.map((c) => normalizeGraha(c.mahadashaLord)).filter((g) => g !== "unknown")),
  );
  if (lords.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-2">
      <DisclosureButton open={open} onToggle={() => setOpen((v) => !v)}>
        {t("ui.legendTitle")}
      </DisclosureButton>
      {open ? (
        <div className="pb-2">
          <p className="text-sm text-ink-secondary">{t("ui.legendHint")}</p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {lords.map((g) => (
              <li key={g} className="flex items-center gap-2 text-sm text-ink">
                <span className="sign-medallion-glyph text-lg text-gold-text" aria-hidden>
                  {grahaSymbol(g)}
                </span>
                {t(`ui.g_${g}`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function LifeIndexPage() {
  const { t, locale } = useLocale();
  const { views, loading, error, isPro } = useAppData();
  const [lockedChapter, setLockedChapter] = useState<ChapterView | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  if (loading && !views) return <LoadingState message={t("life.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("life.title")} subtitle={error ?? t("ui.unavailable")} />;
  }

  const chapters = views.chapters();
  const past = chapters.filter((c) => c.tense === "past");
  const current = chapters.filter((c) => c.tense === "current");
  const future = chapters.filter((c) => c.tense === "future");
  const currentChapter = current[0];
  const hiddenPast = showAllPast ? 0 : Math.max(0, past.length - RECENT_PAST);
  const visiblePast = past.slice(hiddenPast);
  const row = (c: ChapterView) => (
    <ChapterRow key={c.id} c={c} isPro={isPro} locale={locale} t={t} onLocked={setLockedChapter} />
  );

  return (
    <div className="space-y-6" data-testid="life-loaded">
      <PageHeader eyebrow={t("life.atlasEyebrow")} title={t("life.atlasTitle")} className="mb-2" />
      {currentChapter ? (
        <Link
          href={`/life/${currentChapter.id}`}
          prefetch
          className="block rounded-2xl transition-transform active:scale-[0.99]"
        >
          <ChapterHeroCard
            chapter={{
              ...currentChapter,
              periodLabel: formatPeriod(
                currentChapter.periodLabel,
                currentChapter.periodStart,
                currentChapter.periodEnd,
                locale,
              ),
            }}
            currentLabel={t("life.currentBadge")}
          />
        </Link>
      ) : null}

      <GlyphLegend chapters={chapters} t={t} />

      {past.length > 0 || current.length > 0 ? (
        <SpineSection label={`${t("life.spinePast")} · ${t("life.spineCurrent")}`}>
          {hiddenPast > 0 ? (
            <li className="pb-3">
              <DisclosureButton open={false} onToggle={() => setShowAllPast(true)}>
                {`+${hiddenPast} ${t("life.spinePast")}`}
              </DisclosureButton>
            </li>
          ) : null}
          {visiblePast.map(row)}
          {current.map(row)}
        </SpineSection>
      ) : null}

      {future.length > 0 ? (
        <SpineSection label={t("life.spineAhead")}>{future.map(row)}</SpineSection>
      ) : null}

      <UpgradeSheet
        open={lockedChapter !== null}
        onClose={() => setLockedChapter(null)}
        chapterLabel={
          lockedChapter
            ? formatPeriod(lockedChapter.periodLabel, lockedChapter.periodStart, lockedChapter.periodEnd, locale)
            : undefined
        }
      />
    </div>
  );
}
