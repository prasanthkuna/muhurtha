"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { ShareCardButton } from "@/components/share/share-button";
import { Glyph } from "@/components/ui/glyph";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { formatPeriod } from "@/lib/format-date";
import { formatWindowRange } from "@/lib/format-time";
import { clip, grahaGlyph, rashiGlyph } from "@/lib/share/builders";
import { CARD_LABELS, type CardData, type CardType } from "@/lib/share/card-types";
import type { GlyphName } from "@/lib/glyphs";

/** Share hub: every shareable card for the chart on screen, each opening the card sheet. */
export default function SharePage() {
  const { t, locale } = useLocale();
  const { views, today, loading, error, pack } = useAppData();

  if (loading && !views) return <LoadingState message={t("share.loading")} />;
  if (error || !views) return <ReadingUnavailable title={t("share.title")} />;

  const L = CARD_LABELS[locale === "te" || locale === "hi" ? locale : "en"];
  const luck = views.natalLuck;
  const chapter = views.currentChapter();
  const best = today?.goodWindows?.[0];

  const items: { type: CardType; glyph: GlyphName; title: string; build: () => CardData | null }[] = [];
  if (today) {
    items.push({
      type: "today",
      glyph: "sunrise",
      title: views.playbookFor(today.date)?.title?.toString() || today.oneLine || L.eyebrow.today,
      build: () => ({
        title: clip(views.playbookFor(today.date)?.title?.toString() || L.eyebrow.today, 88) ?? L.eyebrow.today,
        value: best ? `${t("today.firstGood")}: ${formatWindowRange(best.start, best.end)}` : undefined,
        subtitle: luck?.moonSignLabel || undefined,
        body: clip(views.playbookFor(today.date)?.one_line?.toString() || today.oneLine, 230),
        glyph: "sunrise",
      }),
    });
  }
  if (best) {
    items.push({
      type: "window",
      glyph: "goodWindow",
      title: formatWindowRange(best.start, best.end),
      build: () => ({
        title: best.label || t("today.firstGood"),
        value: formatWindowRange(best.start, best.end),
        body: clip(best.whyItWorks, 200),
        glyph: "goodWindow",
        verdict: "good",
      }),
    });
  }
  if (chapter) {
    items.push({
      type: "chapter",
      glyph: grahaGlyph(chapter.mahadashaLord),
      title: chapter.title,
      build: () => ({
        title: chapter.title,
        value: formatPeriod(chapter.periodLabel, chapter.periodStart, chapter.periodEnd, locale),
        subtitle: [chapter.mahadashaLord, chapter.antardashaLord].filter(Boolean).join(" · ") || undefined,
        body: clip(chapter.highlight || chapter.shareHook, 230),
        glyph: grahaGlyph(chapter.mahadashaLord),
      }),
    });
  }
  items.push({
    type: "decode",
    glyph: rashiGlyph(luck?.moonSignKey || luck?.moonSymbol) ?? "decode",
    title: views.displayHook || pack?.displayName || L.eyebrow.decode,
    build: () => ({
      title: clip(views.displayHook, 88) ?? L.eyebrow.decode,
      value: luck?.moonSignLabel || undefined,
      body: clip(views.identitySummary, 230),
      glyph: rashiGlyph(luck?.moonSignKey || luck?.moonSymbol) ?? "decode",
    }),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("share.eyebrow")} title={t("shareCard.title")} subtitle={t("shareCard.privacyNote")} />
      <ul className="space-y-3">
        {items.map((it) => (
          <li
            key={it.type}
            className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-wash text-gold-text">
              <Glyph name={it.glyph} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gold-text">
                {L.eyebrow[it.type]}
              </span>
              <span className="block truncate font-serif text-base text-ink">{it.title}</span>
            </span>
            <ShareCardButton type={it.type} build={it.build} />
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-ink-tertiary">{t("share.privacy")}</p>
    </div>
  );
}
