"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  const urlErrorDesc = params.get("error_description");

  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(() => params.get("method") === "email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (urlErrorDesc) return decodeURIComponent(urlErrorDesc);
    if (urlError === "provider_not_enabled") {
      return "Google sign-in is not configured yet. Add Client ID and secret in Supabase → Authentication → Google.";
    }
    return urlError ? decodeURIComponent(urlError) : null;
  });

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;

      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        router.replace(`/auth/finish?next=${encodeURIComponent(nextPath)}${window.location.hash}`);
        return;
      }

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

  async function signInWithEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Add Supabase keys to .env.local.");
      setBusy(false);
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(err.message === "Invalid login credentials" ? "That email and password don't match." : err.message);
      setBusy(false);
      return;
    }
    const dest = await resolveInitialAppPath(supabase, nextPath.startsWith("/") ? nextPath : "/today");
    router.replace(dest);
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

      {showEmail ? (
        <form onSubmit={(e) => void signInWithEmail(e)} className="mt-6 space-y-3" aria-label="Sign in with email">
          <label className="block text-sm text-ink-secondary">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-gold-text"
            />
          </label>
          <label className="block text-sm text-ink-secondary">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-gold-text"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-ink px-4 py-3 font-medium text-paper disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="mt-5 self-center text-sm text-ink-secondary underline underline-offset-4 hover:text-gold-text"
        >
          Sign in with email
        </button>
      )}

      {error ? (
        <p className="mt-4 text-sm text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-auto pt-10 text-center text-xs text-ink-tertiary">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  );
}
