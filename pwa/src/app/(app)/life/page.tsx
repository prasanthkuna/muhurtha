"use client";

import Link from "next/link";
import { ChapterHeroCard } from "@/components/celestial/chapter-hero-card";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { ChevronRight } from "@/components/celestial/muh-icon";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import type { ChapterView } from "@/lib/types";
import { cn } from "@/components/ui/cn";

function SpineSection({
  label,
  chapters,
  isPro,
  t,
}: {
  label: string;
  chapters: ChapterView[];
  isPro: boolean;
  t: (key: string) => string;
}) {
  if (!chapters.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="sticky top-0 z-10 bg-canvas/95 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
        {label}
      </h2>
      <ol className="relative border-l border-line pl-4">
        {chapters.map((c) => {
          const locked = c.proLocked && !isPro;
          return (
            <li key={c.id} className="relative pb-4 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[5px] top-5 h-2 w-2 rounded-full ring-2 ring-canvas",
                  c.tense === "current" ? "bg-gold-accent" : "bg-line",
                )}
              />
              {locked ? (
                <div className="flex gap-3 rounded-xl border border-dashed border-line bg-paper/60 px-4 py-3 opacity-80">
                  <GrahaMedallion lord={c.mahadashaLord} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-ink">{c.periodLabel}</p>
                    <p className="text-xs text-ink-tertiary">{t("life.proLocked")}</p>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/life/${c.id}`}
                  className="group flex gap-3 rounded-xl border border-line bg-paper px-4 py-3 transition-colors hover:border-gold-accent/40"
                >
                  <GrahaMedallion lord={c.mahadashaLord} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-tertiary">{c.periodLabel}</p>
                    <p className="font-serif text-lg text-ink">{c.title}</p>
                    {c.tense === "current" ? (
                      <p className="mt-1 text-xs font-medium text-gold-text">{t("life.now")}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 self-center text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function LifeIndexPage() {
  const { t } = useLocale();
  const { views, loading, error, isPro } = useAppData();

  if (loading) return <LoadingState message={t("life.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("life.title")} subtitle={error ?? "Unavailable"} />;
  }

  const chapters = views.chapters();
  const past = chapters.filter((c) => c.tense === "past");
  const current = chapters.filter((c) => c.tense === "current");
  const future = chapters.filter((c) => c.tense === "future");
  const currentChapter = current[0];

  return (
    <div className="space-y-8" data-testid="life-loaded">
      <PageHeader eyebrow={t("life.atlasEyebrow")} title={t("life.atlasTitle")} />
      {currentChapter ? (
        <Link
          href={`/life/${currentChapter.id}`}
          className="block rounded-2xl transition-transform active:scale-[0.99]"
        >
          <ChapterHeroCard chapter={currentChapter} currentLabel={t("life.currentBadge")} />
        </Link>
      ) : null}
      <SpineSection label={t("life.spinePast")} chapters={past} isPro={isPro} t={t} />
      {currentChapter ? null : (
        <SpineSection label={t("life.spineCurrent")} chapters={current} isPro={isPro} t={t} />
      )}
      <SpineSection label={t("life.spineAhead")} chapters={future} isPro={isPro} t={t} />
    </div>
  );
}
