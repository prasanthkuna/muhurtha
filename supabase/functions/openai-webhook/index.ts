/**
 * OpenAI webhook receiver (Standard Webhooks signature). On response.* events it relays the
 * response id to muhurtha-api's `reading_sweep`, which finishes the matching generation job.
 * Without OPENAI_WEBHOOK_SECRET this endpoint refuses everything; the pg_cron sweep and
 * client polling still complete readings on their own.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOLERANCE_S = 5 * 60;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verify(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now - t) > TOLERANCE_S) return false;
  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = bytesToB64(mac);
  return sigHeader.split(" ").some((part) => {
    const [ver, sig] = part.split(",");
    return ver === "v1" && !!sig && safeEqual(sig, expected);
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const secret = Deno.env.get("OPENAI_WEBHOOK_SECRET") ?? "";
  if (!secret) return new Response(JSON.stringify({ error: "webhook_not_configured" }), { status: 503 });
  const body = await req.text();
  const ok = await verify(
    secret,
    req.headers.get("webhook-id") ?? "",
    req.headers.get("webhook-timestamp") ?? "",
    body,
    req.headers.get("webhook-signature") ?? "",
  );
  if (!ok) return new Response(JSON.stringify({ error: "bad_signature" }), { status: 401 });
  let event: { type?: string; data?: { id?: string } } = {};
  try {
    event = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400 });
  }
  const responseId = event.data?.id;
  if (!event.type?.startsWith("response.") || !responseId) {
    return new Response(JSON.stringify({ ignored: event.type ?? null }), { status: 200 });
  }
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/muhurtha-api`;
  const relay = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
      "x-push-cron-secret": Deno.env.get("PUSH_CRON_SECRET") ?? "",
    },
    body: JSON.stringify({ action: "reading_sweep", response_id: responseId }),
  }).then((r) => r.text()).catch((e) => console.warn("[openai-webhook] relay failed", String(e)));
  // Acknowledge fast; finish the relay in the background.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil?.(relay);
  return new Response(JSON.stringify({ ok: true, type: event.type }), { status: 200 });
});
