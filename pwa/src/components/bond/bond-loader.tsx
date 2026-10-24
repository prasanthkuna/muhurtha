"use client";

import { useEffect, useState } from "react";
import { NavagrahaWheel } from "@/components/shell/navagraha-loader";
import { useLocale } from "@/context/locale-context";

const MYTHS = 6;

/** Compact Navagraha wheel for Bond generations, with Bond myth-busters. */
export function BondLoader({ pct, title, onRetry, failed }: { pct: number; title: string; onRetry?: () => void; failed?: boolean }) {
  const { t } = useLocale();
  const [tick, setTick] = useState(0);
  const [myth, setMyth] = useState(() => Math.floor(Math.random() * MYTHS));
  useEffect(() => {
    const a = window.setInterval(() => setTick((n) => n + 1), 3200);
    const b = window.setInterval(() => setMyth((n) => (n + 1) % MYTHS), 6500);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);
  return (
    <section className="flex flex-col items-center rounded-3xl border border-line bg-paper px-5 py-6 text-center" aria-busy={!failed} data-testid="bond-loader">
      <div className="relative aspect-square w-[min(56vw,200px)]">
        <div className="absolute inset-6 rounded-full bg-gold-wash/50 blur-2xl" aria-hidden />
        <div className="relative h-full w-full">
          <NavagrahaWheel active={tick} />
        </div>
      </div>
      <p className="mt-3 font-serif text-lg text-ink">{failed ? t("bond.failed") : title}</p>
      {!failed ? (
        <>
          <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gold-accent transition-[width] duration-700" style={{ width: `${Math.max(5, pct)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-tertiary">{t("bond.writingHint")}</p>
          <p key={myth} className="ngl-fade mt-4 min-h-[3rem] max-w-xs text-sm leading-relaxed text-ink-secondary">{t(`bond.myth.${myth + 1}`)}</p>
        </>
      ) : onRetry ? (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-button px-5 text-sm font-semibold text-ink">
          {t("bond.retry")}
        </button>
      ) : null}
    </section>
  );
}
