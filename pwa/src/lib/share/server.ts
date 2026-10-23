import { createClient as createAnonClient } from "@supabase/supabase-js";
import { sanitizeCardPayload, type CardPayload } from "@/lib/share/card-types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pwa-lyart-phi.vercel.app").replace(/\/$/, "");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/** Public card lookup (anon key → get_share_card SECURITY DEFINER; revoked/expired → null). */
export async function loadSharedCard(id: string): Promise<CardPayload | null> {
  if (!isUuid(id)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const sb = createAnonClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("get_share_card", { p_id: id });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return sanitizeCardPayload(row.payload);
}
