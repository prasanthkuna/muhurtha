"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/context/locale-context";
import { cn } from "@/components/ui/cn";
import { DAY_STYLE, type DayType, type MonthFactsView, type MonthText, shortDate } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

const WEEK_START = 1; // Monday-first grid

/** Couple month: colour-coded calendar, the guide text, key days, weekly lines. */
export function MonthView({ facts, text, today }: { facts: MonthFactsView; text: MonthText | null; today: string }) {
  const { t, locale } = useLocale();
  const [picked, setPicked] = useState<string | null>(() => facts.days.find((d) => d.date >= today)?.date ?? null);
  const byDate = useMemo(() => new Map(facts.days.map((d) => [d.date, d])), [facts.days]);
  const actions = useMemo(() => new Map((text?.key_days ?? []).map((k) => [k.date, k.action])), [text]);
  const weekLines = useMemo(() => new Map((text?.weeks ?? []).map((w) => [w.week_key, w.line])), [text]);
  const first = facts.days[0];
  const lead = first ? (first.weekday - WEEK_START + 7) % 7 : 0;
  const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", { weekday: "narrow" }));
  const pickedDay = picked ? byDate.get(picked) : null;
  const legend: DayType[] = ["warm", "talk", "soft", "support_b", "support_a"];
  const nameVars = { name: facts.b_name };

  return (
    <div className="space-y-5" data-testid="month-view">
      {text ? (
        <section className="rounded-3xl border border-gold-accent/25 bg-paper px-5 py-5">
          <h2 className="font-serif text-[1.35rem] leading-snug text-ink">{text.headline}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{text.body}</p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-paper px-3 py-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-tertiary">
          {wd.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
          {facts.days.map((d) => {
            const s = DAY_STYLE[d.type];
            const isToday = d.date === today;
            const on = d.date === picked;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setPicked(d.date)}
                aria-label={`${shortDate(d.date, locale)} · ${t(`bond.day.${d.type}`)}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-colors",
                  on ? "bg-ink text-paper" : isToday ? "bg-gold-wash text-ink" : "text-ink",
                )}
                data-testid={`mday-${d.date}`}
              >
                {Number(d.date.slice(8))}
                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", d.type === "ordinary" ? "opacity-0" : s.dot)} />
                {actions.has(d.date) ? <span className="absolute right-1 top-1 text-[8px] text-gold-accent">★</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-secondary">
          {legend.map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", DAY_STYLE[k].dot)} />
              {t(`bond.day.${k}`)}
            </span>
          ))}
        </div>
        {pickedDay ? (
          <div className="mx-1 mt-3 rounded-2xl bg-canvas px-4 py-3" data-testid="mday-detail">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{shortDate(pickedDay.date, locale)}</p>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", DAY_STYLE[pickedDay.type].chip)}>{t(`bond.day.${pickedDay.type}`)}</span>
            </div>
            <p className="mt-1.5 text-sm text-ink-secondary">{fill(t(`bond.dayLine.${pickedDay.type}`), nameVars)}</p>
            {actions.get(pickedDay.date) ? <p className="mt-1.5 text-sm font-medium text-ink">★ {actions.get(pickedDay.date)}</p> : null}
          </div>
        ) : (
          <p className="mt-2 text-center text-xs text-ink-tertiary">{t("bond.month.legend")}</p>
        )}
      </section>

      {facts.notes.length ? (
        <section className="space-y-2">
          {facts.notes.map((n, i) => (
            <p key={i} className={cn("rounded-xl px-3 py-2 text-sm", n.code === "romance_lift" ? "bg-[#fbe3d6]/60 text-[#7a3a1d]" : "bg-warning-wash/60 text-warning-ink")}>
              {fill(t(`bond.note.${n.code}`), { name: n.who === "a" ? t("bond.love.you") : facts.b_name, from: shortDate(n.from, locale), to: shortDate(n.to, locale) })}
            </p>
          ))}
        </section>
      ) : null}

      {text ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-success-ink/20 bg-success-wash/40 px-4 py-3">
              <h3 className="text-sm font-semibold text-success-ink">{t("bond.month.do")}</h3>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">{text.do.map((x) => <li key={x}>• {x}</li>)}</ul>
            </section>
            <section className="rounded-2xl border border-warning-ink/20 bg-warning-wash/40 px-4 py-3">
              <h3 className="text-sm font-semibold text-warning-ink">{t("bond.month.dont")}</h3>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">{text.dont.map((x) => <li key={x}>• {x}</li>)}</ul>
            </section>
          </div>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gold-text">{t("bond.month.weeks")}</h3>
            {facts.weeks.map((w) => (
              <div key={w.week_key} className="flex gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
                <span className="w-24 shrink-0 text-xs font-semibold text-ink-tertiary">{shortDate(w.from, locale)} – {shortDate(w.to, locale)}</span>
                <span className="text-sm text-ink">{weekLines.get(w.week_key) ?? ""}</span>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
