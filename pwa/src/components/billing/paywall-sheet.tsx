"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Crown, ShieldCheck, X } from "@/components/celestial/muh-icon";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { clearEngineCache } from "@/lib/engine-cache";
import { fetchBillingStatus, startCheckout, type PlanCode } from "@/lib/billing";

export type PaywallReason = "general" | "charts" | "language" | "ask" | "timing" | "chapter";

const FEATURES = ["family", "language", "timing", "ask", "chapters"] as const;

type Phase = "choose" | "busy" | "success";

export function PaywallSheet({ reason, onClose }: { reason: PaywallReason | null; onClose: () => void }) {
  const { t } = useLocale();
  const { applyAccess, refresh } = useAppData();
  const [plan, setPlan] = useState<PlanCode>("pro_yearly");
  const [phase, setPhase] = useState<Phase>("choose");
  const [note, setNote] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ enabled: boolean; mode: string | null } | null>(null);

  const open = reason !== null;

  useEffect(() => {
    if (!open) return;
    setPhase("choose");
    setNote(null);
    let alive = true;
    void fetchBillingStatus().then((s) => {
      if (!alive) return;
      setPayments(s ? { enabled: s.payments.enabled, mode: s.payments.mode } : { enabled: false, mode: null });
      if (s?.access) applyAccess(s.access);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, applyAccess]);

  if (!open) return null;

  const r = reason ?? "general";
  const enabled = payments?.enabled === true;

  async function onContinue() {
    setNote(null);
    setPhase("busy");
    const outcome = await startCheckout(plan, {
      description: plan === "pro_yearly" ? `Pro · ${t("billing.yearly")}` : `Pro · ${t("billing.monthly")}`,
    });
    if (outcome.kind === "success") {
      applyAccess(outcome.access);
      clearEngineCache();
      void refresh();
      setPhase("success");
      return;
    }
    setPhase("choose");
    if (outcome.kind === "pending") setNote(t("billing.verifyPending"));
    else if (outcome.kind === "dismissed") setNote(t("billing.dismissed"));
    else if (outcome.kind === "unavailable") setPayments({ enabled: false, mode: null });
    else if (outcome.kind === "already_pro") setNote(t("billing.alreadyPro"));
    else setNote(t("billing.failed"));
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4" data-testid="paywall">
      <button type="button" aria-label={t("billing.notNow")} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-gold-accent/30 bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("billing.notNow")}
          className="absolute right-3 top-3 rounded-full p-2 text-ink-tertiary hover:bg-gold-wash/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        {phase === "success" ? (
          <div className="py-6 text-center" data-testid="paywall-success">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-wash text-success-ink">
              <Check className="h-8 w-8" strokeWidth={2.2} aria-hidden />
            </span>
            <h2 id="paywall-title" className="mt-4 font-serif text-2xl text-ink">{t("billing.successTitle")}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">{t("billing.successBody")}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink"
            >
              {t("billing.successCta")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center pt-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-wash to-gold-accent/30 text-gold-text ring-1 ring-gold-accent/30">
                <Crown className="h-7 w-7" strokeWidth={1.6} aria-hidden />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-text">{t("billing.title.general")}</p>
              <h2 id="paywall-title" className="mt-1 font-serif text-[1.45rem] leading-snug text-ink">
                {t(`billing.title.${r}`)}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">{t(`billing.sub.${r}`)}</p>
            </div>

            <ul className="mt-5 space-y-2.5 rounded-2xl border border-line bg-gold-wash/15 px-4 py-3.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-accent/20 text-gold-text">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  </span>
                  {t(`billing.f.${f}`)}
                </li>
              ))}
              <li className="pt-1 text-xs text-ink-tertiary">{t("billing.f.free")}</li>
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup">
              {(["pro_yearly", "pro_monthly"] as PlanCode[]).map((code) => {
                const yearly = code === "pro_yearly";
                const selected = plan === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`plan-${code}`}
                    onClick={() => setPlan(code)}
                    className={cn(
                      "relative rounded-2xl border px-3 pb-3 pt-4 text-left transition-colors",
                      selected
                        ? "border-gold-accent bg-gold-wash/40 ring-2 ring-gold-accent/40"
                        : "border-line bg-paper hover:border-gold-accent/40",
                    )}
                  >
                    {yearly ? (
                      <span className="absolute -top-2.5 left-3 rounded-full bg-gold-button px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                        {t("billing.bestValue")}
                      </span>
                    ) : null}
                    <span className="block text-xs font-semibold text-ink-secondary">
                      {t(yearly ? "billing.yearly" : "billing.monthly")}
                    </span>
                    <span className="mt-1 block font-serif text-2xl text-ink">
                      {t(yearly ? "billing.yearlyPrice" : "billing.monthlyPrice")}
                      <span className="ml-0.5 font-sans text-xs text-ink-tertiary">
                        {t(yearly ? "billing.yearlyPer" : "billing.monthlyPer")}
                      </span>
                    </span>
                    <span className={cn("mt-1 block text-[11px]", yearly ? "font-semibold text-success-ink" : "text-ink-tertiary")}>
                      {t(yearly ? "billing.yearlyNote" : "billing.monthlyNote")}
                    </span>
                  </button>
                );
              })}
            </div>

            {payments && !enabled ? (
              <div className="mt-4 rounded-xl bg-gold-wash/40 px-3 py-2.5 text-center text-xs text-ink-secondary" data-testid="paywall-soon">
                {t("billing.soonNote")}
              </div>
            ) : null}
            {note ? <p className="mt-3 text-center text-sm text-warning-ink" role="status">{note}</p> : null}

            <button
              type="button"
              data-testid="paywall-cta"
              disabled={!enabled || phase === "busy"}
              onClick={() => void onContinue()}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-button px-6 text-sm font-semibold text-ink shadow-sm transition-opacity disabled:opacity-55"
            >
              {phase === "busy" ? t("billing.ctaBusy") : enabled ? t("billing.cta") : payments ? t("billing.soon") : t("common.loading")}
            </button>

            {payments?.mode === "test" ? (
              <p className="mt-2 text-center text-[11px] text-ink-tertiary">{t("billing.testMode")}</p>
            ) : null}

            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink-tertiary">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t("billing.fine")}</span>
            </p>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs">
              <Link href="/pricing" className="font-medium text-gold-text underline-offset-2 hover:underline" onClick={onClose}>
                {t("billing.terms")}
              </Link>
              <button type="button" onClick={onClose} className="font-medium text-ink-secondary">
                {t("billing.notNow")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
