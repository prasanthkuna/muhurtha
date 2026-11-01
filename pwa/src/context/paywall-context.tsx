"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PaywallSheet, type CheckoutSuccess, type PaywallReason } from "@/components/billing/paywall-sheet";
import { ProWelcome, proWelcomedKey } from "@/components/billing/pro-welcome";
import { useAppData } from "@/context/app-data-context";

type PaywallContextValue = {
  openPaywall: (reason?: PaywallReason) => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

/** Pro that started this long ago or earlier never gets the welcome (existing Pro users). */
const WELCOME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type WelcomeState = { reason: PaywallReason; lockedBefore: number; key: string };

function seen(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

export function PaywallProvider({ children }: { children: ReactNode }) {
  const { access, userId, views } = useAppData();
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const [welcome, setWelcome] = useState<WelcomeState | null>(null);
  const openPaywall = useCallback((r: PaywallReason = "general") => setReason(r), []);
  const closePaywall = useCallback(() => setReason(null), []);

  const onSuccess = useCallback(
    (s: CheckoutSuccess) => {
      const key = proWelcomedKey(userId, s.access.subscriptionId);
      markSeen(key);
      setReason(null);
      setWelcome({ reason: s.reason, lockedBefore: s.lockedBefore, key });
    },
    [userId],
  );

  // Pro that started outside the sheet (webhook after a pending verify, manual grant, another
  // device): show the welcome once per subscription, the first time this app sees it.
  const subId = access?.isPro ? access.subscriptionId ?? null : null;
  const startedAt = access?.startedAt ?? null;
  useEffect(() => {
    if (!subId || !userId || welcome || reason) return;
    const started = startedAt ? Date.parse(startedAt) : NaN;
    if (!Number.isFinite(started) || Date.now() - started > WELCOME_WINDOW_MS) return;
    const key = proWelcomedKey(userId, subId);
    if (seen(key)) return;
    markSeen(key);
    const locked = views ? views.chapters().filter((c) => c.proLocked).length : 0;
    setWelcome({ reason: "general", lockedBefore: locked, key });
    // views read once at trigger time on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId, startedAt, userId, welcome, reason]);

  const closeWelcome = useCallback(() => setWelcome(null), []);
  const value = useMemo(() => ({ openPaywall, closePaywall }), [openPaywall, closePaywall]);
  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallSheet reason={reason} onClose={closePaywall} onSuccess={onSuccess} />
      {welcome ? <ProWelcome reason={welcome.reason} lockedBefore={welcome.lockedBefore} onClose={closeWelcome} /> : null}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall outside PaywallProvider");
  return ctx;
}
