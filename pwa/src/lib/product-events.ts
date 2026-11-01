"use client";

/** Best-effort funnel/product events. Never throws, never blocks UI. */
export type ProductEvent =
  | "welcome_view" | "welcome_locale" | "teaser_submit" | "teaser_result" | "signin_click" | "onboarding_view"
  | "onboarding_submit" | "reading_ready" | "install_prompt_view" | "install_accept" | "share_landing_view"
  | "share_cta" | "share_whatsapp" | "match_prefill" | "paywall_view" | "paywall_cta" | "pro_purchased"
  | "pro_welcome_view" | "pro_welcome_cta";

const ANON_KEY = "muh_anon_id_v1";

function anonId(): string | null {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function logProduct(name: ProductEvent, props: Record<string, string | number | boolean | null | undefined> = {}) {
  if (typeof window === "undefined") return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) if (v !== null && v !== undefined) clean[k] = v;
  try {
    const body = JSON.stringify({ name, props: clean, anon_id: anonId() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/public/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* ignore */ }
}
