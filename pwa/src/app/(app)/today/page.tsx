"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { LuckyStrip } from "@/components/editorial/lucky-strip";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";

export default function TodayPage() {
  const { views, loading, error, pack, fromCache } = useAppData();
  const date = pack?.date ?? new Date().toISOString().slice(0, 10);

  const card = useMemo(() => views?.todayCard(date), [views, date]);
  const guidance = (pack?.content?.today_guidance ?? {}) as Record<string, unknown>;
  const luck = views?.natalLuck;

  if (loading && !pack) return <LoadingState message="Preparing today…" />;
  if (error || !views) {
    return <PageHeader title="Today" subtitle={error ?? "Unavailable"} />;
  }

  const meta = views.packMeta;
  const oneLine =
    card?.one_line?.toString() ||
    guidance.main_advice?.toString()?.slice(0, 120) ||
    "Finish one pending thing before lunch.";

  return (
    <div className="space-y-6" data-testid="today-loaded">
      <PageHeader
        eyebrow={date}
        title={card?.title?.toString() ?? "Today"}
        subtitle={oneLine.toString()}
      />

      {fromCache ? (
        <p className="text-xs text-ink-tertiary">Showing cached reading — refreshing in background.</p>
      ) : null}

      {meta.todayCount > 0 && meta.todayCount < 25 ? (
        <p className="rounded-xl bg-warning-wash px-4 py-3 text-sm text-warning-ink">
          Daily cards {meta.todayCount} of ~25 for this locale — regenerate pack for full coverage.
        </p>
      ) : null}

      {luck ? <LuckyStrip luck={luck} compact /> : null}

      <ProseBlock>
        <p className="text-ink">{card?.body?.toString() ?? guidance.main_advice?.toString()}</p>
      </ProseBlock>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-success-wash px-4 py-4">
          <p className="text-xs font-semibold uppercase text-success-ink">Better for</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
            {(Array.isArray(card?.better_for) ? card.better_for : guidance.best_for ?? [])
              .slice(0, 4)
              .map((x: unknown) => (
                <li key={String(x)}>{String(x)}</li>
              ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-warning-wash px-4 py-4">
          <p className="text-xs font-semibold uppercase text-warning-ink">Be careful</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
            {(Array.isArray(card?.be_careful) ? card.be_careful : guidance.be_careful ?? [])
              .slice(0, 4)
              .map((x: unknown) => (
                <li key={String(x)}>{String(x)}</li>
              ))}
          </ul>
        </div>
      </section>

      <PrimaryButton href="/timing?purpose=career">Check timing for a purpose</PrimaryButton>
      <Link href="/decode" className="block text-center text-sm text-gold-text">
        Why this fits you → Decode
      </Link>
    </div>
  );
}
