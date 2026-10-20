"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";

const PURPOSES = [
  { id: "career", label: "Career move" },
  { id: "money", label: "Money decision" },
  { id: "relationship", label: "Relationship talk" },
  { id: "family", label: "Family matter" },
] as const;

function TimingInner() {
  const params = useSearchParams();
  const initial = params.get("purpose") ?? "";
  const [purpose, setPurpose] = useState(initial);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const { views, loading, error, pack } = useAppData();

  if (loading) return <LoadingState message="Loading timing…" />;
  if (error || !views) {
    return <PageHeader title="Timing" subtitle={error ?? "Unavailable"} />;
  }

  const timingPlan = (pack?.content?.timing_plan ?? {}) as Record<string, Record<string, string>>;

  async function runCheck() {
    if (!purpose) return;
    setBusy(true);
    setResult(null);

    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purpose_check",
          purpose_type: purpose,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(json.error?.toString());
      setResult(json);
    } catch (e) {
      setResult({
        summary: e instanceof Error ? e.message : "Check failed",
        verdict: "unknown",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Purpose timing"
        title="Is today aligned?"
        subtitle="Pick one purpose — we evaluate windows from your chart and pack, not generic quotes."
      />

      <div className="flex flex-wrap gap-2">
        {PURPOSES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPurpose(p.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              purpose === p.id
                ? "bg-gold-wash text-gold-text"
                : "border border-line bg-paper text-ink-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <PrimaryButton
        onClick={() => void runCheck()}
        className={!purpose ? "pointer-events-none opacity-50" : undefined}
      >
        {busy ? "Checking…" : "Run purpose check"}
      </PrimaryButton>

      {result ? (
        <ProseBlock>
          <p className="text-xs uppercase tracking-wide text-gold-text">Result</p>
          <p className="mt-2 text-lg text-ink">
            {result.summary?.toString() ??
              result.headline?.toString() ??
              "See details in response."}
          </p>
          {result.verdict ? (
            <p className="mt-2 text-sm text-ink-tertiary">Verdict: {String(result.verdict)}</p>
          ) : null}
        </ProseBlock>
      ) : (
        <ProseBlock>
          <p className="text-sm text-ink-secondary">
            <strong className="text-ink">This week:</strong>{" "}
            {timingPlan.week?.headline ?? "Finish before you fantasise."}
          </p>
          <p className="mt-3 text-sm text-ink-secondary">
            <strong className="text-ink">This month:</strong>{" "}
            {timingPlan.month?.headline ?? "Cleanup month."}
          </p>
        </ProseBlock>
      )}
    </div>
  );
}

export default function TimingPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading timing…" />}>
      <TimingInner />
    </Suspense>
  );
}
