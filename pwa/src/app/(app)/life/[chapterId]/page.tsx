"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "@/components/celestial/muh-icon";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { PageHeader } from "@/components/editorial/page-header";
import { ChartDetail } from "@/components/v5/chart-detail";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { grahaName } from "@/design-system/graha";
import { formatPeriod } from "@/lib/format-date";
import { fill } from "@/lib/messages-bond";
import { ShareCardButton } from "@/components/share/share-button";
import { clip, grahaGlyph } from "@/lib/share/builders";
import type { ChapterView } from "@/lib/types";

/** How long one "write this chapter" request may take before we offer Retry. */
const WRITE_TIMEOUT_MS = 75_000;

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-secondary">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function agesText(c: ChapterView, t: (k: string) => string): string {
  if (c.ageFrom == null || c.ageTo == null) return "";
  return c.ageFrom === c.ageTo ? fill(t("life5.age"), { n: c.ageFrom }) : fill(t("life5.ages"), { from: c.ageFrom, to: c.ageTo });
}

type WriteState = "idle" | "writing" | "failed";

export default function LifeChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const { t, locale } = useLocale();
  const { views, loading, error, pack, isPro, refresh } = useAppData();
  const engineBody = useEngineBody();
  const [write, setWrite] = useState<WriteState>("idle");
  const asked = useRef<string | null>(null);
  const pendingChapter = views?.chapterById(params.chapterId);
  const needsWrite = Boolean(pendingChapter?.pending && isPro && !pendingChapter.proLocked);
  const readingId = pack?.readingVersion?.split(":")[0] ?? "";

  // Chapters not written yet (v4 on first open; v5 writes them all in the background) are
  // written on open. A slow or failed write never leaves a spinner: it ends in Retry.
  const writeChapter = useCallback(async (c: ChapterView) => {
    setWrite("writing");
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), WRITE_TIMEOUT_MS);
    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(engineBody("reading_chapter", { pack_id: readingId, chapter_id: c.sortOrder })),
        signal: ctl.signal,
      });
      const j = (await res.json().catch(() => ({}))) as { written?: number[] };
      if (res.ok && (j.written?.length ?? 0) > 0) {
        await refresh();
        setWrite("idle");
      } else {
        // Written meanwhile by the background fill: a refresh picks it up.
        await refresh();
        setWrite("failed");
      }
    } catch {
      setWrite("failed");
    } finally {
      window.clearTimeout(timer);
    }
  }, [engineBody, readingId, refresh]);

  useEffect(() => {
    if (!needsWrite || !readingId || !pendingChapter || asked.current === pendingChapter.id) return;
    asked.current = pendingChapter.id;
    void writeChapter(pendingChapter);
  }, [needsWrite, readingId, pendingChapter, writeChapter]);

  if (loading && !views) return <LoadingState message={t("life.chapterLoading")} />;
  if (error || !views) return <ReadingUnavailable title={t("life.chapterTitle")} />;

  const chapter = views.chapterById(params.chapterId);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("life.notFound")} subtitle={t("life.notFoundHint")} />
        <PrimaryButton href="/life">{t("life.backIndex")}</PrimaryButton>
      </div>
    );
  }

  const period = formatPeriod(chapter.periodLabel, chapter.periodStart, chapter.periodEnd, locale);
  const ages = agesText(chapter, t);
  const stage = chapter.lifeStage ? t(`stage.${chapter.lifeStage}`) : "";
  const v5 = Boolean(chapter.lifeStage || chapter.why || chapter.chapterDomains.length);
  const areas = chapter.chapterDomains.length
    ? chapter.chapterDomains.map((a) => t(`area5.${a}`)).filter((x) => !x.startsWith("area5."))
    : chapter.focusAreas;
  const frame = v5 && chapter.tense === "past" ? t("life5.pastFrame") : v5 && chapter.tense === "future" ? t("life5.futureFrame") : "";
  const showWriting = write === "writing" || (chapter.pending && write === "idle" && needsWrite);
  const detailRows = [
    { label: t("chart.md"), value: grahaName(chapter.mahadashaLord, locale), term: "mahadasha" },
    { label: t("chart.ad"), value: chapter.antardashaLord && chapter.antardashaLord !== chapter.mahadashaLord ? grahaName(chapter.antardashaLord, locale) : "", term: "antardasha" },
    { label: t("chart.period"), value: period },
  ];

  return (
    <article className="space-y-6" data-testid="chapter-page" data-tense={chapter.tense}>
      <Link
        href="/life"
        className="inline-flex items-center gap-1 text-sm font-medium text-gold-text transition-colors hover:text-gold-accent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        {t("life.backIndex")}
      </Link>

      <header className="flex gap-4">
        <GrahaMedallion lord={chapter.mahadashaLord} size="lg" shimmer={chapter.tense === "current"} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
            {[stage, ages].filter(Boolean).join(" · ") || period}
            {chapter.tense === "current" ? (
              <span className="ml-1.5 rounded-full bg-gold-wash px-2 py-0.5 text-gold-text">{t("life.now")}</span>
            ) : null}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">{chapter.title}</h1>
          {chapter.highlight ? <p className="mt-2 text-[15px] font-medium leading-relaxed text-ink">{chapter.highlight}</p> : null}
          {stage || ages ? <p className="mt-1 text-xs text-ink-tertiary">{period}</p> : null}
        </div>
      </header>

      {showWriting ? (
        <p data-testid="chapter-writing" className="animate-pulse text-sm text-gold-text">{t("life5.writing")}</p>
      ) : write === "failed" && chapter.pending ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-paper px-4 py-3" data-testid="chapter-write-failed">
          <p className="text-sm text-ink-secondary">{t("life5.writeFailed")}</p>
          <button
            type="button"
            onClick={() => void writeChapter(chapter)}
            className="min-h-9 rounded-lg bg-gold-accent px-4 text-sm font-semibold text-paper"
            data-testid="chapter-retry"
          >
            {t("state.retry")}
          </button>
        </div>
      ) : chapter.pending && !needsWrite ? (
        <p className="text-sm text-ink-tertiary">{t("life5.pending")}</p>
      ) : null}

      {frame ? <p className="text-xs italic leading-relaxed text-ink-tertiary" data-testid="chapter-frame">{frame}</p> : null}

      {chapter.body ? (
        <ProseBlock>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-ink-secondary" data-testid="chapter-body">{chapter.body}</p>
        </ProseBlock>
      ) : null}

      {chapter.why ? (
        <p className="rounded-xl border-l-2 border-gold-accent/60 bg-paper px-4 py-3 text-sm leading-relaxed text-ink-secondary" data-testid="chapter-why">
          <span className="font-semibold text-gold-text">{t("why.label")}: </span>
          {chapter.why}
        </p>
      ) : null}

      {chapter.action && chapter.tense !== "past" ? (
        <section className="rounded-2xl border border-gold-accent/40 bg-gold-wash/25 px-4 py-4" data-testid="chapter-action">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t("life5.action")}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{chapter.action}</p>
        </section>
      ) : null}

      {areas.length || (!v5 && (chapter.pressureThemes.length || chapter.domainLenses.length || chapter.transitionNote)) ? (
        <section className="space-y-4 rounded-2xl border border-line bg-paper p-4">
          <ChipRow label={v5 ? t("life5.areas") : t("life.focusAreas")} items={areas} />
          {!v5 ? <ChipRow label={t("life.pressure")} items={chapter.pressureThemes} /> : null}
          {!v5 ? <ChipRow label={t("life.lenses")} items={chapter.domainLenses} /> : null}
          {!v5 && chapter.transitionNote ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t("life.transition")}</p>
              <p className="mt-2 text-sm text-ink-secondary">{chapter.transitionNote}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <ChartDetail
        rows={detailRows}
        evidence={[
          ...(chapter.evidenceLine ? [chapter.evidenceLine] : []),
          ...(v5 && chapter.transitionNote ? [chapter.transitionNote] : []),
          ...(locale === "en" ? chapter.evidence : []),
        ]}
        screen="life"
        testId="chapter-detail"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <PrimaryButton href="/today">{t("life.openToday")}</PrimaryButton>
        <PrimaryButton
          href={`/ask?q=${encodeURIComponent(
            locale === "te"
              ? `${chapter.title} (${period}) దశలో నేను దేని మీద ఫోకస్ చేయాలి?`
              : locale === "hi"
                ? `${chapter.title} (${period}) के दौरान मुझे किस पर ध्यान देना चाहिए?`
                : `What should I focus on during ${chapter.title} (${period})?`,
          )}`}
        >
          {t("life.askChapter")}
        </PrimaryButton>
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <ShareCardButton
          type="chapter"
          build={() => ({
            title: chapter.title,
            value: period,
            subtitle: [chapter.mahadashaLord, chapter.antardashaLord].filter(Boolean).map((l) => grahaName(l, locale)).join(" · ") || undefined,
            body: clip(chapter.highlight || chapter.shareHook || (chapter.proLocked ? "" : chapter.body), 230),
            chips: areas.filter((x) => x.length <= 28).slice(0, 2),
            glyph: grahaGlyph(chapter.mahadashaLord),
          })}
        />
      </div>
    </article>
  );
}
