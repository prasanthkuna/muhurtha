"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { OrbitBackdrop } from "@/components/celestial/orbit-backdrop";
import { MapPin } from "@/components/celestial/muh-icon";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { LoadingState } from "@/components/editorial/loading-state";
import { useLocale } from "@/context/locale-context";
import { APP_LOCALES, localeLabel, type AppLocale } from "@/lib/locale";
import { TIME_BUCKETS } from "@/lib/chart-profiles";
import { NAKSHATRAS } from "@/lib/nakshatras";
import { clearPackCache } from "@/lib/pack-cache";
import {
  initializeChartAfterOnboarding,
  saveOnboardingDraft,
} from "@/lib/onboarding/save-onboarding";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-text/25";

export function OnboardingScreen() {
  const router = useRouter();
  const { t, locale, setLocale, localeReady } = useLocale();

  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [timeMode, setTimeMode] = useState<"bucket" | "exact">("bucket");
  const [timeBucket, setTimeBucket] = useState("morning");
  const [exactTime, setExactTime] = useState("");
  const [nakshatra, setNakshatra] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [geo, setGeo] = useState<{
    lat: number;
    lng: number;
    detected: boolean;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const name =
        meta?.full_name?.toString() ||
        meta?.name?.toString() ||
        data.user?.email?.split("@")[0] ||
        "";
      if (name && !displayName) setDisplayName(name);
    })();
  }, [displayName]);

  async function detectLocation() {
    setLocBusy(true);
    setError(null);
    try {
      if (!navigator.geolocation) throw new Error(t("onboarding.geoUnavailable"));
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 20_000,
        });
      });
      setGeo({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        detected: true,
      });
      if (!currentCity.trim()) setCurrentCity(t("onboarding.currentLocation"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("onboarding.geoFailed"));
    } finally {
      setLocBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !dob || !birthPlace.trim() || !currentCity.trim()) {
      setError(t("onboarding.incomplete"));
      return;
    }
    if (timeMode === "bucket" && !timeBucket) {
      setError(t("onboarding.incomplete"));
      return;
    }
    if (timeMode === "exact" && !exactTime) {
      setError(t("onboarding.exactRequired"));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(t("onboarding.configMissing"));
      return;
    }

    setBusy(true);
    try {
      const { birthInputId } = await saveOnboardingDraft(supabase, {
        displayName: displayName.trim(),
        dateOfBirth: dob,
        birthPlace: birthPlace.trim(),
        currentCity: currentCity.trim(),
        languageCode: locale,
        timeBucket: timeMode === "bucket" ? timeBucket : null,
        exactBirthTime: timeMode === "exact" ? exactTime : null,
        janmaNakshatra: nakshatra.trim() || null,
        currentLat: geo?.lat,
        currentLng: geo?.lng,
        locationDetected: geo?.detected ?? false,
      });

      setBusy(false);
      setGenerating(true);
      await initializeChartAfterOnboarding(birthInputId, locale);
      clearPackCache();
      router.replace("/decode");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("onboarding.saveFailed"));
      setBusy(false);
      setGenerating(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/welcome");
  }

  if (!localeReady) {
    return <LoadingState message={t("common.loading")} />;
  }

  if (generating) {
    return <LoadingState message={t("onboarding.generating")} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <section className="relative overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/25 px-4 py-4 shadow-[0_10px_32px_rgba(119,84,31,0.08)]">
        <OrbitBackdrop />
        <div className="relative flex gap-3">
          <GrahaMedallion lord="Moon" size="md" shimmer />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
              {t("onboarding.eyebrow")}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">
              {t("onboarding.title")}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{t("onboarding.subtitle")}</p>
          </div>
        </div>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4" data-testid="onboarding-form">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.name")}</span>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.dob")}</span>
          <input
            type="date"
            className={inputClass}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.birthPlace")}</span>
          <input
            className={inputClass}
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder={t("onboarding.birthPlaceHint")}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.currentCity")}</span>
          <input
            className={inputClass}
            value={currentCity}
            onChange={(e) => {
              setCurrentCity(e.target.value);
              setGeo(null);
            }}
            placeholder={t("settings.cityPlaceholder")}
          />
          <button
            type="button"
            onClick={() => void detectLocation()}
            disabled={locBusy}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-gold-text"
          >
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {locBusy ? t("settings.detecting") : t("onboarding.detectLocation")}
          </button>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-ink-tertiary">{t("onboarding.birthTime")}</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTimeMode("bucket")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                timeMode === "bucket" ? "bg-gold-wash text-gold-text" : "border border-line bg-paper text-ink-secondary"
              }`}
            >
              {t("onboarding.timeWindow")}
            </button>
            <button
              type="button"
              onClick={() => setTimeMode("exact")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                timeMode === "exact" ? "bg-gold-wash text-gold-text" : "border border-line bg-paper text-ink-secondary"
              }`}
            >
              {t("onboarding.exactTime")}
            </button>
          </div>
          {timeMode === "bucket" ? (
            <select
              className={inputClass}
              value={timeBucket}
              onChange={(e) => setTimeBucket(e.target.value)}
            >
              {TIME_BUCKETS.filter((b) => b.value !== "unknown").map((b) => (
                <option key={b.value} value={b.value}>
                  {t(b.key)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="time"
              className={inputClass}
              value={exactTime}
              onChange={(e) => setExactTime(e.target.value)}
            />
          )}
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.nakshatra")}</span>
          <select className={inputClass} value={nakshatra} onChange={(e) => setNakshatra(e.target.value)}>
            <option value="">{t("onboarding.nakshatraSkip")}</option>
            {NAKSHATRAS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-tertiary">{t("settings.languageTitle")}</span>
          <div className="flex flex-wrap gap-2">
            {APP_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => void setLocale(code as AppLocale)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  locale === code
                    ? "bg-gold-wash text-gold-text"
                    : "border border-line bg-paper text-ink-secondary"
                }`}
              >
                {localeLabel(code)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-warning-ink" role="alert">
            {error}
          </p>
        ) : null}

        <PrimaryButton type="submit" className="w-full" disabled={busy}>
          {busy ? t("onboarding.saving") : t("onboarding.submit")}
        </PrimaryButton>

        <button type="button" onClick={() => void signOut()} className="w-full py-2 text-center text-sm text-ink-tertiary">
          {t("common.signOut")}
        </button>
      </form>
    </div>
  );
}
