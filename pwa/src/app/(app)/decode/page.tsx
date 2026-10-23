"use client";

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

export default function DecodePage() {
  const { t } = useLocale();
  const { views, loading, error, pack, preparing } = useAppData();

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

  const domains = views.domainReports();
  const luck = views.natalLuck;

  return (
    <div className="space-y-6" data-testid="decode-loaded">
      {luck?.moonSignLabel || luck?.moonSymbol ? (
        <CelestialHeaderCard
          heroLabel={t("decode.janmaLabel")}
          heroTitle={views.displayHook}
          moonSignKey={luck.moonSignKey}
          moonSymbol={luck.moonSymbol}
          moonSignLabel={luck.moonSignLabel}
          heroSubline={views.identitySummary}
        />
      ) : (
        <PageHeader
          eyebrow={t("decode.janmaLabel")}
          title={views.displayHook}
          subtitle={views.identitySummary}
        />
      )}

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
