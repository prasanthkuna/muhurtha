"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { accountDeletionMailto, LegalUrls } from "@/lib/legal-urls";
import { clearPackCache } from "@/lib/pack-cache";
import { loadBirthProfileSummary, type BirthProfileSummary } from "@/lib/profile-bundle";
import { createClient } from "@/lib/supabase/client";
import {
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
  syncTimingNotifications,
} from "@/lib/timing-notifications";

function SettingsLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-gold-accent/40"
    >
      {label}
      <span className="text-ink-tertiary" aria-hidden>
        ↗
      </span>
    </a>
  );
}

export default function SettingsPage() {
  const { isPro, refresh, today } = useAppData();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [birth, setBirth] = useState<BirthProfileSummary | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string>("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertsMsg, setAlertsMsg] = useState<string | null>(null);

  useEffect(() => {
    setAlertsOn(notificationsEnabled());
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      setEmail(auth.user?.email ?? null);
      setPhone(auth.user?.phone ?? null);

      const summary = await loadBirthProfileSummary();
      if (summary) {
        setBirth(summary);
        setProfileId(summary.profileId);
        setCurrentCity(summary.currentCity ?? "");
      }
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
    const summary = await loadBirthProfileSummary();
    if (summary) {
      setBirth(summary);
      setCurrentCity(summary.currentCity ?? "");
    }
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
          current_city: currentCity.trim() || birth?.currentCity || "Current location",
        })
        .eq("user_id", auth.user.id);
      if (upErr) throw upErr;

      setLocationMsg("Location saved.");
      clearPackCache();
      await refresh();
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : "Could not detect location.");
    } finally {
      setLocationBusy(false);
    }
  }

  async function toggleAlerts() {
    setAlertsMsg(null);
    if (alertsOn) {
      setNotificationsEnabled(false);
      setAlertsOn(false);
      setAlertsMsg("Timing alerts turned off.");
      return;
    }
    const ok = await requestNotificationPermission();
    if (!ok) {
      setAlertsMsg("Allow notifications in your browser to get daily and window reminders.");
      return;
    }
    setNotificationsEnabled(true);
    setAlertsOn(true);
    await syncTimingNotifications(today);
    setAlertsMsg("Alerts on — daily card plus good and caution windows (10 minutes before).");
  }

  return (
    <div className="space-y-6" data-testid="settings-loaded">
      <PageHeader
        eyebrow="Profile"
        title="Settings"
        subtitle="Birth details, location for timings, alerts, and legal."
      />

      <dl className="space-y-3 rounded-2xl border border-line bg-paper px-4 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Signed in as</dt>
          <dd className="text-right font-medium text-ink">{email ?? phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Display name</dt>
          <dd className="text-right font-medium text-ink">{birth?.displayName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Date of birth</dt>
          <dd className="text-right font-medium text-ink">{birth?.dateOfBirth ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Birth place</dt>
          <dd className="text-right font-medium text-ink">{birth?.birthPlace ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Birth time</dt>
          <dd className="text-right font-medium text-ink">{birth?.timeLabel ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">Janma nakshatra</dt>
          <dd className="text-right font-medium text-ink">{birth?.janmaNakshatra ?? "—"}</dd>
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
              : birth?.currentCity || "Not set"}
          </dd>
        </div>
      </dl>

      {!birth?.dateOfBirth && profileId === null ? (
        <p className="text-sm text-ink-secondary">
          Birth profile not found. Complete onboarding on web or the Android app, then refresh.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">Current city (for Timing)</h2>
        <p className="text-sm text-ink-secondary">
          Purpose checks and today&apos;s clock windows need latitude and longitude.
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">Timing alerts</h2>
        <p className="text-sm text-ink-secondary">
          One daily reminder when your card is ready, plus good and caution windows — including 10
          minutes before each window starts. Works while this device allows notifications.
        </p>
        <PrimaryButton type="button" onClick={() => void toggleAlerts()} className="w-full">
          {alertsOn ? "Turn off timing alerts" : "Turn on timing alerts"}
        </PrimaryButton>
        {alertsMsg ? <p className="text-sm text-ink-secondary">{alertsMsg}</p> : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gold-text">Legal & support</h2>
        <SettingsLink href={LegalUrls.privacy} label="Privacy policy" />
        <SettingsLink href={LegalUrls.terms} label="Terms of use" />
        <SettingsLink href={LegalUrls.deleteAccount} label="Delete account (web)" />
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
          Refresh reading
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
