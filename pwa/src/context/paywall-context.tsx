"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PaywallSheet, type PaywallReason } from "@/components/billing/paywall-sheet";

type PaywallContextValue = {
  openPaywall: (reason?: PaywallReason) => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const openPaywall = useCallback((r: PaywallReason = "general") => setReason(r), []);
  const closePaywall = useCallback(() => setReason(null), []);
  const value = useMemo(() => ({ openPaywall, closePaywall }), [openPaywall, closePaywall]);
  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallSheet reason={reason} onClose={closePaywall} />
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall outside PaywallProvider");
  return ctx;
}
