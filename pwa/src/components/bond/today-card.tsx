"use client";

import { useState } from "react";
import { useLocale } from "@/context/locale-context";
import { cn } from "@/components/ui/cn";
import { bondPost, DAY_STYLE, type BondStatus, type Streak } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

/** "You two today": couple day type, one tiny action, and the couple streak. */
export function TodayCard({ status, partnerName }: { status: BondStatus; partnerName: string }) {
  const { t } = useLocale();
  const [streak, setStreak] = useState<Streak | null>(status.streak ?? null);
  const [busy, setBusy] = useState(false);
  const ct = status.couple_today;
  if (!ct) return null;
  const done = streak?.done_today.includes(ct.action_key) ?? false;
  const linked = status.link?.status === "linked";

  async function mark() {
    if (!ct || done) return;
    setBusy(true);
    try {
      const r = await bondPost<{ streak: Streak }>("bond_action_done", { action_key: ct.action_key });
      setStreak(r.streak);
      navigator.vibrate?.(20);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gold-accent/25 bg-gradient-to-br from-paper to-gold-wash/40 px-5 py-5" data-testid="bond-today">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text">{t("bond.today.title")}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", DAY_STYLE[ct.type].chip)}>{t(`bond.day.${ct.type}`)}</span>
      </div>
      <p className="mt-2 text-sm text-ink-secondary">{fill(t(`bond.dayLine.${ct.type}`), { name: partnerName })}</p>
      <div className="mt-3 flex items-center gap-3">
        <p className="flex-1 font-serif text-lg leading-snug text-ink">{t(`bond.action.${ct.action_key}`)}</p>
        <button
          type="button"
          disabled={busy || done}
          onClick={() => void mark()}
          className={cn(
            "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
            done ? "bg-success-wash text-success-ink" : "bg-gold-button text-ink",
          )}
          data-testid="bond-action-done"
        >
          {done ? t("bond.action.done") : t("bond.action.mark")}
        </button>
      </div>
      {streak ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
          <div>
            <p className="text-sm font-semibold text-ink" data-testid="bond-streak">
              🔥 {streak.mine > 0 ? fill(t("bond.streak.mine"), { n: streak.mine }) : t("bond.streak.start")}
            </p>
            <p className="text-xs text-ink-tertiary">
              {linked ? (streak.partner_done_today ? fill(t("bond.streak.partnerDone"), { name: partnerName }) : fill(t("bond.streak.partnerPending"), { name: partnerName })) : fill(t("bond.streak.best"), { n: streak.best })}
              {linked && streak.together > 0 ? ` · ${fill(t("bond.streak.together"), { n: streak.together })}` : ""}
            </p>
          </div>
          <div className="flex gap-1" aria-hidden>
            {streak.last7.map((d) => (
              <span key={d.date} className={cn("h-6 w-3 rounded-full", d.me && d.them ? "bg-[#d9825b]" : d.me ? "bg-gold-accent" : "bg-line")} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
