"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { normalizePurposeType, PURPOSE_OPTIONS } from "@/lib/purpose-types";

function TimingInner() {
  const params = useSearchParams();
  const initial = normalizePurposeType(params.get("purpose"));
  const [purpose, setPurpose] = useState(initial);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const { views, loading, error, pack } = useAppData();

  useEffect(() => {
    const p = normalizePurposeType(params.get("purpose"));
    if (p) setPurpose(p);
  }, [params]);

  if (loading) return <LoadingState message="Loading timing…" />;
  if (error || !views) {
    return <PageHeader title="Timing" subtitle={error ?? "Unavailable"} />;
  }

  const timingPlan = (pack?.content?.timing_plan ?? {}) as Record<string, Record<string, string>>;
  const week = views.horizon("week");
  const month = views.horizon("month");

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
      if (!res.ok) {
        const code = json.error_code?.toString() ?? "";
        const msg = json.error?.toString() ?? "Check failed";
        if (code === "location_required") {
          throw new Error(
            "Save your current city in Settings (use Detect location) so we can compute local Panchanga windows.",
          );
        }
        throw new Error(msg);
      }
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

  const plan = result?.plan as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6" data-testid="timing-loaded">
      <PageHeader
        eyebrow="Purpose timing"
        title="Is today aligned?"
        subtitle="Traditional Panchanga comparison for one purpose — not an outcome guarantee."
      />

      <div className="flex flex-wrap gap-2">
        {PURPOSE_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPurpose(p.id)}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
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
            {result.headline?.toString() ??
              result.summary?.toString() ??
              "See details below."}
          </p>
          {result.summary && result.headline ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{String(result.summary)}</p>
          ) : null}
          {plan?.focus ? (
            <p className="mt-3 text-sm text-ink-secondary">
              <span className="font-medium text-ink">Focus: </span>
              {String(plan.focus)}
            </p>
          ) : null}
          {result.verdict ? (
            <p className="mt-2 text-xs text-ink-tertiary">Status: {String(result.verdict)}</p>
          ) : null}
          {result.summary?.toString().includes("Settings") ? (
            <Link href="/settings" className="mt-3 inline-block text-sm text-gold-text">
              Open Settings →
            </Link>
          ) : null}
        </ProseBlock>
      ) : (
        <ProseBlock>
          <p className="text-sm text-ink-secondary">
            <strong className="text-ink">This week:</strong>{" "}
            {week.headline || timingPlan.week?.headline || "Finish before you fantasise."}
          </p>
          <p className="mt-3 text-sm text-ink-secondary">
            <strong className="text-ink">This month:</strong>{" "}
            {month.headline || timingPlan.month?.headline || "Cleanup month."}
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
