"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Crown, ShieldCheck, X } from "@/components/celestial/muh-icon";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { clearEngineCache } from "@/lib/engine-cache";
import { fetchBillingStatus, startCheckout, type AccessDetails, type PlanCode } from "@/lib/billing";
import { fill } from "@/lib/messages-bond";
import { logProduct } from "@/lib/product-events";

export type PaywallReason = "general" | "charts" | "language" | "ask" | "timing" | "chapter" | "bond" | "calendar";

/** Feature keys, in the same order as the Pro welcome cards (one story, before and after paying). */
export type ProFeature = "calendar" | "bond" | "chapters" | "family" | "ask" | "timing" | "language" | "birth";
const HERO: ProFeature[] = ["calendar", "bond", "chapters", "family"];
const STRIP: ProFeature[] = ["ask", "timing", "language", "birth"];

export function featureForReason(r: PaywallReason): ProFeature | null {
  switch (r) {
    case "bond": return "bond";
    case "calendar": return "calendar";
    case "chapter": return "chapters";
    case "charts": return "family";
    case "ask": return "ask";
    case "timing": return "timing";
    case "language": return "language";
    default: return null;
  }
}

/** Hero lines with the feature that opened the paywall first; strip items are promoted when they triggered it. */
export function orderedFeatures(r: PaywallReason): { hero: ProFeature[]; strip: ProFeature[] } {
  const first = featureForReason(r);
  if (!first) return { hero: HERO, strip: STRIP };
  return { hero: [first, ...HERO.filter((f) => f !== first)], strip: STRIP.filter((f) => f !== first) };
}

type Phase = "choose" | "busy";

export type CheckoutSuccess = { reason: PaywallReason; access: AccessDetails; lockedBefore: number };

export function PaywallSheet({
  reason,
  onClose,
  onSuccess,
}: {
  reason: PaywallReason | null;
  onClose: () => void;
  onSuccess: (s: CheckoutSuccess) => void;
}) {
  const { t } = useLocale();
  const { applyAccess, refresh, views } = useAppData();
  const [plan, setPlan] = useState<PlanCode>("pro_yearly");
  const [phase, setPhase] = useState<Phase>("choose");
  const [note, setNote] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ enabled: boolean; mode: string | null } | null>(null);

  // Effect callbacks through refs: the sheet loads billing status once per open, never in a loop
  // (applyAccess/onClose identity changes must not re-run it or reset the phase).
  const applyRef = useRef(applyAccess);
  const closeRef = useRef(onClose);
  applyRef.current = applyAccess;
  closeRef.current = onClose;

  const open = reason !== null;
  const lockedCount = views ? views.chapters().filter((c) => c.proLocked).length : 0;

  useEffect(() => {
    if (!open) return;
    setPhase("choose");
    setNote(null);
    let alive = true;
    void fetchBillingStatus().then((s) => {
      if (!alive) return;
      setPayments(s ? { enabled: s.payments.enabled, mode: s.payments.mode } : { enabled: false, mode: null });
      if (s?.access) applyRef.current(s.access);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) logProduct("paywall_view", { reason: reason ?? "general" });
  }, [open, reason]);

  if (!open) return null;

  const r = reason ?? "general";
  const enabled = payments?.enabled === true;
  const { hero, strip } = orderedFeatures(r);
  const trigger = featureForReason(r);

  async function onContinue() {
    setNote(null);
    setPhase("busy");
    logProduct("paywall_cta", { reason: r, plan });
    const outcome = await startCheckout(plan, {
      description: plan === "pro_yearly" ? `Pro · ${t("billing.yearly")}` : `Pro · ${t("billing.monthly")}`,
    });
    if (outcome.kind === "success") {
      // Count what was locked before the refresh unlocks it: that number is the welcome's payoff.
      const lockedBefore = lockedCount;
      applyRef.current(outcome.access);
      clearEngineCache();
      void refresh();
      logProduct("pro_purchased", { reason: r, plan });
      onSuccess({ reason: r, access: outcome.access, lockedBefore });
      return;
    }
    setPhase("choose");
    if (outcome.kind === "pending") setNote(t("billing.verifyPending"));
    else if (outcome.kind === "dismissed") setNote(t("billing.dismissed"));
    else if (outcome.kind === "unavailable") setPayments({ enabled: false, mode: null });
    else if (outcome.kind === "already_pro") setNote(t("billing.alreadyPro"));
    else setNote(t("billing.failed"));
  }

  const title = r === "general" ? t("pw.title.general") : t(`billing.title.${r}`);
  const sub = r === "general" ? t("pw.sub.general") : t(`billing.sub.${r}`);

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

        <div className="flex flex-col items-center pt-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-wash to-gold-accent/30 text-gold-text ring-1 ring-gold-accent/30">
            <Crown className="h-6 w-6" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-text">{t("pw.eyebrow")}</p>
          <h2 id="paywall-title" className="mt-1 font-serif text-[1.4rem] leading-snug text-ink">{title}</h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-secondary">{sub}</p>
          {lockedCount > 0 && (r === "general" || r === "chapter") ? (
            <p className="mt-2 rounded-full bg-gold-wash/60 px-3 py-1 text-xs font-semibold text-gold-text" data-testid="paywall-hook">
              {fill(t("pw.hook"), { n: lockedCount })}
            </p>
          ) : null}
        </div>

        <ul className="mt-4 space-y-2" data-testid="paywall-features">
          {hero.map((f, i) => {
            const lead = i === 0 && trigger === f;
            return (
              <li
                key={f}
                data-testid={`pw-f-${f}`}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-3.5 py-2.5",
                  lead ? "border-gold-accent/60 bg-gold-wash/45" : "border-line bg-gold-wash/10",
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-accent/25 text-gold-text">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{t(`pw.f.${f}`)}</span>
                  <span className="block text-xs leading-snug text-ink-secondary">{t(`pw.fs.${f}`)}</span>
                  {f === "bond" ? (
                    <span className="mt-1 inline-block rounded-full bg-success-wash px-2 py-0.5 text-[11px] font-semibold text-success-ink">
                      {t("pw.bondBoth")}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5" data-testid="paywall-strip">
          {strip.map((f) => (
            <span key={f} className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
              {t(`pw.s.${f}`)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-tertiary">{t("pw.free")}</p>

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
          {phase === "busy" ? t("billing.ctaBusy") : enabled ? t(`pw.cta.${plan}`) : payments ? t("billing.soon") : t("common.loading")}
        </button>

        {payments?.mode === "test" ? (
          <p className="mt-2 text-center text-[11px] text-ink-tertiary">{t("billing.testMode")}</p>
        ) : null}

        <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink-tertiary">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t("pw.fine")}</span>
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs">
          <Link href="/pricing" className="font-medium text-gold-text underline-offset-2 hover:underline" onClick={onClose}>
            {t("billing.terms")}
          </Link>
          <button type="button" onClick={onClose} className="font-medium text-ink-secondary">
            {t("billing.notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
