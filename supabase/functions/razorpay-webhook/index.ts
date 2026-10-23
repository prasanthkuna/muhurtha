/**
 * Razorpay webhook (deployed with --no-verify-jwt; authenticity = X-Razorpay-Signature).
 * Dashboard -> Settings -> Webhooks: URL https://<project>.supabase.co/functions/v1/razorpay-webhook
 * Events: subscription.* and payment.failed. Secret = RAZORPAY_WEBHOOK_SECRET.
 */
import { createClient } from "@supabase/supabase-js";
import { handleWebhookEvent, verifyWebhookSignature } from "../muhurtha-api/razorpay.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "GET") {
    const ready = Boolean(Deno.env.get("RAZORPAY_WEBHOOK_SECRET"));
    return json({ ok: true, service: "razorpay-webhook", configured: ready });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = (Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "").trim();
  if (!secret) return json({ error: "webhook_not_configured" }, 503);

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!(await verifyWebhookSignature(raw, signature, secret))) {
    return json({ error: "invalid_signature" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Razorpay sends a unique id per event; fall back to a content hash for safety.
  let eventId = (req.headers.get("x-razorpay-event-id") ?? "").trim();
  if (!eventId) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    eventId = "sha256:" +
      Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  try {
    const result = await handleWebhookEvent(admin, eventId, body);
    // 5xx makes Razorpay retry; the event row stays unprocessed until a retry succeeds.
    return json(result, result.ok ? 200 : 500);
  } catch (e) {
    console.error("[razorpay-webhook]", e instanceof Error ? e.message : String(e));
    return json({ ok: false }, 500);
  }
});
