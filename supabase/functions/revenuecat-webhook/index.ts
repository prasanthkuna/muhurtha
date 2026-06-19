import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type RcEvent = {
  type?: string;
  app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
};

type RcPayload = {
  event?: RcEvent;
};

const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function planFromEntitlements(ids: string[] | undefined, productId?: string): string {
  const normalized = (ids ?? []).map((id) => id.toLowerCase());
  if (
    normalized.includes("pro") ||
    normalized.includes("muhurta_pro") ||
    normalized.includes("muhurtha pro") ||
    normalized.includes("muhurtha_pro")
  ) {
    return "pro";
  }
  if (normalized.includes("plus") || normalized.includes("muhurta_plus")) return "plus";
  const product = (productId ?? "").toLowerCase();
  if (product.includes("pro")) return "pro";
  if (product.includes("plus")) return "plus";
  return "free";
}

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("warmup") === "1") {
      return new Response(
        JSON.stringify({
          ok: Boolean(supabaseUrl && serviceKey),
          service: "revenuecat-webhook",
          warmedAt: new Date().toISOString(),
        }),
        {
          status: supabaseUrl && serviceKey ? 200 : 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (webhookSecret) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let payload: RcPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = payload.event;
  if (!event?.app_user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_app_user_id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const profileId = event.app_user_id;
  const eventType = (event.type ?? "").toUpperCase();
  const cancelTypes = new Set([
    "CANCELLATION",
    "EXPIRATION",
    "BILLING_ISSUE",
    "SUBSCRIPTION_PAUSED",
  ]);

  const planCode = cancelTypes.has(eventType)
    ? "free"
    : planFromEntitlements(event.entitlement_ids, event.product_id);

  const status = planCode === "free" ? "expired" : "active";
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      profile_id: profileId,
      plan_code: planCode,
      status,
      provider: "revenuecat",
      provider_subscription_id: event.product_id ?? "revenuecat_active",
      current_period_start: msToIso(event.purchased_at_ms),
      current_period_end: msToIso(event.expiration_at_ms),
      entitlement: {
        event_type: eventType,
        entitlement_ids: event.entitlement_ids ?? [],
        product_id: event.product_id ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,provider,provider_subscription_id" },
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, planCode, status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
