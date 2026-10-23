"use client";

/** Client side of Pro billing. Only Razorpay's public key_id ever reaches the browser; the
 *  server creates subscriptions, verifies signatures and decides entitlements. */

export type PlanCode = "pro_monthly" | "pro_yearly";

export type AccessDetails = {
  isPro: boolean;
  isPlus?: boolean;
  planCode?: string;
  tier?: "free" | "pro";
  provider?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  planInterval?: string | null;
  limits?: {
    askPerDay: number | null;
    timingChecksPerDay: number | null;
    findDatePerDay: number | null;
    familyCharts: boolean;
    languageSwitch: boolean;
  };
};

export type BillingStatus = {
  access: AccessDetails;
  usage: { date: string; ask: number; timing_check: number; timing_find: number };
  languageCode: string;
  payments: {
    enabled: boolean;
    mode: "test" | "live" | null;
    plans: { code: PlanCode; period: string; amountPaise: number; currency: string }[];
  };
};

export type CheckoutOutcome =
  | { kind: "success"; access: AccessDetails }
  | { kind: "pending" }
  | { kind: "dismissed" }
  | { kind: "failed"; message?: string }
  | { kind: "unavailable" }
  | { kind: "already_pro" };

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  try {
    const { res, json } = await post({ action: "billing_status" });
    if (!res.ok) return null;
    return json as unknown as BillingStatus;
  } catch {
    return null;
  }
}

export async function setServerLanguage(code: string): Promise<{ ok: boolean; proRequired?: boolean }> {
  const { res, json } = await post({ action: "language_set", language_code: code });
  if (res.ok) return { ok: true };
  return { ok: false, proRequired: json.error_code === "pro_required_language" };
}

export async function cancelRenewal(): Promise<{ ok: boolean; access?: AccessDetails; code?: string; message?: string }> {
  const { res, json } = await post({ action: "billing_cancel" });
  if (res.ok) return { ok: true, access: json.access as AccessDetails };
  return { ok: false, code: json.error_code?.toString(), message: json.error?.toString() };
}

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Create the subscription on the server, open Razorpay Checkout, verify on the server. */
export async function startCheckout(
  planCode: PlanCode,
  opts: { description: string; themeColor?: string },
): Promise<CheckoutOutcome> {
  const [loaded, created] = await Promise.all([
    loadRazorpayScript(),
    post({ action: "billing_create_subscription", plan_code: planCode }),
  ]);
  const { res, json } = created;
  if (!res.ok) {
    const code = json.error_code?.toString();
    if (code === "payments_unavailable") return { kind: "unavailable" };
    if (code === "already_pro") return { kind: "already_pro" };
    return { kind: "failed", message: json.error?.toString() };
  }
  if (!loaded || !window.Razorpay) return { kind: "failed", message: "Checkout could not load" };

  const prefill = (json.prefill ?? {}) as Record<string, string | undefined>;
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const done = (o: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };
    const rzp = new window.Razorpay!({
      key: json.keyId,
      subscription_id: json.subscriptionId,
      name: "Muhūrta",
      description: opts.description,
      image: `${window.location.origin}/icons/icon-192.png`,
      prefill: {
        ...(prefill.email ? { email: prefill.email } : {}),
        ...(prefill.contact ? { contact: prefill.contact } : {}),
        ...(prefill.name ? { name: prefill.name } : {}),
      },
      notes: { plan_code: planCode },
      theme: { color: opts.themeColor ?? "#B8892F" },
      modal: {
        ondismiss: () => done({ kind: "dismissed" }),
        confirm_close: true,
      },
      handler: async (resp: RazorpayHandlerResponse) => {
        try {
          const v = await post({ action: "billing_verify", ...resp });
          if (v.res.ok && (v.json.access as AccessDetails | undefined)?.isPro) {
            done({ kind: "success", access: v.json.access as AccessDetails });
          } else {
            done({ kind: "pending" });
          }
        } catch {
          done({ kind: "pending" });
        }
      },
    });
    rzp.on("payment.failed", (r) => {
      // Razorpay keeps the modal open so the user can retry; remember the reason.
      if (r?.error?.description) console.warn("[checkout] payment failed:", r.error.description);
    });
    rzp.open();
  });
}
