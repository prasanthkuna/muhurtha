"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { usePaywall } from "@/context/paywall-context";
import { bondPost, clock, monthLabel, shortDate, type AreaId, type CalDay, type YearMonth } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

type MonthResp = { locked: boolean; month: string; today: string; days: CalDay[]; approximate: boolean };
type YearResp = { locked: boolean; from: string; months: YearMonth[]; approximate: boolean };

const TONE: Record<CalDay["tone"], { cell: string; dot: string; chip: string }> = {
  supportive: { cell: "bg-success-wash/70", dot: "bg-success-ink/70", chip: "bg-success-wash text-success-ink" },
  mixed: { cell: "bg-paper", dot: "bg-gold-accent", chip: "bg-gold-wash text-gold-text" },
  rest: { cell: "bg-[#ece8f7]/70", dot: "bg-[#9a8fc4]", chip: "bg-[#ece8f7] text-[#4b3f80]" },
};
const AREA_ICON: Record<AreaId, string> = { money: "₹", travel: "✈", talks: "💬", love: "♥", health: "✚", rest: "☾", new_starts: "✦" };

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function DayDetail({ d, label }: { d: CalDay; label?: string }) {
  const { t, locale } = useLocale();
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-4" data-testid={`cal-detail-${d.date}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label ? `${label} · ` : ""}{shortDate(d.date, locale)}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONE[d.tone].chip)}>{t(`cal.tone.${d.tone}`)}</span>
      </div>
      {d.chandrashtama ? <p className="mt-2 rounded-lg bg-warning-wash/60 px-2.5 py-1.5 text-xs font-medium text-warning-ink">{t("cal.chandrashtama")}</p> : null}
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
        {d.best ? <span>{t("cal.best")}: <b className="font-semibold text-ink">{clock(d.best.start)}–{clock(d.best.end)}</b></span> : null}
        {d.rahu ? <span>{t("cal.rahu")}: {clock(d.rahu.start)}–{clock(d.rahu.end)}</span> : null}
      </div>
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
              d.date === picked ? "bg-ink text-paper" : TONE[d.tone].cell,
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
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t(`cal.theme.${m.theme}`)}</p>
          </div>
          <p className="mt-0.5 text-sm text-ink-secondary">{t(`cal.themeLine.${m.theme}`)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="rounded-full bg-success-wash px-2 py-0.5 text-success-ink">{fill(t("cal.year.supportive"), { n: m.supportive_days })}</span>
            <span className="rounded-full bg-[#ece8f7] px-2 py-0.5 text-[#4b3f80]">{fill(t("cal.year.rest"), { n: m.rest_days })}</span>
            {m.jupiter_lift ? <span className="rounded-full bg-gold-wash px-2 py-0.5 text-gold-text">♃ {t("cal.year.jupiter")}</span> : null}
            {m.slow ? <span className="rounded-full bg-warning-wash px-2 py-0.5 text-warning-ink">♄ {t(`cal.year.slow.${m.slow}`)}</span> : null}
            {m.ad_change ? <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-secondary">↻ {t("cal.year.adChange")}</span> : null}
          </div>
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
  const { isPro } = useAppData();
  const { openPaywall } = usePaywall();
  const [view, setView] = useState<"month" | "year">("month");
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<MonthResp | null>(null);
  const [year, setYear] = useState<YearResp | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    bondPost<MonthResp>("calendar_month_get", month ? { month } : {})
      .then((r) => {
        if (!alive) return;
        setData(r);
        setMonth((m) => m ?? r.month);
        setPicked((p) => (p && r.days.some((d) => d.date === p) ? p : r.days.find((d) => d.date >= r.today)?.date ?? r.days[0]?.date ?? null));
      })
      .catch((e) => alive && setErr((e as { code?: string }).code ?? "failed"));
    return () => {
      alive = false;
    };
  }, [month, isPro, locale]);

  useEffect(() => {
    if (view !== "year" || year) return;
    bondPost<YearResp>("calendar_year_get").then(setYear).catch(() => setErr("failed"));
  }, [view, year, isPro]);

  useEffect(() => setYear(null), [isPro]);
  const pickedDay = useMemo(() => data?.days.find((d) => d.date === picked) ?? null, [data, picked]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow={t("nav.calendar")} title={t("cal.title")} subtitle={t("cal.sub")} className="mb-5" />
      <div className="mb-4 flex gap-1 rounded-full bg-canvas p-1" role="tablist">
        {(["month", "year"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("min-h-10 flex-1 rounded-full text-sm font-semibold", view === v ? "bg-paper text-ink shadow-sm" : "text-ink-tertiary")} data-testid={`cal-view-${v}`}>
            {t(`cal.view.${v}`)}
          </button>
        ))}
      </div>

      {err === "birth_required" ? <p className="rounded-2xl bg-warning-wash/50 px-4 py-3 text-sm text-warning-ink">{t("bond.needBirth")}</p> : err ? <p className="text-sm text-warning-ink">{t("bond.failed")}</p> : null}

      {view === "month" ? (
        !data ? (
          !err ? <LoadingState /> : null
        ) : data.locked ? (
          <div className="space-y-3" data-testid="cal-free">
            {data.days.map((d, i) => <DayDetail key={d.date} d={d} label={i === 0 ? t("cal.today") : t("cal.tomorrow")} />)}
            <section className="relative overflow-hidden rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6 text-center">
              <div className="pointer-events-none absolute inset-0 grid grid-cols-7 gap-1 p-3 opacity-25 blur-[2px]" aria-hidden>
                {Array.from({ length: 35 }, (_, i) => <span key={i} className={cn("rounded-lg", ["bg-success-wash", "bg-gold-wash", "bg-[#ece8f7]"][(i * 7) % 3])} />)}
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
                <span key={k} className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", TONE[k].dot)} />{t(`cal.tone.${k}`)}</span>
              ))}
            </div>
            {pickedDay ? <DayDetail d={pickedDay} label={pickedDay.date === data.today ? t("cal.today") : undefined} /> : null}
          </div>
        )
      ) : !year ? (
        !err ? <LoadingState /> : null
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
