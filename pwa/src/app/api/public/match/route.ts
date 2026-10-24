import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Public guna check for /match (no sign-in, nothing stored, zero LLM). */
export async function POST(req: Request) {
  if (rateLimited(req, "match", 30)) return NextResponse.json({ error: "Too many checks — try again in a minute", error_code: "rate_limited" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { a?: unknown; b?: unknown };
  try {
    const r = await invokeEngine(undefined, { action: "match_quick_public", a: body.a ?? {}, b: body.b ?? {} });
    return NextResponse.json({ total: r.total, max: 36, band: r.band, approximate: r.approximate });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "invalid_input";
    return NextResponse.json({ error: "Could not check", error_code: code }, { status: 400 });
  }
}
