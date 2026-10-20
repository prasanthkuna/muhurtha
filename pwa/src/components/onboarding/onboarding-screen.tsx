"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { OrbitBackdrop } from "@/components/celestial/orbit-backdrop";
import {
  BirthDetailsFields,
  type BirthDetailsValues,
} from "@/components/birth/birth-details-fields";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { LoadingState } from "@/components/editorial/loading-state";
import { useLocale } from "@/context/locale-context";
import { APP_LOCALES, localeLabel, type AppLocale } from "@/lib/locale";
import { clearEngineCache } from "@/lib/engine-cache";
import {
  initializeChartAfterOnboarding,
  saveOnboardingDraft,
} from "@/lib/onboarding/save-onboarding";
import { createClient } from "@/lib/supabase/client";

const emptyValues: BirthDetailsValues = {
  displayName: "",
  dateOfBirth: "",
  birthPlace: null,
  currentPlace: null,
  timeMode: "bucket",
  timeBucket: "morning",
  exactTime: "",
  janmaNakshatra: "",
};

export function OnboardingScreen() {
  const router = useRouter();
  const { t, locale, setLocale, localeReady } = useLocale();
  const [values, setValues] = useState<BirthDetailsValues>(emptyValues);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (name) setValues((v) => ({ ...v, displayName: name }));
    })();
  }, []);

  function patch(p: Partial<BirthDetailsValues>) {
    setValues((v) => ({ ...v, ...p }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !values.displayName.trim() ||
      !values.dateOfBirth ||
      !values.birthPlace ||
      !values.currentPlace
    ) {
      setError(t("onboarding.incomplete"));
      return;
    }
    if (values.timeMode === "exact" && !values.exactTime) {
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
        displayName: values.displayName.trim(),
        dateOfBirth: values.dateOfBirth,
        birthPlace: values.birthPlace,
        currentPlace: values.currentPlace,
        languageCode: locale,
        timeBucket: values.timeMode === "bucket" ? values.timeBucket : null,
        exactBirthTime: values.timeMode === "exact" ? values.exactTime : null,
        janmaNakshatra: values.janmaNakshatra.trim() || null,
      });

      setBusy(false);
      setGenerating(true);
      await initializeChartAfterOnboarding(birthInputId, locale);
      clearEngineCache();
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

  if (!localeReady) return <LoadingState message={t("common.loading")} />;
  if (generating) return <LoadingState message={t("onboarding.generating")} />;

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
          </div>
        </div>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4" data-testid="onboarding-form">
        <BirthDetailsFields values={values} onChange={patch} />

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

        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full py-2 text-center text-sm text-ink-tertiary"
        >
          {t("common.signOut")}
        </button>
      </form>
    </div>
  );
}
