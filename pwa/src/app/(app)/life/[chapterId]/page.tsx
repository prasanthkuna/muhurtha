"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChapterHeroCard } from "@/components/celestial/chapter-hero-card";
import { ChevronLeft } from "@/components/celestial/muh-icon";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { PageHeader } from "@/components/editorial/page-header";
import { WhyLink, WhySheet } from "@/components/explainer/why-sheet";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { explainerForGraha } from "@/lib/jyotish-explainers";
import { formatPeriod } from "@/lib/format-date";

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-secondary"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LifeChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const { t, locale } = useLocale();
  const { views, loading, error } = useAppData();
  const [whyOpen, setWhyOpen] = useState(false);

  if (loading && !views) return <LoadingState message={t("life.chapterLoading")} />;
  if (error || !views) {
    return <ReadingUnavailable title={t("life.chapterTitle")} />;
  }

  const chapter = views.chapterById(params.chapterId);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("life.notFound")} subtitle={t("life.notFoundHint")} />
        <PrimaryButton href="/life">{t("life.backIndex")}</PrimaryButton>
      </div>
    );
  }

  const lordExplainer =
    explainerForGraha(chapter.mahadashaLord, locale) ??
    explainerForGraha(chapter.antardashaLord, locale);

  return (
    <article className="space-y-6">
      <Link
        href="/life"
        className="inline-flex items-center gap-1 text-sm font-medium text-gold-text transition-colors hover:text-gold-accent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        {t("life.backIndex")}
      </Link>

      <ChapterHeroCard
        chapter={{
          ...chapter,
          periodLabel: formatPeriod(chapter.periodLabel, chapter.periodStart, chapter.periodEnd, locale),
        }}
        currentLabel={t("life.currentBadge")}
      />

      <ProseBlock>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-ink-secondary">{chapter.body}</p>
      </ProseBlock>

      <section className="space-y-4 rounded-2xl border border-line bg-paper p-4">
        <ChipRow label={t("life.focusAreas")} items={chapter.focusAreas} />
        <ChipRow label={t("life.pressure")} items={chapter.pressureThemes} />
        <ChipRow label={t("life.lenses")} items={chapter.domainLenses} />
        {chapter.transitionNote ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
              {t("life.transition")}
            </p>
            <p className="mt-2 text-sm text-ink-secondary">{chapter.transitionNote}</p>
          </div>
        ) : null}
      </section>

      {chapter.evidenceLine ? (
        <details className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-gold-text">
            {t("life.traditionalBasis")}
          </summary>
          <p className="mt-2 text-ink-secondary">{chapter.evidenceLine}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-ink-tertiary">
              {chapter.mahadashaLord} · {chapter.antardashaLord}
            </p>
            {lordExplainer ? <WhyLink onClick={() => setWhyOpen(true)} /> : null}
          </div>
        </details>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <PrimaryButton href="/today">{t("life.openToday")}</PrimaryButton>
        <PrimaryButton
          href={`/ask?q=${encodeURIComponent(`What should I focus on during ${chapter.periodLabel}?`)}`}
        >
          {t("life.askChapter")}
        </PrimaryButton>
      </div>

      <WhySheet open={whyOpen} onClose={() => setWhyOpen(false)} entry={lordExplainer} />
    </article>
  );
}
