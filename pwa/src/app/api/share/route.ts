import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CARD_LABELS, cardCaption, sanitizeCardPayload } from "@/lib/share/card-types";
import { SITE_URL } from "@/lib/share/server";

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

/** Create a share card owned by the signed-in user. Body: CardPayload-like JSON. */
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const payload = sanitizeCardPayload(await req.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Invalid card" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.id) return NextResponse.json({ error: "No profile" }, { status: 409 });

  const L = CARD_LABELS[payload.locale];
  const id = crypto.randomUUID();
  const url = `${SITE_URL}/s/${id}`;
  const { error } = await supabase.from("share_cards").insert({
    id,
    profile_id: profile.id,
    source_type: `card_${payload.type}`,
    card_type: payload.type,
    share_title: payload.data.title,
    share_body: payload.data.body ?? payload.data.value ?? payload.data.title,
    share_context: L.eyebrow[payload.type],
    share_text: cardCaption(payload, url),
    image_url: `${SITE_URL}/api/card/${id}`,
    deep_link: url,
    brand_variant: "cream_gold_v2",
    language_code: payload.locale,
    raw_payload: payload,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    id,
    url,
    imageUrl: `/api/card/${id}?size=feed`,
    ogImageUrl: `/api/card/${id}?size=og`,
    caption: cardCaption(payload, `${url}?src=share_${payload.type}`),
  });
}

/** Revoke one of your cards: { id }. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase
    .from("share_cards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
