"use client";

import { createClient } from "@/lib/supabase/client";

/** Start Google OAuth; returns an error message when it could not start. */
export async function signInWithGoogle(next: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return "Sign-in is not available right now.";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/decode";
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  return error ? error.message : null;
}
