"use client";

import { ProseBlock } from "@/components/editorial/prose-block";
import { WindowPillRow } from "@/components/editorial/window-time-pill";
import { useLocale } from "@/context/locale-context";
import type { PurposeCheckResult } from "@/lib/engine-parsers";
import { localizedPurposeLabel } from "@/lib/purpose-labels";
import { formatDisplayDate } from "@/lib/format-date";
import { factorLabel, statusLabel } from "@/lib/timing-labels";
import { formatWindowRange } from "@/lib/format-time";
import { ShareCardButton } from "@/components/share/share-button";
import { clip, purposeGlyph, verdictFromStatus } from "@/lib/share/builders";
import type { CardData } from "@/lib/share/card-types";

function shortDate(iso: string, locale: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

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
  mode = "check",
}: {
  result: PurposeCheckResult;
  purposeId: string;
  mode?: "check" | "find";
}) {
  const { t, locale } = useLocale();
  const label = localizedPurposeLabel(locale, purposeId);
  const status = statusLabel(t, result.status);
  const dateLine = result.targetDate ? formatDisplayDate(result.targetDate, locale) : "";
  const isChildPurpose = purposeId.startsWith("child_");
  const shareType = isChildPurpose ? "milestone" : mode === "find" ? "finddate" : "timing";

  function buildShare(): CardData {
    const best = result.bestWindows[0];
    const range = best ? formatWindowRange(best.start, best.end) : "";
    const verdict = verdictFromStatus(result.status);
    const day = result.targetDate ? shortDate(result.targetDate, locale) : "";
    const body = clip([result.headline, result.summary].filter(Boolean).join(" "), 230);
    if (shareType === "finddate") {
      const tops = result.candidateDates.slice(0, 3).map((c) => shortDate(c.date, locale));
      return {
        title: label,
        value: tops.length > 1 ? tops.join(" · ") : [day, range].filter(Boolean).join(" · "),
        subtitle: dateLine ? `${t("ui.bestDay")}: ${dateLine}` : undefined,
        body,
        glyph: purposeGlyph(purposeId),
        verdict,
      };
    }
    return {
      title: shareType === "milestone" ? label : [label, day].filter(Boolean).join(" · "),
      value: shareType === "milestone" ? [day, range].filter(Boolean).join(" · ") : [status, range].filter(Boolean).join(" · "),
      subtitle: shareType === "milestone" ? status : result.locationLabel || undefined,
      body,
      glyph: purposeGlyph(purposeId),
      verdict,
    };
  }

  return (
    <div data-testid="purpose-result" className="space-y-4">
      <ProseBlock>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-gold-text">
            {label} · {status}
          </p>
          <ShareCardButton type={shareType} build={buildShare} className="-mt-1 shrink-0" />
        </div>
        {dateLine ? (
          <p className="mt-1 text-sm font-medium text-ink">
            {mode === "find" ? t("ui.bestDay") : t("ui.checkedFor")}: {dateLine}
          </p>
        ) : null}
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
            {dateLine ? ` · ${dateLine}` : ""}
          </p>
        ) : null}

      </ProseBlock>

      {result.factors.length > 0 ? (
        <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">{t("timing.panchangaFactors")}</summary>
          <ul className="mt-3 space-y-2 text-ink-secondary">
            {result.factors.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                {f.name ? <span className="font-medium text-ink">{factorLabel(t, f.name)}: </span> : null}
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
