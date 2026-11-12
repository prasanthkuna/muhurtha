import { createClient } from "@/lib/supabase/server";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ENGINE_REGION = process.env.SUPABASE_FUNCTIONS_REGION || "ap-south-1";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Streams the engine's Ask (server-sent events) straight through to the app. */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = await createClient();
  if (!supabase || !url || !key) return json(503, { error: "Supabase not configured", error_code: "engine_unavailable" });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return json(401, { error: "Sign in required", error_code: "auth_required" });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let upstream: Response;
  try {
    upstream = await fetch(`${url}/functions/v1/muhurtha-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: key,
        "x-region": ENGINE_REGION,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...body, action: "ask_stream" }),
      cache: "no-store",
      signal: req.signal,
    });
  } catch {
    return json(502, { error: "Engine unreachable", error_code: "engine_unavailable" });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.includes("text/event-stream") || !upstream.body) {
    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(data.error_code ?? `http_${upstream.status}`);
    const status = code === "free_ask_limit_reached" || code === "ask_fair_use_reached" ? 429 : upstream.status >= 400 ? upstream.status : 502;
    return json(status, { error: data.error ?? "Ask failed", error_code: code });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
