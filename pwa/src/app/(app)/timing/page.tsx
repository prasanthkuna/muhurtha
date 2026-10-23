"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { ProseBlock } from "@/components/editorial/prose-block";
import { LoadingState } from "@/components/editorial/loading-state";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { PurposeResultCard } from "@/components/timing/purpose-result-card";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { parsePurposeCheck, type PurposeCheckResult } from "@/lib/engine-parsers";
import { todayInTimezone } from "@/lib/local-date";
import { localizedPurposeLabel, localizedPurposeOptions } from "@/lib/purpose-labels";
import { normalizePurposeType } from "@/lib/purpose-types";
import { isChildStage } from "@/lib/life-stage";
import { savePlan } from "@/lib/saved-plans";
import { formatDisplayDate } from "@/lib/format-date";
import { statusLabel } from "@/lib/timing-labels";

type Mode = "check" | "find";

function TimingInner() {
  const params = useSearchParams();
  const initial = normalizePurposeType(params.get("purpose"));
  const [purpose, setPurpose] = useState(initial);
  const [mode, setMode] = useState<Mode>("check");
  const [targetDate, setTargetDate] = useState("");
  const [compareDays, setCompareDays] = useState(14);
  const [result, setResult] = useState<PurposeCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const { t, locale } = useLocale();
  const engineBody = useEngineBody();
  const { views, loading, error, pack, profileTimezone, activeLifeStage } = useAppData();
  const childChart = isChildStage(activeLifeStage);
  const purposeOptions = localizedPurposeOptions(locale, activeLifeStage);
  const resultRef = useRef<HTMLDivElement>(null);
  const [scrollPending, setScrollPending] = useState(false);
  // Only scroll for checks the user asked for (button / candidate tap), not the silent
  // auto-check on page open or after a language change.
  const scrollWantedRef = useRef(false);

  useEffect(() => {
    if (!result || !scrollPending) return;
    setScrollPending(false);
    // Bring the answer into view instead of leaving it below the fold.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }),
    );
  }, [result, scrollPending]);

  // Results are localized: drop a stale Find-a-date result when the language changes
  // (check mode re-runs on its own because engineBody changes with the locale).
  const lastLocale = useRef(locale);
  useEffect(() => {
    if (lastLocale.current === locale) return;
    lastLocale.current = locale;
    if (mode === "find") setResult(null);
  }, [locale, mode]);

  useEffect(() => {
    const p = normalizePurposeType(params.get("purpose"));
    if (p) setPurpose(p);
  }, [params]);

  // Switching between an adult and a child chart swaps the purpose set: drop a selection
  // that isn't offered for this chart (e.g. "Business launch" on a toddler's chart).
  const purposeIds = purposeOptions.map((p) => p.id).join(",");
  useEffect(() => {
    if (purpose && !purposeIds.split(",").includes(purpose)) {
      setPurpose("");
      setResult(null);
      setErrorMsg(null);
    }
  }, [purpose, purposeIds]);

  useEffect(() => {
    if (!targetDate && profileTimezone) {
      setTargetDate(todayInTimezone(profileTimezone));
    }
  }, [profileTimezone, targetDate]);

  const runCheck = useCallback(async () => {
    if (!purpose) return;
    setBusy(true);
    setResult(null);
    setErrorMsg(null);
    setSavedMsg(null);

    try {
      const action = mode === "find" ? "purpose_compare" : "purpose_check";
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          engineBody(action, {
            purpose_type: purpose,
            target_date: targetDate || todayInTimezone(profileTimezone),
            ...(mode === "find" ? { days: compareDays } : {}),
          }),
        ),
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
      if (scrollWantedRef.current) setScrollPending(true);
      scrollWantedRef.current = false;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }, [purpose, mode, targetDate, compareDays, engineBody, t, profileTimezone]);

  useEffect(() => {
    if (!purpose || loading || !views || mode !== "check") return;
    void runCheck();
  }, [purpose, loading, views, mode, runCheck]);

  function onSavePlan() {
    if (!result || !purpose) return;
    const win = result.bestWindows[0];
    savePlan({
      purposeType: purpose,
      purposeLabel: localizedPurposeLabel(locale, purpose),
      eventDate: result.targetDate ?? targetDate,
      cityLabel: result.locationLabel ?? "",
      windowStart: win?.start,
      windowEnd: win?.end,
      method: result.method,
    });
    setSavedMsg(t("timing.planSaved"));
  }

  if (loading && !views) return <LoadingState message={t("timing.loading")} />;
  if (error || !views) {
    return <ReadingUnavailable title={t("nav.timing")} />;
  }

  const timingPlan = (pack?.content?.timing_plan ?? {}) as Record<string, Record<string, string>>;
  const week = views.horizon("week");
  const month = views.horizon("month");

  return (
    <div className="space-y-6" data-testid="timing-loaded">
      <PageHeader eyebrow={t("timing.eyebrow")} title={t("timing.title")} subtitle={t("timing.subtitle")} />

      <div className="flex gap-2 rounded-full border border-line bg-paper p-1">
        <button
          type="button"
          onClick={() => {
            setMode("check");
            setResult(null);
          }}
          className={`flex-1 rounded-full py-2 text-xs font-semibold sm:text-sm ${
            mode === "check" ? "bg-gold-wash text-gold-text" : "text-ink-secondary"
          }`}
        >
          {t("timing.modeCheck")}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("find");
            setResult(null);
          }}
          className={`flex-1 rounded-full py-2 text-xs font-semibold sm:text-sm ${
            mode === "find" ? "bg-gold-wash text-gold-text" : "text-ink-secondary"
          }`}
        >
          {t("timing.modeFind")}
        </button>
      </div>

      {childChart ? <p className="text-xs text-ink-tertiary">{t("timing.childHint")}</p> : null}
      <div className="flex flex-wrap gap-2">
        {purposeOptions.map((p) => (
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
                ? "bg-gold-wash text-gold-text ring-1 ring-gold-accent/30"
                : "border border-line bg-paper text-ink-secondary hover:border-gold-accent/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">
            {mode === "find" ? t("ui.startDate") : t("timing.dateLabel")}
          </span>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink"
          />
        </label>
        {mode === "find" ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-tertiary">{t("timing.compareRange")}</span>
            <select
              value={compareDays}
              onChange={(e) => setCompareDays(Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink"
            >
              <option value={7}>7 {t("timing.days")}</option>
              <option value={14}>14 {t("timing.days")}</option>
              <option value={30}>30 {t("timing.days")}</option>
            </select>
          </label>
        ) : null}
      </div>

      {!purpose ? <p className="text-sm text-ink-secondary">{t("ui.pickPurpose")}</p> : null}

      <PrimaryButton
        onClick={() => {
          scrollWantedRef.current = true;
          void runCheck();
        }}
        disabled={!purpose || busy}
        className={!purpose ? "pointer-events-none opacity-50" : undefined}
      >
        {busy ? t("timing.checking") : mode === "find" ? t("timing.findRun") : t("timing.run")}
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

      {result && purpose ? (
        <div ref={resultRef} className="scroll-mt-4 space-y-6">
          <PurposeResultCard result={result} purposeId={purpose} mode={mode} />
          {result.candidateDates.length > 1 ? (
            <ProseBlock>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
                {t("timing.compareResults")}
              </p>
              <p className="mt-1 text-sm text-ink-tertiary">{t("ui.tapToCheck")}</p>
              <ul className="mt-3 space-y-2">
                {result.candidateDates.slice(0, 5).map((c) => (
                  <li key={c.date}>
                    <button
                      type="button"
                      onClick={() => {
                        // Check that specific day (auto-runs via the check-mode effect).
                        scrollWantedRef.current = true;
                        setMode("check");
                        setResult(null);
                        setTargetDate(c.date);
                      }}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-left text-sm transition-colors hover:border-gold-accent/40 active:bg-gold-wash/30"
                    >
                      <span className="font-medium text-ink">{formatDisplayDate(c.date, locale)}</span>
                      <span className="text-right text-xs text-ink-secondary">
                        {statusLabel(t, c.status)}
                        {c.nakshatra ? ` · ${c.nakshatra}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </ProseBlock>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton type="button" onClick={onSavePlan} className="flex-1">
              {t("timing.savePlan")}
            </PrimaryButton>
            <PrimaryButton href="/plans" className="flex-1 !bg-paper text-gold-text ring-1 ring-line">
              {t("timing.viewPlans")}
            </PrimaryButton>
          </div>
          {savedMsg ? <p className="text-sm text-success-ink">{savedMsg}</p> : null}
        </div>
      ) : null}

      {!result && !errorMsg && !busy && mode === "check" ? (
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
