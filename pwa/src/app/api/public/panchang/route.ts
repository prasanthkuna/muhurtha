import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Today's real panchang for Hyderabad (Welcome sample card). Zero LLM; CDN-cached 15 minutes. */
export async function GET(req: Request) {
  if (rateLimited(req, "panchang", 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const r = await invokeEngine(undefined, { action: "panchang_today_public" });
    return NextResponse.json(r, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
