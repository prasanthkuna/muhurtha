"use client";

import { useEffect, useState } from "react";
import { ChartProfilesSection } from "@/components/settings/chart-profiles-section";
import { PageHeader } from "@/components/editorial/page-header";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { accountDeletionMailto, LegalUrls } from "@/lib/legal-urls";
import { APP_LOCALES, localeLabel, type AppLocale } from "@/lib/locale";
import { clearPackCache } from "@/lib/pack-cache";
import { loadBirthProfileSummary, type BirthProfileSummary } from "@/lib/profile-bundle";
import { createClient } from "@/lib/supabase/client";
import {
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
  syncTimingNotifications,
} from "@/lib/timing-notifications";

function SettingsLink({ href, label }: { href: string; label: string }) {
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
  const { t, locale, setLocale } = useLocale();
  const { isPro, refresh, today } = useAppData();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [birth, setBirth] = useState<BirthProfileSummary | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertsMsg, setAlertsMsg] = useState<string | null>(null);
  const [langBusy, setLangBusy] = useState(false);

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
        setProfileMissing(!summary.dateOfBirth);
        setCurrentCity(summary.currentCity ?? "");
      } else {
        setProfileMissing(true);
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
      setProfileMissing(!summary.dateOfBirth);
      setCurrentCity(summary.currentCity ?? "");
    }
  }

  async function changeLanguage(next: AppLocale) {
    if (next === locale) return;
    setLangBusy(true);
    try {
      await setLocale(next);
      clearPackCache();
      await refresh();
      if (notificationsEnabled()) {
        await syncTimingNotifications(today, next);
      }
    } finally {
      setLangBusy(false);
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

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
          current_city: currentCity.trim() || birth?.currentCity || "Current location",
        })
        .eq("user_id", auth.user.id);
      if (upErr) throw upErr;

      setLocationMsg("OK");
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
      return;
    }
    const ok = await requestNotificationPermission();
    if (!ok) {
      setAlertsMsg("Permission required.");
      return;
    }
    setNotificationsEnabled(true);
    setAlertsOn(true);
    await syncTimingNotifications(today, locale);
  }

  return (
    <div className="space-y-6" data-testid="settings-loaded">
      <PageHeader eyebrow="Profile" title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gold-text">{t("settings.languageTitle")}</h2>
        <p className="text-sm text-ink-secondary">{t("settings.languageHint")}</p>
        <div className="flex flex-wrap gap-2">
          {APP_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              disabled={langBusy}
              onClick={() => void changeLanguage(code)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                locale === code
                  ? "bg-gold-wash text-gold-text"
                  : "border border-line bg-paper text-ink-secondary"
              }`}
            >
              {localeLabel(code)}
            </button>
          ))}
        </div>
      </section>

      <ChartProfilesSection />

      <dl className="space-y-3 rounded-2xl border border-line bg-paper px-4 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.signedIn")}</dt>
          <dd className="text-right font-medium text-ink">{email ?? phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.displayName")}</dt>
          <dd className="text-right font-medium text-ink">{birth?.displayName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.dob")}</dt>
          <dd className="text-right font-medium text-ink">{birth?.dateOfBirth ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.birthPlace")}</dt>
          <dd className="text-right font-medium text-ink">{birth?.birthPlace ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.birthTime")}</dt>
          <dd className="text-right font-medium text-ink">{birth?.timeLabel ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.nakshatra")}</dt>
          <dd className="text-right font-medium text-ink">{birth?.janmaNakshatra ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.plan")}</dt>
          <dd className="text-right font-medium text-ink">
            {isPro ? t("settings.planPro") : t("settings.planFree")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-tertiary">{t("settings.timingsLocation")}</dt>
          <dd className="text-right font-medium text-ink">
            {today?.locationVerified
              ? today.locationLabel || t("settings.verified")
              : birth?.currentCity || t("settings.notSet")}
          </dd>
        </div>
      </dl>

      {profileMissing ? (
        <p className="text-sm text-ink-secondary">{t("settings.birthMissing")}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">{t("settings.cityTitle")}</h2>
        <p className="text-sm text-ink-secondary">{t("settings.cityHint")}</p>
        <input
          value={currentCity}
          onChange={(e) => setCurrentCity(e.target.value)}
          placeholder={t("settings.cityPlaceholder")}
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-text/25"
        />
        <PrimaryButton type="button" onClick={() => void detectLocation()} className="w-full">
          {locationBusy ? t("settings.detecting") : t("settings.detectLocation")}
        </PrimaryButton>
        {locationMsg ? <p className="text-sm text-ink-secondary">{locationMsg}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-text">{t("settings.alertsTitle")}</h2>
        <p className="text-sm text-ink-secondary">{t("settings.alertsHint")}</p>
        <PrimaryButton type="button" onClick={() => void toggleAlerts()} className="w-full">
          {alertsOn ? t("settings.alertsOn") : t("settings.alertsOff")}
        </PrimaryButton>
        {alertsMsg ? <p className="text-sm text-ink-secondary">{alertsMsg}</p> : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gold-text">{t("settings.legalTitle")}</h2>
        <SettingsLink href={LegalUrls.privacy} label={t("settings.privacy")} />
        <SettingsLink href={LegalUrls.terms} label={t("settings.terms")} />
        <SettingsLink href={LegalUrls.deleteAccount} label={t("settings.deleteWeb")} />
        <a
          href={accountDeletionMailto(phone ?? undefined)}
          className="flex min-h-11 items-center rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink"
        >
          {t("settings.deleteEmail")}
        </a>
        <a
          href={`mailto:${LegalUrls.supportEmail}`}
          className="flex min-h-11 items-center rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink"
        >
          {t("settings.support")}
        </a>
      </section>

      <div className="space-y-3">
        <PrimaryButton type="button" onClick={() => void hardRefresh()} className="w-full">
          {t("common.refresh")}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-full border border-line bg-paper py-3 text-sm font-semibold text-warning-ink"
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );
}
