/**
 * Razorpay Subscriptions for the PWA (UPI Autopay, cards, netbanking).
 * - Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET (edge secrets only).
 * - Only key_id is ever returned to the browser.
 * - Entitlements live in public.subscriptions (provider = 'razorpay'); events are logged once in
 *   public.payment_events keyed by the x-razorpay-event-id header.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanCode = "pro_monthly" | "pro_yearly";

export const PRO_PLANS: Record<PlanCode, {
  period: "monthly" | "yearly";
  interval: number;
  amountPaise: number;
  totalCount: number;
  name: string;
  days: number;
}> = {
  pro_monthly: {
    period: "monthly",
    interval: 1,
    amountPaise: 9900,
    totalCount: 120,
    name: "Muhurta Pro - Monthly",
    days: 31,
  },
  pro_yearly: {
    period: "yearly",
    interval: 1,
    amountPaise: 49900,
    totalCount: 10,
    name: "Muhurta Pro - Yearly",
    days: 366,
  },
};

export function isPlanCode(v: unknown): v is PlanCode {
  return v === "pro_monthly" || v === "pro_yearly";
}

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
};

/** Null when payments are not configured yet ("coming soon" in the app). */
export function razorpayConfig(): RazorpayConfig | null {
  const keyId = (Deno.env.get("RAZORPAY_KEY_ID") ?? "").trim();
  const keySecret = (Deno.env.get("RAZORPAY_KEY_SECRET") ?? "").trim();
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: (Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "").trim(),
    mode: keyId.startsWith("rzp_live_") ? "live" : "test",
  };
}

const enc = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout handler signature for subscriptions: HMAC(payment_id + "|" + subscription_id). */
export async function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  keySecret: string,
): Promise<boolean> {
  if (!paymentId || !subscriptionId || !signature || !keySecret) return false;
  const expected = await hmacSha256Hex(keySecret, `${paymentId}|${subscriptionId}`);
  return safeEqual(expected, signature.trim().toLowerCase());
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<boolean> {
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return safeEqual(expected, signature.trim().toLowerCase());
}

export class RazorpayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function rzp<T = Record<string, unknown>>(
  cfg: RazorpayConfig,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${cfg.keyId}:${cfg.keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const err = (json.error ?? {}) as Record<string, unknown>;
    throw new RazorpayError(
      `Razorpay ${res.status}: ${String(err.description ?? err.code ?? "request failed")}`,
      res.status,
    );
  }
  return json as T;
}

/** Find or create the Razorpay plan for a code (stored per key mode, so test/live never mix). */
export async function ensurePlan(
  admin: SupabaseClient,
  cfg: RazorpayConfig,
  code: PlanCode,
): Promise<string> {
  const plan = PRO_PLANS[code];
  const { data } = await admin
    .from("billing_plans")
    .select("provider_plan_id")
    .eq("provider", "razorpay")
    .eq("mode", cfg.mode)
    .eq("code", code)
    .eq("amount_paise", plan.amountPaise)
    .maybeSingle();
  if (data?.provider_plan_id) return String(data.provider_plan_id);

  const created = await rzp<{ id: string }>(cfg, "POST", "/plans", {
    period: plan.period,
    interval: plan.interval,
    item: {
      name: plan.name,
      amount: plan.amountPaise,
      currency: "INR",
      description: "Muhurta Pro: family charts, every language, unlimited timing and more Ask.",
    },
    notes: { app: "muhurta", code },
  });
  const { error } = await admin.from("billing_plans").insert({
    provider: "razorpay",
    mode: cfg.mode,
    code,
    amount_paise: plan.amountPaise,
    period: plan.period,
    provider_plan_id: created.id,
  });
  if (error) {
    // Another request created it first: use the stored one.
    const { data: again } = await admin
      .from("billing_plans")
      .select("provider_plan_id")
      .eq("provider", "razorpay")
      .eq("mode", cfg.mode)
      .eq("code", code)
      .eq("amount_paise", plan.amountPaise)
      .maybeSingle();
    if (again?.provider_plan_id) return String(again.provider_plan_id);
    throw error;
  }
  return created.id;
}

export type RazorpaySubscriptionEntity = {
  id: string;
  plan_id?: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  charge_at?: number | null;
  notes?: Record<string, unknown> | unknown[] | null;
  paid_count?: number;
  short_url?: string;
};

/** Razorpay status -> our subscriptions.status (see is_pro() for what grants access). */
export function mapRazorpayStatus(status: string | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "authenticated":
    case "active":
      return "active";
    case "pending":
      return "past_due";
    case "cancelled":
    case "paused":
      return "cancelled";
    case "halted":
    case "completed":
    case "expired":
      return "expired";
    default:
      return "free"; // created: checkout not finished
  }
}

function planCodeForPlanId(planId: string | undefined, fallback?: string | null): PlanCode | null {
  if (isPlanCode(fallback)) return fallback;
  if (!planId) return null;
  return null;
}

function unixToIso(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(Number(v)) || Number(v) <= 0) return null;
  return new Date(Number(v) * 1000).toISOString();
}

function notesProfileId(notes: RazorpaySubscriptionEntity["notes"]): string | null {
  if (!notes || Array.isArray(notes)) return null;
  const v = (notes as Record<string, unknown>).profile_id;
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

function notesPlanCode(notes: RazorpaySubscriptionEntity["notes"]): string | null {
  if (!notes || Array.isArray(notes)) return null;
  const v = (notes as Record<string, unknown>).plan_code;
  return typeof v === "string" ? v : null;
}

/**
 * Write the subscription snapshot into public.subscriptions. Older snapshots never overwrite
 * newer ones (eventAt vs last_event_at), so out-of-order webhooks are safe.
 */
export async function applySubscriptionEntity(
  admin: SupabaseClient,
  entity: RazorpaySubscriptionEntity,
  opts: { eventAt?: string; source: string; profileId?: string | null; cancelAtPeriodEnd?: boolean },
): Promise<{ profileId: string | null; status: string; skipped?: string }> {
  const subId = entity.id;
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, profile_id, plan_interval, amount_paise, last_event_at, cancel_at_period_end, entitlement")
    .eq("provider", "razorpay")
    .eq("provider_subscription_id", subId)
    .maybeSingle();

  const profileId = (existing?.profile_id as string | undefined) ?? opts.profileId ??
    notesProfileId(entity.notes);
  if (!profileId) return { profileId: null, status: "unknown", skipped: "no_profile" };

  const eventAt = opts.eventAt ?? new Date().toISOString();
  if (existing?.last_event_at && Date.parse(String(existing.last_event_at)) > Date.parse(eventAt)) {
    return { profileId, status: "stale", skipped: "older_event" };
  }

  const status = mapRazorpayStatus(entity.status);
  const code = planCodeForPlanId(entity.plan_id, notesPlanCode(entity.notes)) ??
    (existing?.plan_interval === "yearly" ? "pro_yearly" : "pro_monthly");
  const plan = PRO_PLANS[code];
  let periodEnd = unixToIso(entity.current_end);
  if (!periodEnd && status === "active") {
    periodEnd = new Date(Date.now() + plan.days * 86_400_000).toISOString();
  }
  const rzpStatus = (entity.status ?? "").toLowerCase();
  const cancelAtPeriodEnd = opts.cancelAtPeriodEnd ??
    (rzpStatus === "cancelled" ? true : Boolean(existing?.cancel_at_period_end));

  const row = {
    profile_id: profileId,
    plan_code: "pro",
    status,
    provider: "razorpay",
    provider_subscription_id: subId,
    provider_plan_id: entity.plan_id ?? null,
    plan_interval: plan.period,
    amount_paise: plan.amountPaise,
    current_period_start: unixToIso(entity.current_start),
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    last_event_at: eventAt,
    entitlement: {
      ...((existing?.entitlement as Record<string, unknown> | null) ?? {}),
      source: opts.source,
      razorpay_status: rzpStatus || null,
      paid_count: entity.paid_count ?? null,
    },
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "profile_id,provider,provider_subscription_id" });
  if (error) throw error;
  return { profileId, status };
}

type WebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: { entity?: RazorpaySubscriptionEntity };
    payment?: { entity?: { id?: string; status?: string; error_description?: string } };
  };
};

export const HANDLED_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.paused",
  "subscription.resumed",
  "subscription.updated",
  "payment.failed",
]);

/**
 * Process one verified webhook delivery. Idempotent by event id: a retry of an event that was
 * already processed is acknowledged without touching data; a failed one is re-processed.
 */
export async function handleWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  body: WebhookPayload,
): Promise<{ ok: boolean; duplicate?: boolean; ignored?: boolean; status?: string; error?: string }> {
  const type = String(body.event ?? "unknown");
  const sub = body.payload?.subscription?.entity;
  const payment = body.payload?.payment?.entity;
  const eventAt = body.created_at
    ? new Date(Number(body.created_at) * 1000).toISOString()
    : new Date().toISOString();

  const { data: prior } = await admin
    .from("payment_events")
    .select("id, processed_at")
    .eq("provider", "razorpay")
    .eq("event_id", eventId)
    .maybeSingle();
  if (prior?.processed_at) return { ok: true, duplicate: true };

  let rowId = prior?.id as string | undefined;
  if (!rowId) {
    const { data: inserted, error: insErr } = await admin
      .from("payment_events")
      .insert({
        provider: "razorpay",
        event_id: eventId,
        event_type: type,
        provider_subscription_id: sub?.id ?? null,
        provider_payment_id: payment?.id ?? null,
        profile_id: notesProfileId(sub?.notes ?? null),
        payload: body as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();
    if (insErr) {
      // Concurrent delivery of the same event.
      if (String(insErr.code) === "23505") return { ok: true, duplicate: true };
      throw insErr;
    }
    rowId = inserted?.id as string;
  }

  try {
    let status: string | undefined;
    if (!HANDLED_EVENTS.has(type) || (!sub?.id && type !== "payment.failed")) {
      await admin.from("payment_events").update({ processed_at: new Date().toISOString() })
        .eq("id", rowId);
      return { ok: true, ignored: true };
    }
    if (sub?.id) {
      const r = await applySubscriptionEntity(admin, sub, {
        eventAt,
        source: `webhook:${type}`,
        cancelAtPeriodEnd: type === "subscription.cancelled" ? true : undefined,
      });
      status = r.status;
      if (r.profileId) {
        await admin.from("payment_events").update({ profile_id: r.profileId }).eq("id", rowId);
      }
    }
    await admin.from("payment_events").update({
      processed_at: new Date().toISOString(),
      error: null,
    }).eq("id", rowId);
    return { ok: true, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("payment_events").update({ error: msg.slice(0, 500) }).eq("id", rowId);
    return { ok: false, error: msg };
  }
}
