"use client";

import Link from "next/link";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData } from "@/context/app-data-context";
import type { ChapterView } from "@/lib/types";
import { cn } from "@/components/ui/cn";

function SpineSection({
  label,
  chapters,
  isPro,
}: {
  label: string;
  chapters: ChapterView[];
  isPro: boolean;
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
                  "absolute -left-[5px] top-2 h-2 w-2 rounded-full ring-2 ring-canvas",
                  c.tense === "current" ? "bg-gold-accent" : "bg-line",
                )}
              />
              {locked ? (
                <div className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-3 opacity-80">
                  <p className="text-sm font-medium text-ink">{c.periodLabel}</p>
                  <p className="text-xs text-ink-tertiary">Pro chapter — unlock in full app</p>
                </div>
              ) : (
                <Link
                  href={`/life/${c.id}`}
                  className="block rounded-xl border border-line bg-paper px-4 py-3 transition-colors hover:border-gold-accent/40"
                >
                  <p className="text-xs text-ink-tertiary">{c.periodLabel}</p>
                  <p className="font-serif text-lg text-ink">{c.title}</p>
                  {c.tense === "current" ? (
                    <p className="mt-1 text-xs font-medium text-gold-text">Now</p>
                  ) : null}
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
  const { views, loading, error, isPro } = useAppData();

  if (loading) return <LoadingState message="Loading life map…" />;
  if (error || !views) {
    return <PageHeader title="Life map" subtitle={error ?? "Unavailable"} />;
  }

  const chapters = views.chapters();
  const past = chapters.filter((c) => c.tense === "past");
  const current = chapters.filter((c) => c.tense === "current");
  const future = chapters.filter((c) => c.tense === "future");

  return (
    <div className="space-y-8" data-testid="life-loaded">
      <PageHeader
        eyebrow="Life atlas"
        title="Chapters through time"
        subtitle="Tap a period — full chapter on its own page. No accordion clutter."
      />
      <SpineSection label="Past" chapters={past} isPro={isPro} />
      <SpineSection label="Current" chapters={current} isPro={isPro} />
      <SpineSection label="Ahead" chapters={future} isPro={isPro} />
    </div>
  );
}
