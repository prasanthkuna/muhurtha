"use client";

import { LuckyStrip } from "@/components/editorial/lucky-strip";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { WhyLink, WhySheet } from "@/components/explainer/why-sheet";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { explainerForLucky } from "@/lib/jyotish-explainers";
import { useState } from "react";

export default function TraditionsPage() {
  const { t, locale } = useLocale();
  const { views, loading, error } = useAppData();
  const [whyOpen, setWhyOpen] = useState(false);

  if (loading && !views) return <LoadingState message={t("traditions.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("traditions.title")} subtitle={error ?? t("ui.unavailable")} />;
  }

  const luck = views.natalLuck;
  const remedies = views.content.remedy_cards;
  const remedyList = Array.isArray(remedies) ? remedies.slice(0, 4) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("traditions.eyebrow")}
        title={t("traditions.title")}
        subtitle={t("traditions.subtitle")}
      />
      {luck ? (
        <section className="rounded-2xl border border-gold-accent/25 bg-gradient-to-br from-paper to-gold-wash/20 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
              {t("traditions.luckyTitle")}
            </p>
            <WhyLink onClick={() => setWhyOpen(true)} />
          </div>
          <div className="mt-3">
            <LuckyStrip luck={luck} showMedallion />
          </div>
        </section>
      ) : null}

      {remedyList.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-lg text-ink">{t("traditions.remediesTitle")}</h2>
          {remedyList.map((raw, i) => {
            const r = raw as Record<string, unknown>;
            return (
              <ProseBlock key={i}>
                <p className="font-medium text-ink">{r.title?.toString() ?? t("traditions.remedy")}</p>
                <p className="mt-2 text-sm text-ink-secondary">{r.body?.toString() ?? ""}</p>
                <p className="mt-2 text-xs text-ink-tertiary">{t("traditions.remedyHint")}</p>
              </ProseBlock>
            );
          })}
        </section>
      ) : (
        <ProseBlock>
          <p className="text-sm text-ink-secondary">{t("traditions.noRemedies")}</p>
        </ProseBlock>
      )}

      <WhySheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        entry={explainerForLucky(locale)}
      />
    </div>
  );
}
