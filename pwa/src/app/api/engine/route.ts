import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { createClient } from "@/lib/supabase/server";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // getSession() reads (and if needed refreshes) the cookie session without an extra
  // Auth round trip. The token is verified by the edge function itself (verify_jwt +
  // auth.getUser), so a forged cookie can't get past the engine.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json(
      { error: "Sign in required", error_code: "auth_required" },
      { status: 401 },
    );
  }

  try {
    const data = await invokeEngine(session.access_token, body);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Engine error";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : undefined;
    const status =
      code === "location_required"
        ? 422
        : code === "unauthenticated" || code === "http_401"
          ? 401
          : code === "birth_pack_not_ready"
            ? 503
            : code === "free_ask_limit_reached"
              ? 429
              : 400;
    return NextResponse.json({ error: message, ...(code ? { error_code: code } : {}) }, { status });
  }
}
