"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/editorial/loading-state";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/client";

/** Magic-link / implicit flow (#access_token=). Google OAuth uses /auth/callback?code= (server route). */
export default function AuthFinishPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase not configured.");
        return;
      }

      const next = params.get("next") ?? "/today";

      try {
        if (typeof window !== "undefined" && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (!access_token || !refresh_token) {
            throw new Error("No session tokens in callback URL.");
          }
          const { error: err } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (err) throw err;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("No session in callback URL.");
          }
        }

        const dest = await resolveInitialAppPath(supabase, next);
        router.replace(dest);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm text-warning-ink">{error}</p>
        <a href="/auth" className="mt-4 inline-block text-sm text-gold-text">
          Back to sign in
        </a>
      </div>
    );
  }

  return <LoadingState message="Signing you in…" />;
}
