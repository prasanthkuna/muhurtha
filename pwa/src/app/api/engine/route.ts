import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Sign in required", error_code: "auth_required" },
      { status: 401 },
    );
  }

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
    return NextResponse.json(
      { error: message, ...(code ? { error_code: code } : {}) },
      { status: code === "location_required" ? 422 : 400 },
    );
  }
}
