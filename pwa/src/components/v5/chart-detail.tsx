"use client";

import { useState } from "react";
import { ExplainSheet, type ExplainScreen } from "@/components/explainer/explain-sheet";
import { useLocale } from "@/context/locale-context";

export type DetailRow = { label: string; value: string; term?: string; termValue?: string };

/** A word you can tap to see what it means (opens the three-layer Explain sheet). */
export function ExplainTerm({ term, screen, value, children }: { term: string; screen: ExplainScreen; value?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`term-${term}`}
        className="underline decoration-gold-accent/60 decoration-dotted underline-offset-4 hover:decoration-gold-accent"
      >
        {children}
      </button>
      <ExplainSheet term={term} screen={screen} value={value} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Collapsed "Chart detail": the engine facts behind a line, each term tappable. */
export function ChartDetail({
  rows,
  evidence = [],
  screen,
  label,
  testId = "chart-detail",
}: {
  rows: DetailRow[];
  evidence?: string[];
  screen: ExplainScreen;
  label?: string;
  testId?: string;
}) {
  const { t } = useLocale();
  const shown = rows.filter((r) => r.value);
  if (!shown.length && !evidence.length) return null;
  return (
    <details className="group rounded-xl border border-line bg-paper px-4 py-2.5 text-sm" data-testid={testId}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between font-medium text-gold-text">
        {label ?? t("chart.detail")}
        <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      {shown.length ? (
        <dl className="mt-2 space-y-1.5 pb-1">
          {shown.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-ink-tertiary">
                {r.term ? <ExplainTerm term={r.term} screen={screen} value={r.termValue}>{r.label}</ExplainTerm> : r.label}
              </dt>
              <dd className="text-right text-sm text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {evidence.length ? (
        <div className="mt-2 border-t border-line pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">{t("chart.basis")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-secondary">
            {evidence.slice(0, 4).map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      ) : null}
      <p className="mt-2 pb-1 text-[11px] text-ink-tertiary">{t("explain.tap")}</p>
    </details>
  );
}
