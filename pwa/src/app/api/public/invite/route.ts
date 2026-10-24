import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Public invite preview for /join/<token>: first names + expiry only. */
export async function GET(req: Request) {
  if (rateLimited(req, "invite", 20)) return NextResponse.json({ error_code: "rate_limited" }, { status: 429 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    const r = await invokeEngine(undefined, { action: "invite_preview", token });
    return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "invite_invalid";
    return NextResponse.json({ error_code: code === "http_404" ? "invite_invalid" : code }, { status: 404 });
  }
}
