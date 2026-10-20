"use client";

import Link from "next/link";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { createClient } from "@/lib/supabase/client";

const PLAY_STORE =
  "https://play.google.com/store/apps/details?id=app.muhurta";

export default function OnboardingPage() {
  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/welcome");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-canvas px-6 pb-10 pt-[max(4rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-text">
        Almost there
      </p>
      <h1 className="mt-4 font-serif text-3xl text-ink">Add your birth details</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
        New accounts need date, time, and place of birth to generate your Janma pack.
        The fastest path today is the Android app — your Google sign-in carries over.
      </p>
      <div className="mt-10 space-y-3">
        <PrimaryButton href={PLAY_STORE} className="w-full">
          Open Muhurtha on Google Play
        </PrimaryButton>
        <Link
          href="/settings"
          className="block text-center text-sm font-medium text-gold-text"
        >
          Account & settings
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full text-center text-sm text-ink-tertiary"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
