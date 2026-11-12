"use client";

import { useEffect, useState } from "react";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";

type Summary = { headline: string; line: string; focus: string; go_slow: string; why_today: string };

/**
 * One short daily summary per chart + language, generated once a day on the server and
 * reused on Today, Decode, Calendar and Life (and in Ask and the morning brief).
 */
export function DailySummaryStrip({ className }: { className?: string }) {
  const { t, locale } = useLocale();
  const engineBody = useEngineBody();
  const { activeChartProfileId, userId, profileTimezone } = useAppData();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: profileTimezone || "Asia/Kolkata" }).format(new Date());
  const key = `muh_dc_v1:${userId ?? "anon"}:${activeChartProfileId ?? "self"}:${locale}:${day}`;
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        setS(JSON.parse(raw) as Summary);
        return;
      }
    } catch { /* storage blocked */ }
    setS(null);
    void (async () => {
      try {
        const res = await fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineBody("daily_context_get")),
        });
        const j = (await res.json()) as { summary?: Summary | null };
        if (!res.ok || !j.summary?.headline) return;
        try {
          sessionStorage.setItem(key, JSON.stringify(j.summary));
        } catch { /* ignore */ }
        if (alive) setS(j.summary);
      } catch { /* optional strip */ }
    })();
    return () => {
      alive = false;
    };
  }, [key, userId, engineBody]);

  if (!s) return null;
  return (
    <section
      data-testid="daily-summary"
      className={className ?? "mb-5 rounded-2xl border border-gold-accent/30 bg-gold-wash/40 px-4 py-3"}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t("live.todaySummary")}</p>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{s.headline}</p>
      {s.line ? <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{s.line}</p> : null}
      <dl className="mt-2 grid gap-1 text-sm text-ink-secondary">
        {s.focus ? (
          <div>
            <dt className="inline font-medium text-success-ink">{t("live.focus")}: </dt>
            <dd className="inline">{s.focus}</dd>
          </div>
        ) : null}
        {s.go_slow ? (
          <div>
            <dt className="inline font-medium text-warning-ink">{t("live.goSlow")}: </dt>
            <dd className="inline">{s.go_slow}</dd>
          </div>
        ) : null}
        {s.why_today ? (
          <div className="text-xs text-ink-tertiary">
            <dt className="inline font-medium">{t("live.whyToday")}: </dt>
            <dd className="inline">{s.why_today}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
