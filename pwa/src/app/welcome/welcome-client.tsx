"use client";

import { useSearchParams } from "next/navigation";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function WelcomeClient() {
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-text">
        Muhūrta
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-ink">
        Your life has a story.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
        Quiet gold editorial readings — decode who you are, walk your life chapters,
        and return each day with clear timing.
      </p>
      <div className="mt-auto pt-12">
        <OAuthButtons onGoogle={() => void signInWithGoogle()} busy={busy} />
      </div>
    </div>
  );
}
