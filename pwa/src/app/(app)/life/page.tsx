"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { fill } from "@/lib/messages-bond";

/** How many past chapters stay visible before "Show earlier chapters". */
const RECENT_PAST = 2;

function agesLabel(c: ChapterView, t: (key: string) => string): string {
  if (c.ageFrom == null || c.ageTo == null) return "";
  if (c.ageFrom === c.ageTo) return fill(t("life.age"), { n: c.ageFrom });
  return fill(t("life.ages"), { from: c.ageFrom, to: c.ageTo });
}

/** Compact row for a whole mahadasha (or the early years): one line, no detail page. */
function SummaryRow({
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
  const lords = (c.mdLords.length ? c.mdLords : [c.mahadashaLord]).filter(Boolean);
  const eyebrow = [c.early ? t("life.earlyYears") : t("life.bigChapter"), agesLabel(c, t)]
    .filter(Boolean)
    .join(" · ");
  const label = c.early ? t("life.earlyYears") : t("life.bigChapter");
  // Older readings may title the row with the same generic label the eyebrow already shows.
  const showTitle = Boolean(c.title) && c.title.trim().toLowerCase() !== label.toLowerCase();
  const glyphs = (
    <span className="flex shrink-0 items-center gap-0.5 text-base leading-none text-gold-text/80" aria-hidden>
      {lords.slice(0, 4).map((l, i) => (
        <span key={`${l}-${i}`} className="sign-medallion-glyph">{grahaSymbol(l)}</span>
      ))}
    </span>
  );
  return (
    <li className="relative pb-3 last:pb-0" data-kind="summary" data-testid="life-summary-row">
      <span className="absolute -left-[20px] top-4 h-2 w-2 rounded-full border border-gold-accent/60 bg-canvas ring-2 ring-canvas" />
      {locked ? (
        <button
          type="button"
          onClick={() => onLocked(c)}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line bg-canvas px-3 py-2 text-left active:scale-[0.99]"
        >
          {glyphs}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">{eyebrow}</p>
            <p className="truncate text-xs text-ink-tertiary">{period}</p>
          </div>
          <Lock className="h-3.5 w-3.5 shrink-0 text-gold-text" aria-hidden />
        </button>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-line bg-canvas px-3 py-2">
          <span className="pt-0.5">{glyphs}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">{eyebrow}</p>
            {showTitle ? <p className="text-sm font-medium text-ink">{c.title}</p> : null}
            <p className="text-xs text-ink-tertiary">{period}</p>
            {c.highlight ? <p className="mt-1 line-clamp-2 text-xs text-ink-secondary">{c.highlight}</p> : null}
          </div>
        </div>
      )}
    </li>
  );
}

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
  const ages = agesLabel(c, t);
  return (
    <li className="relative pb-4 last:pb-0" id={isNow ? "current-chapter" : undefined} data-kind="detail">
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
            <p className="text-xs text-ink-tertiary">
              {period}
              {ages ? <span className="whitespace-nowrap"> · {ages}</span> : null}
            </p>
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

/** Floating "Now" pill: shows when the current chapter row is scrolled off screen; tap brings it back. */
function JumpToNow({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  const [dir, setDir] = useState<"up" | "down">("down");
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = document.getElementById("current-chapter");
      if (!el) return setShow(false);
      const r = el.getBoundingClientRect();
      const off = r.bottom < 0 || r.top > window.innerHeight;
      setShow(off && window.scrollY > 240);
      setDir(r.bottom < 0 ? "up" : "down");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      data-testid="life-jump-now"
      onClick={() => document.getElementById("current-chapter")?.scrollIntoView({ behavior: "smooth", block: "center" })}
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-full border border-gold-accent/50 bg-paper px-4 py-2 text-sm font-semibold text-gold-text shadow-lg active:scale-95"
    >
      {dir === "up" ? "↑" : "↓"} {label}
    </button>
  );
}

export default function LifeIndexPage() {
  const { t, locale } = useLocale();
  const { views, loading, error, isPro } = useAppData();
  const [lockedChapter, setLockedChapter] = useState<ChapterView | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const scrolled = useRef(false);

  // Deep links (?src=push_chapter, #now) land on the current chapter row.
  useEffect(() => {
    if (scrolled.current || !views) return;
    const wants = window.location.hash === "#now" || /src=push_chapter/.test(window.location.search);
    if (!wants) return;
    scrolled.current = true;
    requestAnimationFrame(() =>
      document.getElementById("current-chapter")?.scrollIntoView({ block: "center" }),
    );
  }, [views]);

  if (loading && !views) return <LoadingState message={t("life.loading")} />;
  if (error || !views) {
    return <ReadingUnavailable title={t("life.title")} />;
  }

  const chapters = views.chapters();
  const past = chapters.filter((c) => c.tense === "past");
  const current = chapters.filter((c) => c.tense === "current");
  const future = chapters.filter((c) => c.tense === "future");
  const currentChapter = current.find((c) => c.kind === "detail") ?? current[0];
  // The early-years summary always anchors the top of the past; detailed past rows fold.
  const pastSummary = past.filter((c) => c.kind === "summary");
  const pastDetail = past.filter((c) => c.kind !== "summary");
  const hiddenPast = showAllPast ? 0 : Math.max(0, pastDetail.length - RECENT_PAST);
  const visiblePast = pastDetail.slice(hiddenPast);
  const row = (c: ChapterView) =>
    c.kind === "summary" ? (
      <SummaryRow key={c.id} c={c} isPro={isPro} locale={locale} t={t} onLocked={setLockedChapter} />
    ) : (
      <ChapterRow key={c.id} c={c} isPro={isPro} locale={locale} t={t} onLocked={setLockedChapter} />
    );

  return (
    <div className="space-y-6" data-testid="life-loaded">
      <PageHeader eyebrow={t("life.atlasEyebrow")} title={t("life.atlasTitle")} className="mb-2" />
      <Link href="/decode" className="-mt-2 inline-flex text-sm font-semibold text-gold-text underline-offset-4 hover:underline" data-testid="life-open-decode">
        {t("life.openDecode")} →
      </Link>
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
          {pastSummary.map(row)}
          {hiddenPast > 0 ? (
            <li className="pb-3">
              <DisclosureButton open={false} onToggle={() => setShowAllPast(true)}>
                {fill(t("life.earlierCount"), { n: hiddenPast })}
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

      <JumpToNow label={t("life.jumpNow")} />

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
