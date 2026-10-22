"use client";

import { useSearchParams } from "next/navigation";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Client island: session redirect + Google sign-in. Copy is server-rendered in page.tsx. */
export function WelcomeActions() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") || "/today";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const dest = await resolveInitialAppPath(supabase, next);
      router.replace(dest);
    })();
  }, [router, next]);

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next.startsWith("/") ? next : "/today",
    )}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
  }

  return <OAuthButtons onGoogle={() => void signInWithGoogle()} busy={busy} />;
}
