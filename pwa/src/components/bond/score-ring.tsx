"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/locale-context";
import { BAND_STYLE, type Band } from "@/lib/bond";

/** Animated guna ring: counts up to the total and sweeps the arc once. */
export function ScoreRing({ total, band, size = 184, names }: { total: number; band: Band; size?: number; names?: [string, string] }) {
  const { t } = useLocale();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(total);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(total * eased * 2) / 2);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  const r = 74;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, shown / 36));
  const style = BAND_STYLE[band];
  return (
    <div className="flex flex-col items-center" data-testid="score-ring">
      <div className="relative" style={{ width: size, height: size }}>
        <div className={`absolute inset-4 rounded-full ${style.wash} blur-2xl opacity-70`} aria-hidden />
        <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90" aria-hidden>
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * 2 * Math.PI;
            return (
              <line
                key={i}
                x1={90 + Math.cos(a) * 86}
                y1={90 + Math.sin(a) * 86}
                x2={90 + Math.cos(a) * 89}
                y2={90 + Math.sin(a) * 89}
                stroke="var(--gold-accent)"
                strokeOpacity={i < shown ? 0.9 : 0.25}
                strokeWidth="1.4"
              />
            );
          })}
          <circle
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke={style.ring}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-[3.2rem] leading-none tabular-nums text-ink" data-testid="score-total">
            {Number.isInteger(shown) ? shown : shown.toFixed(1)}
          </span>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">{t("bond.score.of")}</span>
        </div>
      </div>
      {names ? (
        <p className="mt-2 font-serif text-lg text-ink">
          {names[0]} <span className="text-gold-accent">&amp;</span> {names[1]}
        </p>
      ) : null}
      <span className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${style.wash} ${style.text}`} data-testid="score-band">
        {t(`bond.band.${band}`)}
      </span>
    </div>
  );
}
