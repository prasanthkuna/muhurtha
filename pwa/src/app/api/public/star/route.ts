import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Public birth-star teaser for /welcome and /s/[id] (no sign-in, nothing stored, zero LLM). */
export async function POST(req: Request) {
  if (rateLimited(req, "star", 30)) return NextResponse.json({ error: "Too many tries — wait a minute", error_code: "rate_limited" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const r = await invokeEngine(undefined, {
      action: "star_quick_public",
      date_of_birth: b.date_of_birth, time: b.time, time_bucket: b.time_bucket, timezone: b.timezone, locale: b.locale,
    });
    return NextResponse.json(r);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "invalid_input";
    return NextResponse.json({ error: "Could not read that date", error_code: code }, { status: 400 });
  }
}
