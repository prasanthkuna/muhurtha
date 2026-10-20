"use client";

import { ProseBlock } from "@/components/editorial/prose-block";
import { WindowPillRow } from "@/components/editorial/window-time-pill";
import { useLocale } from "@/context/locale-context";
import type { PurposeCheckResult } from "@/lib/engine-parsers";
import { purposeLabel } from "@/lib/purpose-types";

function FactorList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "caution" }) {
  if (items.length === 0) return null;
  const ink = tone === "good" ? "text-success-ink" : "text-warning-ink";
  return (
    <div className="mt-4">
      <p className={`text-xs font-semibold uppercase ${ink}`}>{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
        {items.slice(0, 5).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function PurposeResultCard({
  result,
  purposeId,
}: {
  result: PurposeCheckResult;
  purposeId: string;
}) {
  const { t } = useLocale();
  const label = purposeLabel(purposeId);
  const statusLabel = result.status.replaceAll("_", " ");

  return (
    <div data-testid="purpose-result" className="space-y-4">
      <ProseBlock>
        <p className="text-xs uppercase tracking-wide text-gold-text">
          {label} · {statusLabel}
        </p>
        <p className="mt-2 font-serif text-xl text-ink">{result.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{result.summary}</p>

        {result.personalSignals.length > 0 ? (
          <ul className="mt-3 space-y-1 border-l-2 border-gold-accent/40 pl-3 text-sm text-ink">
            {result.personalSignals.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}

        {result.domainLenses.length > 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">
            <span className="font-medium text-ink">{t("timing.forThisPurpose")}: </span>
            {result.domainLenses.slice(0, 3).join(" · ")}
          </p>
        ) : null}

        <FactorList title={t("timing.supporting")} items={result.supportingFactors} tone="good" />
        <FactorList title={t("timing.watchOut")} items={result.cautionFactors} tone="caution" />

        {result.bestWindows.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-success-ink">
              {t("timing.purposeWindows")}
            </p>
            <WindowPillRow windows={result.bestWindows} tone="good" />
          </div>
        ) : null}

        {result.cautionWindows.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-warning-ink">
              {t("timing.cautionWindows")}
            </p>
            <WindowPillRow windows={result.cautionWindows} tone="caution" />
          </div>
        ) : null}

        {result.actionLine ? (
          <p className="mt-4 rounded-xl bg-gold-wash/50 px-3 py-2 text-sm text-ink-secondary">
            {result.actionLine}
          </p>
        ) : null}

        {result.locationLabel ? (
          <p className="mt-3 text-xs text-ink-tertiary">
            {result.locationLabel}
            {result.timezone ? ` · ${result.timezone}` : ""}
            {result.targetDate ? ` · ${result.targetDate}` : ""}
          </p>
        ) : null}

        <p className="mt-4 text-xs text-ink-tertiary">{t("timing.disclaimer")}</p>
      </ProseBlock>

      {result.factors.length > 0 ? (
        <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">{t("timing.panchangaFactors")}</summary>
          <ul className="mt-3 space-y-2 text-ink-secondary">
            {result.factors.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                {f.name ? <span className="font-medium text-ink">{f.name}: </span> : null}
                {f.value}
              </li>
            ))}
          </ul>
          {result.limitations.length > 0 ? (
            <p className="mt-3 text-xs text-ink-tertiary">{result.limitations.join(" ")}</p>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
