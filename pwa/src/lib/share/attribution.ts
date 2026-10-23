import { createClient } from "@/lib/supabase/client";

const KEY = "muh_attr_v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Attr = { src?: string; ref?: string; at: number; claimed?: boolean };

function read(): Attr | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attr) : null;
  } catch {
    return null;
  }
}

/** First touch wins for src; a shared-card ref is kept until claimed. */
export function rememberAttribution(src: string | null | undefined, ref: string | null | undefined) {
  if (typeof window === "undefined") return;
  const cleanSrc = src && /^[a-z0-9_:-]{1,64}$/i.test(src) ? src : undefined;
  const cleanRef = ref && UUID_RE.test(ref) ? ref : undefined;
  if (!cleanSrc && !cleanRef) return;
  const prev = read();
  if (prev?.claimed) return;
  const next: Attr = {
    src: prev?.src ?? cleanSrc,
    ref: prev?.ref ?? cleanRef,
    at: prev?.at ?? Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode */
  }
}

/** After sign-in: credit the sharer once (server ignores self-referrals and old accounts). */
export async function claimAttribution(): Promise<void> {
  const a = read();
  if (!a || a.claimed) return;
  if (Date.now() - a.at > 30 * 86400_000) {
    localStorage.removeItem(KEY);
    return;
  }
  const supabase = createClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.rpc("claim_share_referral", {
    p_share_id: a.ref ?? null,
    p_src: a.src ?? null,
  });
  if (!error) localStorage.setItem(KEY, JSON.stringify({ ...a, claimed: true }));
}
