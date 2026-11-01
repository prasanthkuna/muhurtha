"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GrahaMedallion } from "@/components/celestial/lord-medallion";
import { OrbitBackdrop } from "@/components/celestial/orbit-backdrop";
import {
  BirthDetailsFields,
  type BirthDetailsValues,
} from "@/components/birth/birth-details-fields";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { LoadingState } from "@/components/editorial/loading-state";
import { NavagrahaWheel } from "@/components/shell/navagraha-loader";
import { useLocale } from "@/context/locale-context";
import { APP_LOCALES, localeLabel, type AppLocale } from "@/lib/locale";
import { fill } from "@/lib/messages-bond";
import { logProduct } from "@/lib/product-events";
import { readTeaser } from "@/lib/teaser";
import { clearEngineCache } from "@/lib/engine-cache";
import { startChartGeneration } from "@/lib/onboarding/pack-generation";
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
  const [prefilled, setPrefilled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      logProduct("onboarding_view", { teaser: Boolean(readTeaser()) });
    }
    // Prefill from the Welcome star teaser (same device, last 30 days).
    const teaser = readTeaser();
    if (teaser) {
      setValues((v) => ({
        ...v,
        dateOfBirth: v.dateOfBirth || teaser.dob,
        timeBucket: teaser.timeBucket ?? v.timeBucket,
      }));
      setPrefilled(true);
    }
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
      logProduct("onboarding_submit", { time: values.timeMode, prefilled, locale });
      await initializeChartAfterOnboarding(birthInputId, locale);
      clearEngineCache();
      // Start the reading, then hand off to Decode right away: its Navagraha loader shows the
      // real job progress. Never hold the user here for more than a few seconds.
      await Promise.race([startChartGeneration(locale), new Promise((r) => setTimeout(r, 12_000))]);
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
  if (generating) return <OnboardingGenerating />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <section className="relative overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/25 px-4 py-4 shadow-[0_10px_32px_rgba(119,84,31,0.08)]">
        <OrbitBackdrop />
        <div className="relative flex gap-3">
          <GrahaMedallion lord="Moon" size="md" shimmer />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
              {t("onboarding.eyebrow")}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">
              {t("onboarding.title")}
            </h1>
          </div>
        </div>
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-ink-secondary" data-testid="onboarding-language">
        <span>{fill(t("onboarding.languageNote"), { lang: localeLabel(locale) })}</span>
        {langOpen ? (
          APP_LOCALES.filter((c) => c !== locale).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLangOpen(false);
                void setLocale(code as AppLocale);
              }}
              className="rounded-full border border-line bg-paper px-2.5 py-1 font-medium text-ink-secondary"
            >
              {localeLabel(code)}
            </button>
          ))
        ) : (
          <button type="button" onClick={() => setLangOpen(true)} className="font-semibold text-gold-text underline underline-offset-2">
            {t("onboarding.changeLang")}
          </button>
        )}
      </div>
      {prefilled ? <p className="mt-1 px-1 text-xs text-success-ink">{t("onboarding.prefilled")}</p> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4" data-testid="onboarding-form">
        <BirthDetailsFields values={values} onChange={patch} />

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
          data-testid="onboarding-not-you"
        >
          {t("onboarding.notYou")}
        </button>
      </form>
    </div>
  );
}

/** Shown for the few seconds between saving birth details and handing off to Decode's loader. */
export function OnboardingGenerating() {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((n) => n + 1), 2400);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center bg-canvas px-6 text-center" data-testid="onboarding-generating">
      <div className="h-64 w-64">
        <NavagrahaWheel active={active} />
      </div>
      <p className="mt-4 font-serif text-2xl text-ink">{t("onboarding.generating")}</p>
      <p className="mt-2 text-sm text-ink-secondary">{t("onboarding.generatingSub")}</p>
    </div>
  );
}
