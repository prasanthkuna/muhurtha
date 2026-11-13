"use client";

import { ExplainRow } from "@/components/explainer/explain-sheet";
import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { ChevronRight } from "@/components/celestial/muh-icon";
import { CelestialHeaderCard } from "@/components/celestial/celestial-header-card";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { LuckyStrip } from "@/components/editorial/lucky-strip";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { isChildStage } from "@/lib/life-stage";
import { ShareCardButton } from "@/components/share/share-button";
import { AfterReadingInstall } from "@/components/pwa/after-reading-install";
import { clip, rashiGlyph } from "@/lib/share/builders";
import { fill, nakLabel } from "@/lib/messages-bond";
import { calWhyLine } from "@/lib/cal-text";

const ADULT_ONLY_DOMAINS = new Set(["career", "money", "business", "relationship"]);

export default function DecodePage() {
  const { t, locale } = useLocale();
  const { views, loading, error, pack, preparing, activeLifeStage, today, userId } = useAppData();

  if (loading && !pack) return <LoadingState message={t("decode.opening")} />;
  if (preparing && (!views || !pack)) return <ReadingUnavailable title={t("nav.decode")} />;
  if (error || !views || !pack) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("nav.decode")} subtitle={error ?? t("decode.unavailable")} />
        <Link href="/welcome" className="text-sm font-medium text-gold-text underline-offset-2 hover:underline">
          {t("decode.backWelcome")}
        </Link>
      </div>
    );
  }

  // A child's chart has no career/money/business/romance reading: hide those sections.
  const domains = isChildStage(activeLifeStage)
    ? views.domainReports().filter((d) => !ADULT_ONLY_DOMAINS.has(d.key))
    : views.domainReports();
  const luck = views.natalLuck;
  const birthStar = today?.birthStar ? nakLabel(today.birthStar, locale) : null;
  const todayWhy = today?.calendar?.why
    ? calWhyLine({ why: today.calendar.why, nakshatra: today.dayStar ?? null, natal_star: today.calendar.natalStar ?? null }, t, locale)
    : "";

  return (
    <div className="space-y-6" data-testid="decode-loaded">
      <div data-testid="decode-hero" className="space-y-3">
        {luck?.moonSignLabel || luck?.moonSymbol ? (
          <CelestialHeaderCard
            heroLabel={t("decode.hero.eyebrow")}
            heroTitle={views.displayHook}
            moonSignKey={luck.moonSignKey}
            moonSymbol={luck.moonSymbol}
            moonSignLabel={luck.moonSignLabel}
            heroSubline={views.identitySummary}
          >
            <HeroChips birthStar={birthStar} moonSign={luck.moonSignLabel} t={t} />
          </CelestialHeaderCard>
        ) : (
          <>
            <PageHeader
              eyebrow={t("decode.hero.eyebrow")}
              title={views.displayHook}
              subtitle={views.identitySummary}
            />
            <HeroChips birthStar={birthStar} moonSign={null} t={t} />
          </>
        )}

        <ExplainRow
          screen="decode"
          className=""
          terms={[
            { term: "nakshatra", value: typeof birthStar === "string" ? birthStar : undefined },
            { term: "moon_sign" },
            { term: "mahadasha" },
            { term: "life_chapter" },
          ]}
        />

        {today && !isChildStage(activeLifeStage) ? (
          <Link
            href="/today"
            data-testid="decode-today"
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-gold-accent/40"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">{t("decode.hero.todayTitle")}</p>
              {/* The day's reason (Calendar phrase bank) and one action, never Today's own subtitle. */}
              <p className="mt-1 line-clamp-2 text-[15px] font-medium text-ink" data-testid="decode-today-why">
                {today.birthStarToday ? t("decode.hero.birthStarDay") : todayWhy || (today.dayStar ? fill(t("decode.hero.todayStar"), { star: nakLabel(today.dayStar, locale) }) : t("decode.hero.openToday"))}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-gold-text" aria-hidden />
          </Link>
        ) : null}
      </div>

      <AfterReadingInstall userId={userId} />

      <div className="flex justify-end">
        <ShareCardButton
          type="decode"
          build={() => ({
            title: clip(views.displayHook, 88) ?? t("nav.decode"),
            value: luck?.moonSignLabel || undefined,
            subtitle: t("decode.janmaLabel"),
            body: clip(views.identitySummary, 230),
            chips: views.strengths.filter((x) => x.length <= 28).slice(0, 2),
            glyph: rashiGlyph(luck?.moonSignKey || luck?.moonSymbol) ?? "decode",
          })}
        />
      </div>

      {luck ? <LuckyStrip luck={luck} compact showMedallion={false} /> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">{t("decode.strengths")}</h2>
        <ul className="space-y-2 text-[15px] text-ink-secondary">
          {views.strengths.map((s) => (
            <li key={s} className="border-l-2 border-gold-wash pl-3">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">{t("decode.watchouts")}</h2>
        <ul className="space-y-2 text-[15px] text-ink-secondary">
          {views.watchouts.map((s) => (
            <li key={s} className="border-l-2 border-line pl-3">
              {s}
            </li>
          ))}
        </ul>
      </section>

      {domains.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-xl text-ink">{t("decode.domains")}</h2>
          {domains.map((d) => (
            <ProseBlock key={d.key}>
              <p className="text-xs uppercase tracking-wide text-gold-text">{d.title}</p>
              <p className="mt-2 text-ink-secondary">{d.body}</p>
            </ProseBlock>
          ))}
        </section>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <Link
          href="/life"
          className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink hover:border-gold-accent/40"
        >
          {t("decode.openLife")}
          <ChevronRight className="h-4 w-4 text-gold-text" aria-hidden />
        </Link>
        <Link
          href="/today"
          className="flex min-h-11 items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-gold-text underline-offset-2 hover:underline"
        >
          {t("decode.openToday")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function HeroChips({ birthStar, moonSign, t }: { birthStar: string | null; moonSign: string | null; t: (k: string) => string }) {
  if (!birthStar && !moonSign) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid="decode-hero-chips">
      {birthStar ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-accent/40 bg-gold-wash/40 px-3 py-1 text-xs font-semibold text-gold-text">
          <span className="text-ink-tertiary">{t("decode.hero.birthStar")}</span>
          {birthStar}
        </span>
      ) : null}
      {moonSign ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink">
          <span className="text-ink-tertiary">{t("decode.hero.moonSign")}</span>
          {moonSign}
        </span>
      ) : null}
    </div>
  );
}
