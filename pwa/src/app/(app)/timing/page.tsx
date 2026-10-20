"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { PurposeResultCard } from "@/components/timing/purpose-result-card";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { parsePurposeCheck, type PurposeCheckResult } from "@/lib/engine-parsers";
import { normalizePurposeType, PURPOSE_OPTIONS } from "@/lib/purpose-types";

function TimingInner() {
  const params = useSearchParams();
  const initial = normalizePurposeType(params.get("purpose"));
  const [purpose, setPurpose] = useState(initial);
  const [result, setResult] = useState<PurposeCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useLocale();
  const engineBody = useEngineBody();
  const { views, loading, error, pack } = useAppData();

  useEffect(() => {
    const p = normalizePurposeType(params.get("purpose"));
    if (p) setPurpose(p);
  }, [params]);

  const runCheck = useCallback(async () => {
    if (!purpose) return;
    setBusy(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(engineBody("purpose_check", { purpose_type: purpose })),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const code = json.error_code?.toString() ?? "";
        const msg = json.error?.toString() ?? "Check failed";
        if (code === "location_required") {
          throw new Error(t("timing.locationRequired"));
        }
        throw new Error(msg);
      }
      setResult(parsePurposeCheck(json));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }, [purpose, engineBody, t]);

  useEffect(() => {
    if (!purpose || loading || !views) return;
    void runCheck();
  }, [purpose, loading, views, runCheck]);

  if (loading) return <LoadingState message={t("timing.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("nav.timing")} subtitle={error ?? "Unavailable"} />;
  }

  const timingPlan = (pack?.content?.timing_plan ?? {}) as Record<string, Record<string, string>>;
  const week = views.horizon("week");
  const month = views.horizon("month");

  return (
    <div className="space-y-6" data-testid="timing-loaded">
      <PageHeader eyebrow={t("timing.eyebrow")} title={t("timing.title")} subtitle={t("timing.subtitle")} />

      <div className="flex flex-wrap gap-2">
        {PURPOSE_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPurpose(p.id);
              setResult(null);
              setErrorMsg(null);
            }}
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
        {busy ? t("timing.checking") : t("timing.run")}
      </PrimaryButton>

      {errorMsg ? (
        <ProseBlock>
          <p className="text-sm text-warning-ink">{errorMsg}</p>
          {errorMsg.includes("Settings") || errorMsg.includes("location") ? (
            <Link href="/settings" className="mt-3 inline-block text-sm text-gold-text">
              {t("common.settings")} →
            </Link>
          ) : null}
        </ProseBlock>
      ) : null}

      {result && purpose ? <PurposeResultCard result={result} purposeId={purpose} /> : null}

      {!result && !errorMsg && !busy ? (
        <ProseBlock>
          <p className="text-sm text-ink-secondary">
            <strong className="text-ink">{t("timing.week")}:</strong>{" "}
            {week.headline || timingPlan.week?.headline || "—"}
          </p>
          <p className="mt-3 text-sm text-ink-secondary">
            <strong className="text-ink">{t("timing.month")}:</strong>{" "}
            {month.headline || timingPlan.month?.headline || "—"}
          </p>
        </ProseBlock>
      ) : null}
    </div>
  );
}

export default function TimingPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <TimingInner />
    </Suspense>
  );
}
