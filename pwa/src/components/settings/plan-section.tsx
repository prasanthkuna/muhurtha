"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown } from "@/components/celestial/muh-icon";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { usePaywall } from "@/context/paywall-context";
import { cancelRenewal, type BillingStatus } from "@/lib/billing";
import { formatDisplayDate } from "@/lib/format-date";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-secondary">{label}</span>
        <span className="font-medium tabular-nums text-ink">
          {Math.min(used, limit)}/{limit}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/70">
        <div
          className={`h-full rounded-full ${used >= limit ? "bg-warning-ink/70" : "bg-gold-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanSection() {
  const { t, locale } = useLocale();
  const { isPro, access, refreshAccess, applyAccess } = useAppData();
  const { openPaywall } = usePaywall();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void refreshAccess().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const a = status?.access ?? access;
  const provider = a?.provider ?? null;
  const end = a?.currentPeriodEnd ? a.currentPeriodEnd.slice(0, 10) : null;
  const cancelled = a?.cancelAtPeriodEnd === true;
  const sourceKey =
    provider === "razorpay"
      ? "billing.sourceRazorpay"
      : provider === "revenuecat" || provider === "play"
        ? "billing.sourcePlay"
        : "billing.sourceManual";

  async function onCancel() {
    if (!window.confirm(t("billing.cancelConfirm"))) return;
    setBusy(true);
    setMsg(null);
    const r = await cancelRenewal();
    setBusy(false);
    if (r.ok && r.access) {
      applyAccess(r.access);
      setStatus((s) => (s ? { ...s, access: r.access! } : s));
      setMsg(t("billing.cancelDone"));
    } else {
      setMsg(r.code === "manage_elsewhere" ? t("billing.cancelPlay") : (r.message ?? t("billing.failed")));
    }
  }

  return (
    <section className="space-y-2" data-testid="plan-section">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">{t("billing.planTitle")}</h2>
      <div className="overflow-hidden rounded-2xl border border-gold-accent/30 bg-paper">
        <div className="flex items-center gap-3 bg-gradient-to-br from-gold-wash/60 via-paper to-paper px-4 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-wash text-gold-text ring-1 ring-gold-accent/30">
            <Crown className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-xl text-ink">
              {isPro ? `Muhūrta ${t("billing.planPro")}` : t("billing.planFree")}
            </p>
            {isPro ? (
              <p className="text-xs text-ink-tertiary">
                {t(sourceKey)}
                {a?.planInterval ? ` · ${t(a.planInterval === "yearly" ? "billing.yearly" : "billing.monthly")}` : ""}
              </p>
            ) : (
              <p className="text-xs text-ink-tertiary">{t("billing.freeLine")}</p>
            )}
          </div>
          {cancelled && isPro ? (
            <span className="rounded-full bg-warning-wash px-2 py-0.5 text-[11px] font-semibold text-warning-ink">
              {t("billing.cancelled")}
            </span>
          ) : null}
        </div>

        {isPro && end ? (
          <div className="flex justify-between border-t border-line/80 px-4 py-2.5 text-sm">
            <span className="text-ink-tertiary">
              {provider === "razorpay" && !cancelled ? t("billing.renewsOn") : t("billing.endsOn")}
            </span>
            <span className="font-medium text-ink">{formatDisplayDate(end, locale, { weekday: false })}</span>
          </div>
        ) : null}

        {!isPro && status?.usage ? (
          <div className="space-y-2.5 border-t border-line/80 px-4 py-3">
            <p className="text-xs font-semibold text-ink-secondary">{t("billing.usageTitle")}</p>
            <UsageBar label={t("billing.usageAsk")} used={status.usage.ask} limit={status.access.limits?.askPerDay ?? 3} />
            <UsageBar
              label={t("billing.usageTiming")}
              used={status.usage.timing_check}
              limit={status.access.limits?.timingChecksPerDay ?? 3}
            />
            <UsageBar
              label={t("billing.usageFind")}
              used={status.usage.timing_find}
              limit={status.access.limits?.findDatePerDay ?? 3}
            />
            <p className="text-[11px] text-ink-tertiary">{t("billing.resets")}</p>
          </div>
        ) : null}

        <div className="border-t border-line/80 px-4 py-3">
          {!isPro ? (
            <button
              type="button"
              data-testid="plan-upgrade"
              onClick={() => openPaywall("general")}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gold-button text-sm font-semibold text-ink"
            >
              <Crown className="h-4 w-4" aria-hidden />
              {t("billing.upgrade")} · ₹99
            </button>
          ) : provider === "razorpay" && !cancelled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCancel()}
              className="w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-secondary disabled:opacity-60"
            >
              {t("billing.cancel")}
            </button>
          ) : provider === "revenuecat" || provider === "play" ? (
            <p className="text-xs text-ink-tertiary">{t("billing.cancelPlay")}</p>
          ) : null}
          {msg ? <p className="mt-2 text-sm text-ink-secondary">{msg}</p> : null}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
            <Link href="/pricing" className="text-gold-text">{t("billing.legal.pricing")}</Link>
            <Link href="/refund" className="text-gold-text">{t("billing.legal.refund")}</Link>
            <Link href="/contact" className="text-gold-text">{t("billing.legal.contact")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
