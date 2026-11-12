"use client";

import { ExplainRow } from "@/components/explainer/explain-sheet";
import { DailySummaryStrip } from "@/components/live/daily-summary-strip";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { PageHeader } from "@/components/editorial/page-header";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { usePaywall } from "@/context/paywall-context";
import { clock, monthLabel, shortDate, type AreaId, type CalDay } from "@/lib/bond";
import { fill, nakLabel } from "@/lib/messages-bond";
import { AREA_ICON as AREA_GLYPH, AREA_ORDER, calWhyLine, tithiLabel } from "@/lib/cal-text";
import { upcomingWindows } from "@/lib/day-dedupe";

import { cachedMonth, cachedYear, fetchMonth, fetchYear, type MonthResp, type YearResp } from "@/lib/cal-cache";

// Three clearly different tints (green / warm sand / lavender) at a strength that still reads on
// a phone in daylight; cell, legend swatch and chip use the same colour per tone.
const TONE: Record<CalDay["tone"], { cell: string; dot: string; chip: string }> = {
  supportive: {
    cell: "bg-[#cfe7d7] text-success-ink font-semibold",
    dot: "bg-[#cfe7d7] border-[#8fc2a1]",
    chip: "bg-[#cfe7d7] text-success-ink",
  },
  mixed: {
    cell: "bg-[#f3e2bd] text-gold-text",
    dot: "bg-[#f3e2bd] border-[#d9b874]",
    chip: "bg-[#f3e2bd] text-gold-text",
  },
  rest: {
    cell: "bg-[#ddd5f3] text-[#4b3f80]",
    dot: "bg-[#ddd5f3] border-[#a899d8]",
    chip: "bg-[#ddd5f3] text-[#4b3f80]",
  },
};
const AREA_ICON = AREA_GLYPH as Record<AreaId, string>;

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function DayDetail({ d, label, today, zone, nowMs }: { d: CalDay; label?: string; today?: string; zone?: string; nowMs?: number }) {
  const { t, locale } = useLocale();
  // Today's card follows the Today tab: a slot that has ended reads as over, never as upcoming.
  const isToday = !!today && d.date === today;
  const z = zone || "Asia/Kolkata";
  const bestOver = isToday && d.best ? upcomingWindows([d.best], d.date, z, nowMs).length === 0 : false;
  const rahuOver = isToday && d.rahu ? upcomingWindows([d.rahu], d.date, z, nowMs).length === 0 : false;
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-4" data-testid={`cal-detail-${d.date}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label ? `${label} · ` : ""}{shortDate(d.date, locale)}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONE[d.tone].chip)}>{t(`cal.tone.${d.tone}`)}</span>
      </div>
      {calWhyLine(d, t, locale) ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary" data-testid="cal-why">{calWhyLine(d, t, locale)}</p>
      ) : null}
      {d.chandrashtama ? (
        <div className="mt-2 rounded-lg bg-warning-wash/60 px-2.5 py-1.5 text-xs text-warning-ink">
          <p className="font-medium">{t("cal.chandrashtama")}</p>
          <p className="mt-0.5">{t("cal.chandrashtamaGloss")}</p>
        </div>
      ) : null}
      {d.favours.length ? (
        <p className="mt-2 text-sm text-ink">
          <span className="text-ink-tertiary">{t("cal.favours")}: </span>
          {d.favours.map((a) => `${AREA_ICON[a]} ${t(`cal.area.${a}`)}`).join(" · ")}
        </p>
      ) : null}
      {d.avoid ? (
        <p className="mt-1 text-sm text-ink">
          <span className="text-ink-tertiary">{t("cal.avoid")}: </span>
          {t(`cal.area.${d.avoid}`)}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
        {d.best && bestOver ? (
          <span className="text-ink-tertiary" data-testid="cal-best-passed">{t("cal.bestPassed")}</span>
        ) : d.best ? (
          <span data-testid="cal-best">{d.best_kind === "calm" ? t("cal.calm") : t("cal.best")}: <b className="font-semibold text-ink">{clock(d.best.start)}–{clock(d.best.end)}</b></span>
        ) : null}
        {d.rahu && !rahuOver ? <span>{t("cal.rahu")}: {clock(d.rahu.start)}–{clock(d.rahu.end)}</span> : null}
      </div>
      <p className="mt-2 text-xs text-ink-tertiary" data-testid="cal-panchang">
        {[
          d.nakshatra ? fill(t("cal.star"), { star: nakLabel(d.nakshatra, locale) }) : "",
          d.tithi ? fill(t("cal.tithi"), { tithi: tithiLabel(d.tithi, locale) }) : "",
          d.birth_star ? `★ ${t("cal.birthStar")}` : "",
        ].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function MonthGrid({ data, picked, onPick }: { data: MonthResp; picked: string | null; onPick: (d: string) => void }) {
  const { locale } = useLocale();
  const first = data.days[0];
  const lead = first ? (first.weekday + 6) % 7 : 0;
  const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", { weekday: "narrow" }));
  return (
    <section className="rounded-3xl border border-line bg-paper px-3 py-4" data-testid="cal-month">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-tertiary">{wd.map((w, i) => <span key={i}>{w}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {data.days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => onPick(d.date)}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums",
              d.date === picked ? "bg-ink font-semibold text-paper" : TONE[d.tone].cell,
              d.date === data.today && d.date !== picked ? "ring-2 ring-gold-accent" : "",
            )}
            data-testid={`cal-day-${d.date}`}
          >
            {Number(d.date.slice(8))}
            <span className="mt-0.5 h-3 text-[9px] leading-3">{d.favours[0] ? AREA_ICON[d.favours[0]] : ""}</span>
            {d.chandrashtama ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning-ink/70" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function YearList({ data }: { data: YearResp }) {
  const { t, locale } = useLocale();
  return (
    <div className="space-y-3" data-testid="cal-year">
      {data.months.map((m) => (
        <section key={m.month} className="rounded-2xl border border-line bg-paper px-4 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-serif text-lg text-ink">{monthLabel(m.month, locale)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t(m.sun_theme ? `cal.mtheme.${m.theme}` : `cal.theme.${m.theme}`)}</p>
          </div>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {t(m.sun_theme ? `cal.mthemeLine.${m.theme}` : `cal.themeLine.${m.theme}`)}
            {m.sun_theme && m.sun_theme !== m.theme ? ` ${fill(t("cal.year.alsoSun"), { theme: t(`cal.mtheme.${m.sun_theme}`) })}` : ""}
          </p>
          {m.notes?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-[13px] text-ink">
              {m.notes.map((n) => (
                <li key={n}>{t(`cal.mnote.${n}`)}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
            <span className={cn("rounded-full px-2 py-0.5", TONE.supportive.chip)}>{fill(t("cal.year.supportive"), { n: m.supportive_days })}</span>
            <span className={cn("rounded-full px-2 py-0.5", TONE.rest.chip)}>{fill(t("cal.year.rest"), { n: m.rest_days })}</span>
            {m.jupiter_lift ? <span className="rounded-full bg-gold-wash px-2 py-0.5 text-gold-text">♃ {t("cal.year.jupiter")}</span> : null}
            {m.slow ? <span className="rounded-full bg-warning-wash px-2 py-0.5 text-warning-ink">♄ {t(`cal.year.slow.${m.slow}`)}</span> : null}
            {m.chandrashtama_days ? <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-secondary">{fill(t("cal.year.ch8"), { n: m.chandrashtama_days })}</span> : null}
            {m.ad_change ? <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-secondary">↻ {t("cal.year.adChange")}</span> : null}
          </div>
          {m.backdrop ? <p className="mt-1.5 text-[11px] text-ink-tertiary">{fill(t("cal.year.backdrop"), { theme: t(`cal.theme.${m.backdrop}`) })}</p> : null}
          {m.best_dates.length ? (
            <p className="mt-2 text-sm text-ink">
              <span className="text-ink-tertiary">{t("cal.year.best")}: </span>
              {m.best_dates.map((b) => `${shortDate(b.date, locale)} ${AREA_ICON[b.area]}`).join(" · ")}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const { t, locale } = useLocale();
  const { isPro, userId } = useAppData();
  const { openPaywall } = usePaywall();
  const [view, setView] = useState<"month" | "year">("month");
  // Deep link from the Pro welcome: /calendar?view=year.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "year") setView("year");
  }, []);
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<MonthResp | null>(null);
  const [year, setYear] = useState<YearResp | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Minute ticker so today's best time flips to "over" without a reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const applyMonth = (r: MonthResp) => {
      if (!alive) return;
      setData(r);
      setErr(null);
      setMonth((m) => m ?? r.month);
      setPicked((p) => (p && r.days.some((d) => d.date === p) ? p : r.days.find((d) => d.date >= r.today)?.date ?? r.days[0]?.date ?? null));
    };
    // Cached copy first (instant), then a quiet refresh; the error shows only with nothing on screen.
    const hit = cachedMonth(userId, isPro, month);
    if (hit) applyMonth(hit);
    else setData(null);
    fetchMonth(userId, isPro, month)
      .then((r) => {
        applyMonth(r);
        // Warm the Year view with the month so the toggle opens from cache.
        if (isPro && !cachedYear(userId, isPro)) void fetchYear(userId, isPro).catch(() => {});
      })
      .catch((e) => {
        if (alive && !hit) setErr((e as { code?: string }).code ?? "failed");
      });
    return () => {
      alive = false;
    };
  }, [month, isPro, locale, userId, attempt]);

  useEffect(() => {
    if (view !== "year") return;
    const hit = cachedYear(userId, isPro);
    if (hit) setYear(hit);
    else if (year) return;
    fetchYear(userId, isPro).then(setYear).catch(() => !hit && setErr("failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isPro, userId, attempt]);

  useEffect(() => setYear(null), [isPro]);
  const pickedDay = useMemo(() => data?.days.find((d) => d.date === picked) ?? null, [data, picked]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow={t("nav.calendar")} title={t("cal.title")} subtitle={t("cal.sub")} className="mb-5" />
      <DailySummaryStrip />
      <ExplainRow screen="calendar" terms={[{ term: "good_slot" }, { term: "tara_bala" }, { term: "chandrashtama" }, { term: "rahu_kalam" }]} />
      <div className="mb-4 flex gap-1 rounded-full bg-canvas p-1" role="tablist">
        {(["month", "year"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("min-h-10 flex-1 rounded-full text-sm font-semibold", view === v ? "bg-paper text-ink shadow-sm" : "text-ink-tertiary")} data-testid={`cal-view-${v}`}>
            {t(`cal.view.${v}`)}
          </button>
        ))}
      </div>

      {err === "birth_required" ? <p className="rounded-2xl bg-warning-wash/50 px-4 py-3 text-sm text-warning-ink">{t("bond.needBirth")}</p> : err ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-warning-wash/40 px-4 py-3 text-sm text-warning-ink" data-testid="cal-error">
          <span>{t("bond.failed")}</span>
          <button type="button" onClick={() => { setErr(null); setAttempt((n) => n + 1); }} className="shrink-0 rounded-full border border-warning-ink/30 px-3 py-1 text-xs font-semibold">
            {t("ask.retry")}
          </button>
        </div>
      ) : null}

      {view === "month" ? (
        !data ? (
          !err ? <MonthSkeleton /> : null
        ) : data.locked ? (
          <div className="space-y-3" data-testid="cal-free">
            {data.days.map((d, i) => <DayDetail key={d.date} d={d} label={i === 0 ? t("cal.today") : t("cal.tomorrow")} today={data.today} zone={data.zone} nowMs={nowMs} />)}
            <section className="relative overflow-hidden rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6 text-center">
              <div className="pointer-events-none absolute inset-0 grid grid-cols-7 gap-1 p-3 opacity-25 blur-[2px]" aria-hidden>
                {Array.from({ length: 35 }, (_, i) => <span key={i} className={cn("rounded-lg", ["bg-[#cfe7d7]", "bg-[#f3e2bd]", "bg-[#ddd5f3]"][(i * 7) % 3])} />)}
              </div>
              <div className="relative">
                <Lock className="mx-auto h-6 w-6 text-gold-text" aria-hidden />
                <h2 className="mt-2 font-serif text-xl text-ink">{t("cal.locked.title")}</h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-ink-secondary">{t("cal.locked.sub")}</p>
                <button type="button" onClick={() => openPaywall("calendar")} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink" data-testid="cal-unlock">
                  {t("cal.locked.cta")}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button type="button" aria-label="previous month" onClick={() => setMonth(shiftMonth(data.month, -1))} className="rounded-full p-2 text-ink-secondary hover:bg-gold-wash/40"><ChevronLeft className="h-5 w-5" /></button>
              <p className="font-serif text-lg text-ink">{monthLabel(data.month, locale)}</p>
              <button type="button" aria-label="next month" onClick={() => setMonth(shiftMonth(data.month, 1))} className="rounded-full p-2 text-ink-secondary hover:bg-gold-wash/40" data-testid="cal-next"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <MonthGrid data={data} picked={picked} onPick={setPicked} />
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-secondary">
              {(["supportive", "mixed", "rest"] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1"><span className={cn("h-3.5 w-3.5 rounded border", TONE[k].dot)} />{t(`cal.tone.${k}`)}</span>
              ))}
            </div>
            <details className="rounded-2xl border border-line bg-paper px-4 py-2 text-xs text-ink-secondary" data-testid="cal-legend">
              <summary className="cursor-pointer py-1 font-semibold text-ink-tertiary">{t("cal.legend.title")}</summary>
              <p className="mt-1">{t("cal.legend.icon")}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {AREA_ORDER.map((a) => (
                  <span key={a}>{AREA_ICON[a as AreaId]} {t(`cal.area.${a}`)}</span>
                ))}
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warning-ink/70" />{t("cal.legend.dot")}</p>
            </details>
            {pickedDay ? <DayDetail d={pickedDay} label={pickedDay.date === data.today ? t("cal.today") : undefined} today={data.today} zone={data.zone} nowMs={nowMs} /> : null}
          </div>
        )
      ) : !year ? (
        !err ? <MonthSkeleton /> : null
      ) : year.locked ? (
        <section className="rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6 text-center" data-testid="cal-year-locked">
          <Lock className="mx-auto h-6 w-6 text-gold-text" aria-hidden />
          <p className="mt-2 text-sm text-ink-secondary">{t("cal.yearLocked")}</p>
          <button type="button" onClick={() => openPaywall("calendar")} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink">{t("cal.locked.cta")}</button>
        </section>
      ) : (
        <YearList data={year} />
      )}

      {data?.approximate ? <p className="mt-3 text-center text-xs text-ink-tertiary">{t("cal.approx")}</p> : null}
      <Link href="/timing" className="mt-6 block text-center text-sm font-semibold text-gold-text underline-offset-4 hover:underline">{t("cal.findDate")} →</Link>
    </div>
  );
}

/** Month-shaped placeholder while the first payload loads (no spinner, no layout jump). */
function MonthSkeleton() {
  return (
    <div className="space-y-3" data-testid="cal-skeleton" aria-busy="true">
      <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-line/60" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <span key={i} className="aspect-square animate-pulse rounded-lg bg-line/40" />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-2xl bg-line/30" />
    </div>
  );
}
