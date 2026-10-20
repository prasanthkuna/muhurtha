"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { accountDeletionMailto, LegalUrls } from "@/lib/legal-urls";
import { clearPackCache } from "@/lib/pack-cache";
import { createClient } from "@/lib/supabase/client";

function SettingsLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "flex min-h-11 items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-gold-accent/40";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
        <span className="text-ink-tertiary" aria-hidden>
          ↗
        </span>
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default function SettingsPage() {
  const { pack, isPro, refresh, today } = useAppData();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string>("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      setEmail(auth.user?.email ?? null);
      setPhone(auth.user?.phone ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_city, current_lat, current_lng")
        .eq("user_id", auth.user?.id ?? "")
        .maybeSingle();
      if (profile?.current_city) setCurrentCity(profile.current_city);
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

  async function detectLocation() {
    setLocationBusy(true);
    setLocationMsg(null);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation is not available in this browser.");
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 20_000,
        });
      });
      const supabase = createClient();
      if (!supabase) throw new Error("Not signed in.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in.");

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          current_lat: lat,
          current_lng: lng,
          current_city: currentCity.trim() || pack?.locationLabel || "Current location",
        })
        .eq("user_id", auth.user.id);
      if (upErr) throw upErr;

      setLocationMsg("Location saved. Refreshing today’s windows…");
      clearPackCache();
      await refresh();
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : "Could not detect location.");
    } finally {
      setLocationBusy(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="settings-loaded">
      <PageHeader
        eyebrow="Profile"
        title="Settings"
        subtitle="Account, location for timings, legal links, and cache."
      />

      <dl className="space-y-3 rounded-2xl border border-line bg-paper px-4 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Signed in as</dt>
          <dd className="text-right font-medium text-ink">{email ?? phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Display name</dt>
          <dd className="text-right font-medium text-ink">{pack?.displayName || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Plan</dt>
          <dd className="text-right font-medium text-ink">{isPro ? "Pro" : "Free"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Timings location</dt>
          <dd className="text-right font-medium text-ink">
            {today?.locationVerified
              ? today.locationLabel || "Verified"
              : pack?.locationLabel || "Not set"}
          </dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">Current city (for Timing)</h2>
        <p className="text-sm text-ink-secondary">
          Purpose checks and today’s clock windows need latitude and longitude. Use detect, or edit
          birth profile in the Android app for full profile tune.
        </p>
        <input
          value={currentCity}
          onChange={(e) => setCurrentCity(e.target.value)}
          placeholder="City label (optional)"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-text/25"
        />
        <PrimaryButton type="button" onClick={() => void detectLocation()} className="w-full">
          {locationBusy ? "Detecting…" : "Detect my location"}
        </PrimaryButton>
        {locationMsg ? <p className="text-sm text-ink-secondary">{locationMsg}</p> : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gold-text">Reading</h2>
        <SettingsLink href="/decode" label="Decode — identity & domains" />
        <SettingsLink href="/life" label="Life map chapters" />
        <SettingsLink href="/onboarding" label="Birth profile (onboarding)" />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gold-text">Legal & support</h2>
        <SettingsLink href={LegalUrls.privacy} label="Privacy policy" external />
        <SettingsLink href={LegalUrls.terms} label="Terms of use" external />
        <SettingsLink href={LegalUrls.deleteAccount} label="Delete account (web)" external />
        <a
          href={accountDeletionMailto(phone ?? undefined)}
          className="flex min-h-11 items-center rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink"
        >
          Request deletion by email
        </a>
        <a
          href={`mailto:${LegalUrls.supportEmail}`}
          className="flex min-h-11 items-center rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink"
        >
          Contact support
        </a>
      </section>

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
