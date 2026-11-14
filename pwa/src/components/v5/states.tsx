"use client";

import { useState } from "react";
import { useAppData, type ChartFacts } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { formatMonthYear } from "@/lib/format-date";
import type { AppLocale } from "@/lib/locale";
import { fill } from "@/lib/messages-bond";

const isSignInError = (e: string | null | undefined) => Boolean(e && /sign in/i.test(e));

/** Friendly error with a Retry button (never a raw error string, never a dead end). */
export function ErrorState({
  title,
  onRetry,
  testId = "error-state",
}: {
  title?: string;
  onRetry?: () => Promise<void> | void;
  testId?: string;
}) {
  const { t } = useLocale();
  const { error, refresh } = useAppData();
  const [busy, setBusy] = useState(false);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (isSignInError(error)) {
    return (
      <section className="rounded-2xl border border-line bg-paper px-5 py-6 text-center" data-testid="signin-state">
        <p className="text-[15px] text-ink-secondary">{t("state.signIn")}</p>
        <a href="/auth" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gold-accent px-5 text-sm font-semibold text-paper">
          {t("state.signInCta")}
        </a>
      </section>
    );
  }
  const retry = async () => {
    setBusy(true);
    try {
      await (onRetry ? onRetry() : refresh());
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-line bg-paper px-5 py-6 text-center" role="alert" data-testid={testId}>
      {title ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">{title}</p> : null}
      <p className="mt-1 font-serif text-xl text-ink">{t("state.errorTitle")}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">
        {offline ? t("state.offline") : t("state.errorBody")}
      </p>
      <button
        type="button"
        onClick={() => void retry()}
        disabled={busy}
        data-testid="state-retry"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-gold-accent px-6 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {busy ? t("state.retrying") : t("state.retry")}
      </button>
    </section>
  );
}

/** Birth star, Moon sign and the current chapter: engine facts, ready before the words. */
export function ChartFactsCard({ chart, className }: { chart: ChartFacts | null | undefined; className?: string }) {
  const { t, locale } = useLocale();
  if (!chart || (!chart.nakshatraLabel && !chart.moonSignLabel && !chart.mdLabel)) return null;
  const until = chart.adUntil ? fill(t("chartFacts.until"), { date: formatMonthYear(`${chart.adUntil}-01`, locale as AppLocale) }) : "";
  const chapter = [chart.mdLabel, chart.adLabel && chart.adLabel !== chart.mdLabel ? chart.adLabel : null].filter(Boolean).join(" · ");
  const rows: [string, string][] = [
    [t("chartFacts.star"), chart.nakshatraLabel ?? ""],
    [t("chartFacts.moon"), chart.moonSignLabel ?? ""],
    [t("chartFacts.chapter"), [chapter, until].filter(Boolean).join(", ")],
  ].filter((r): r is [string, string] => Boolean(r[1]));
  return (
    <section className={className ?? "w-full max-w-sm rounded-2xl border border-gold-accent/30 bg-paper px-4 py-4 text-left"} data-testid="chart-facts">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text">{t("chartFacts.title")}</p>
      <dl className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-ink-tertiary">{k}</dt>
            <dd className="text-right text-sm font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-ink-tertiary">{t("chartFacts.note")}</p>
    </section>
  );
}

/** Your reading exists in another language; this one is written only when you ask. */
export function NotWrittenCard() {
  const { t, locale, setLocale } = useLocale();
  const { notWritten, writeReadingInLocale } = useAppData();
  if (!notWritten) return null;
  const lang = t(`lang.${locale}`);
  const otherCode = notWritten.otherLocales[0] ?? "en";
  const other = t(`lang.${otherCode}`);
  return (
    <div className="flex flex-col items-center gap-4 py-4" data-testid="not-written">
      <section className="w-full rounded-2xl border border-line bg-paper px-5 py-6 text-center">
        <p className="font-serif text-xl text-ink">{fill(t("notWritten.title"), { lang })}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">{fill(t("notWritten.body"), { lang, other })}</p>
        <button
          type="button"
          onClick={writeReadingInLocale}
          data-testid="not-written-cta"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-gold-accent px-6 text-sm font-semibold text-paper"
        >
          {fill(t("notWritten.cta"), { lang })}
        </button>
        <div>
          <button
            type="button"
            onClick={() => void setLocale(otherCode as AppLocale)}
            className="mt-3 min-h-9 text-sm font-medium text-gold-text"
          >
            {fill(t("notWritten.back"), { other })}
          </button>
        </div>
      </section>
      <ChartFactsCard chart={notWritten.chart} className="w-full rounded-2xl border border-gold-accent/30 bg-paper px-4 py-4 text-left" />
    </div>
  );
}
