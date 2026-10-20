"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/today";
  const urlError = params.get("error");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? decodeURIComponent(urlError) : null,
  );

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const dest = await resolveInitialAppPath(supabase, nextPath);
      router.replace(dest);
    })();
  }, [router, nextPath]);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Add Supabase keys to .env.local.");
      setBusy(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath.startsWith("/") ? nextPath : "/today",
    )}`;

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <Link href="/welcome" className="text-sm text-gold-text">
        ← Back
      </Link>
      <h1 className="mt-6 font-serif text-3xl text-ink">Sign in</h1>
      <p className="mt-2 text-ink-secondary">
        One tap with Google — we route you to Today or onboarding automatically.
      </p>

      <div className="mt-10">
        <OAuthButtons onGoogle={() => void signInWithGoogle()} busy={busy} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
