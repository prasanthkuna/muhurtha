"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";

export default function LifeChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const { views, loading, error } = useAppData();

  if (loading) return <LoadingState message="Opening chapter…" />;
  if (error || !views) {
    return <PageHeader title="Chapter" subtitle={error ?? "Unavailable"} />;
  }

  const chapter = views.chapterById(params.chapterId);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <PageHeader title="Chapter not found" subtitle="Return to the life index." />
        <PrimaryButton href="/life">Life map</PrimaryButton>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <Link href="/life" className="text-sm text-gold-text">
        ← All chapters
      </Link>
      <PageHeader
        eyebrow={chapter.periodLabel}
        title={chapter.title}
        subtitle={chapter.highlight}
      />
      <ProseBlock>
        <p className="whitespace-pre-wrap text-ink-secondary">{chapter.body}</p>
      </ProseBlock>
      {chapter.evidenceLine ? (
        <details className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-gold-text">
            Traditional basis
          </summary>
          <p className="mt-2 text-ink-secondary">{chapter.evidenceLine}</p>
          {chapter.mahadashaLord ? (
            <p className="mt-2 text-xs text-ink-tertiary">
              {chapter.mahadashaLord} · {chapter.antardashaLord}
            </p>
          ) : null}
        </details>
      ) : null}
      <PrimaryButton href={`/ask?q=${encodeURIComponent(`What should I focus on during ${chapter.periodLabel}?`)}`}>
        Ask about this chapter
      </PrimaryButton>
    </article>
  );
}
