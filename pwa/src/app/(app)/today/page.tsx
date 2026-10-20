"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { TodayTimingPanel } from "@/components/today/today-timing-panel";
import { useAppData } from "@/context/app-data-context";

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
  const { views, today, loading, error, pack } = useAppData();
  const [outlookOpen, setOutlookOpen] = useState(false);

  const date = today?.date || pack?.date || "";
  const playbook = date && views ? views.playbookFor(date) : null;

  if (loading && !pack) return <LoadingState message="Preparing today…" />;
  if (error || !views) {
    return <PageHeader title="Today" subtitle={error ?? "Unavailable"} />;
  }

  const mainAdvice =
    playbook?.one_line?.toString()?.trim() ||
    playbook?.oneLine?.toString()?.trim() ||
    today?.oneLine?.toString()?.trim() ||
    "Finish one pending thing before lunch.";
  const detailedBody = playbook?.body?.toString()?.trim() ?? "";
  const cardTitle = playbook?.title?.toString() ?? "Today";

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

  return (
    <div className="space-y-6" data-testid="today-loaded">
      <PageHeader eyebrow={date || "Today"} title={cardTitle} subtitle={mainAdvice} />

      {views.packMeta.todayCount > 0 && views.packMeta.todayCount < 25 ? (
        <p className="rounded-xl bg-warning-wash px-4 py-3 text-sm text-warning-ink">
          Daily cards {views.packMeta.todayCount} of ~25 for this locale — regenerate pack for full coverage.
        </p>
      ) : null}

      {!today?.locationVerified ? (
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink-secondary">
          Confirm your current city in{" "}
          <Link href="/settings" className="font-medium text-gold-text">
            Settings
          </Link>{" "}
          for accurate good and caution clock times.
        </p>
      ) : today.locationLabel ? (
        <p className="text-xs text-ink-tertiary">Local timings for {today.locationLabel}</p>
      ) : null}

      {today?.lifeChapter?.summary || today?.currentLifePeriod?.summary ? (
        <ProseBlock>
          <p className="text-xs uppercase tracking-wide text-gold-text">Your current chapter</p>
          <p className="mt-2 text-sm text-ink-secondary">
            {today.lifeChapter?.summary ?? today.currentLifePeriod?.summary}
          </p>
          <Link href="/life" className="mt-3 inline-block text-sm text-gold-text">
            Read in Life map →
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
        <button
          type="button"
          onClick={() => setOutlookOpen((v) => !v)}
          className="text-sm font-medium text-gold-text underline-offset-4 hover:underline"
        >
          {outlookOpen ? "Hide outlook" : "This week, month & year"}
        </button>
        {outlookOpen ? (
          <div className="mt-4 space-y-4">
            <HorizonCard eyebrow="This week" headline={week.headline} body={week.body} />
            <HorizonCard eyebrow="This month" headline={month.headline} body={month.body} />
            <HorizonCard eyebrow="This year" headline={year.headline} body={year.body} />
          </div>
        ) : null}
      </div>

      <PrimaryButton href="/timing?purpose=career_interview">Check timing for a purpose</PrimaryButton>
      <Link href="/decode" className="block text-center text-sm text-gold-text">
        Why this fits you → Decode
      </Link>
    </div>
  );
}
