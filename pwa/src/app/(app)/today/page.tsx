"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin } from "@/components/celestial/muh-icon";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import { formatDisplayDate } from "@/lib/format-date";
import { CelestialHeaderCard } from "@/components/celestial/celestial-header-card";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { TodayTimingPanel } from "@/components/today/today-timing-panel";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";

function HorizonCard({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  if (!headline && !body) return null;
  return (
    <ProseBlock>
      <p className="text-xs uppercase tracking-wide text-gold-text">{eyebrow}</p>
      {headline ? <p className="mt-2 font-serif text-lg text-ink">{headline}</p> : null}
      {body ? <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{body}</p> : null}
    </ProseBlock>
  );
}

export default function TodayPage() {
  const { t, locale } = useLocale();
  const { views, today, loading, error, pack } = useAppData();
  const [outlookOpen, setOutlookOpen] = useState(false);

  const date = today?.date || pack?.date || "";
  const playbook = date && views ? views.playbookFor(date) : null;

  if (loading && !pack) return <LoadingState message={t("today.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("nav.today")} subtitle={error ?? t("ui.unavailable")} />;
  }

  // No hardcoded advice: if neither the pack card nor the engine gave a line for today,
  // show a calm "preparing" state instead of recycled or generic copy.
  const mainAdvice =
    playbook?.one_line?.toString()?.trim() ||
    playbook?.oneLine?.toString()?.trim() ||
    today?.oneLine?.toString()?.trim() ||
    "";
  const cardMissing = !playbook && !mainAdvice;
  const detailedBody = playbook?.body?.toString()?.trim() ?? "";
  const cardTitle = playbook?.title?.toString() || t("nav.today");
  const dateLabel = date ? formatDisplayDate(date, locale) : t("nav.today");

  const betterFor =
    (Array.isArray(playbook?.better_for) ? playbook.better_for.map(String) : null) ??
    today?.betterFor ??
    [];
  const beCareful =
    (Array.isArray(playbook?.be_careful) ? playbook.be_careful.map(String) : null) ??
    today?.beCarefulWith ??
    [];

  const week = views.horizon("week");
  const month = views.horizon("month");
  const year = views.horizon("year");
  const luck = views.natalLuck;

  return (
    <div className="space-y-6" data-testid="today-loaded">
      {luck?.moonSignLabel || luck?.moonSymbol ? (
        <CelestialHeaderCard
          heroLabel={dateLabel}
          heroTitle={cardTitle}
          moonSignKey={luck.moonSignKey}
          moonSymbol={luck.moonSymbol}
          moonSignLabel={luck.moonSignLabel}
          heroSubline={mainAdvice || undefined}
        />
      ) : (
        <PageHeader eyebrow={dateLabel} title={cardTitle} subtitle={mainAdvice || undefined} />
      )}

      {cardMissing ? (
        <ProseBlock className="border-dashed">
          <p className="font-serif text-lg text-ink">{t("ui.preparingTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{t("ui.preparingBody")}</p>
        </ProseBlock>
      ) : null}

      {!today?.locationVerified ? (
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink-secondary">
          {t("today.locationHint")}{" "}
          <Link href="/settings" className="font-medium text-gold-text">
            {t("common.settings")}
          </Link>
        </p>
      ) : today.locationLabel ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <MapPin className="h-4 w-4 shrink-0 text-gold-text" aria-hidden />
          <span>
            {t("ui.timingsFor")} <span className="font-medium text-ink">{today.locationLabel}</span>
          </span>
        </p>
      ) : null}

      {today?.lifeChapter?.summary || today?.currentLifePeriod?.summary ? (
        <ProseBlock>
          <p className="text-xs uppercase tracking-wide text-gold-text">{t("today.chapter")}</p>
          <p className="mt-2 text-sm text-ink-secondary">
            {today.lifeChapter?.summary ?? today.currentLifePeriod?.summary}
          </p>
          <Link href="/life" className="mt-3 inline-block text-sm text-gold-text">
            {t("today.readLife")}
          </Link>
        </ProseBlock>
      ) : null}

      {detailedBody && detailedBody !== mainAdvice ? (
        <ProseBlock>
          <p className="text-sm leading-relaxed text-ink-secondary">{detailedBody}</p>
        </ProseBlock>
      ) : null}

      <TodayTimingPanel
        goodWindows={today?.goodWindows ?? []}
        cautionWindows={today?.cautionWindows ?? []}
        betterFor={betterFor}
        beCareful={beCareful}
      />

      <div>
        <DisclosureButton open={outlookOpen} onToggle={() => setOutlookOpen((v) => !v)}>
          {outlookOpen ? t("today.hideOutlook") : t("today.outlook")}
        </DisclosureButton>
        {outlookOpen ? (
          <div className="mt-4 space-y-4">
            <HorizonCard eyebrow={t("today.week")} headline={week.headline} body={week.body} />
            <HorizonCard eyebrow={t("today.month")} headline={month.headline} body={month.body} />
            <HorizonCard eyebrow={t("today.year")} headline={year.headline} body={year.body} />
          </div>
        ) : null}
      </div>

      <PrimaryButton href="/timing">{t("today.checkTiming")}</PrimaryButton>
      <Link href="/decode" className="block text-center text-sm text-gold-text">
        {t("today.whyDecode")}
      </Link>
    </div>
  );
}
