import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Service worker: a notification (or one of its buttons) was tapped. Best effort. */
export async function POST(req: Request) {
  if (rateLimited(req, "push-click", 60)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { sid?: unknown; nid?: unknown; action?: unknown };
  const sid = typeof b.sid === "string" ? b.sid.slice(0, 40) : "";
  const nid = typeof b.nid === "string" ? b.nid.slice(0, 160) : "";
  if (!sid || !nid) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await invokeEngine(undefined, {
      action: "notification_click", sid, nid, click_action: typeof b.action === "string" ? b.action.slice(0, 40) : "open",
    });
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true });
}
