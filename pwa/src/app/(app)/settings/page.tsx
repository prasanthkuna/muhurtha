"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { clearPackCache } from "@/lib/pack-cache";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { pack, isPro, refresh } = useAppData();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  async function signOut() {
    clearPackCache();
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/welcome");
  }

  async function hardRefresh() {
    clearPackCache();
    await refresh();
  }

  return (
    <div className="space-y-6" data-testid="settings-loaded">
      <PageHeader eyebrow="Account" title="Settings" subtitle="Profile, cache, and sign-out." />

      <dl className="space-y-3 rounded-2xl border border-line bg-paper px-4 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Signed in as</dt>
          <dd className="text-right font-medium text-ink">{email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Display name</dt>
          <dd className="text-right font-medium text-ink">{pack?.displayName || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Plan</dt>
          <dd className="text-right font-medium text-ink">{isPro ? "Pro" : "Free"}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <PrimaryButton type="button" onClick={() => void hardRefresh()} className="w-full">
          Refresh reading cache
        </PrimaryButton>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-full border border-line bg-paper py-3 text-sm font-semibold text-warning-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
