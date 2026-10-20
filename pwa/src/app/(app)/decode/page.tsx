"use client";

import Link from "next/link";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";

export default function DecodePage() {
  const { views, loading, error, pack } = useAppData();

  if (loading) return <LoadingState message="Opening your reading…" />;
  if (error || !views || !pack) {
    return (
      <div className="space-y-4">
        <PageHeader title="Decode" subtitle={error ?? "No pack loaded."} />
        <PrimaryButton href="/welcome">Back to welcome</PrimaryButton>
      </div>
    );
  }

  const domains = views.domainReports();

  return (
    <div className="space-y-6" data-testid="decode-loaded">
      <PageHeader
        eyebrow="Janma reading"
        title={views.displayHook}
        subtitle={views.identitySummary}
      />
      <ProseBlock>
        <p className="text-ink">{views.identitySummary}</p>
      </ProseBlock>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">Strengths</h2>
        <ul className="space-y-2 text-[15px] text-ink-secondary">
          {views.strengths.map((s) => (
            <li key={s} className="border-l-2 border-gold-wash pl-3">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">Watchouts</h2>
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
          <h2 className="font-serif text-xl text-ink">Life domains</h2>
          {domains.map((d) => (
            <ProseBlock key={d.key}>
              <p className="text-xs uppercase tracking-wide text-gold-text">{d.title}</p>
              <p className="mt-2 text-ink-secondary">{d.body}</p>
            </ProseBlock>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <PrimaryButton href="/life">Open life map</PrimaryButton>
        <Link href="/today" className="text-sm font-medium text-gold-text underline-offset-4 hover:underline">
          Today’s focus →
        </Link>
      </div>
    </div>
  );
}
