import { OrbitBackdrop } from "@/components/celestial/orbit-backdrop";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import type { ChapterView } from "@/lib/types";

export function ChapterHeroCard({ chapter }: { chapter: ChapterView }) {
  const sub =
    chapter.mahadashaLord && chapter.antardashaLord
      ? `${chapter.mahadashaLord} · ${chapter.antardashaLord}`
      : chapter.phasePulse || undefined;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/25 px-5 py-5 shadow-[0_10px_32px_rgba(119,84,31,0.08)]">
      <OrbitBackdrop />
      <div className="relative flex gap-4">
        <GrahaMedallion lord={chapter.mahadashaLord} size="lg" shimmer />
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
            {chapter.periodLabel}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">{chapter.title}</h1>
          {chapter.highlight ? (
            <p className="mt-2 text-sm font-medium text-ink-secondary">{chapter.highlight}</p>
          ) : null}
          {sub ? <p className="mt-2 text-xs text-ink-tertiary">{sub}</p> : null}
          {chapter.tense === "current" ? (
            <span className="mt-2 inline-block rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold-text">
              Current chapter
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
