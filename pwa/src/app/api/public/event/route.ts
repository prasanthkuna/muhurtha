import { NextResponse } from "next/server";
import { invokeEngine } from "@/lib/muhurtha-engine";
import { rateLimited } from "@/lib/server/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Best-effort funnel event (allowlisted on the engine). Signed-in users are attributed server-side. */
export async function POST(req: Request) {
  if (rateLimited(req, "event", 60)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { name?: unknown; props?: unknown; anon_id?: unknown };
  let token: string | undefined;
  try {
    const sb = await createClient();
    const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
    token = data.session?.access_token;
  } catch { /* anonymous */ }
  try {
    await invokeEngine(token, { action: "funnel_event", name: b.name, props: b.props, anon_id: b.anon_id });
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true });
}
