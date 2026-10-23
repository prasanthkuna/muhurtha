"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { formatDisplayDate } from "@/lib/format-date";
import {
  Bookmark,
  Languages,
  Lock,
  LogOut,
  ScrollText,
  Share2,
  Sparkles,
  User,
} from "@/components/celestial/muh-icon";
import { ChartProfilesSection } from "@/components/settings/chart-profiles-section";
import { PageHeader } from "@/components/editorial/page-header";
import { SettingsRow } from "@/components/editorial/settings-row";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { accountDeletionMailto, LegalUrls } from "@/lib/legal-urls";
import { APP_LOCALES, localeLabel, type AppLocale } from "@/lib/locale";
import { LocationPicker } from "@/components/location/location-picker";
import { clearEngineCache } from "@/lib/engine-cache";
import type { ResolvedPlace } from "@/lib/location/resolved-place";
import { saveProfileCurrentPlace } from "@/lib/onboarding/save-onboarding";
import { loadBirthProfileResult, type BirthProfileSummary } from "@/lib/profile-bundle";
import { createClient } from "@/lib/supabase/client";
import { PushSection } from "@/components/settings/push-section";
import { PlanSection } from "@/components/settings/plan-section";
import { BirthEditSection } from "@/components/settings/birth-edit-section";
import { usePaywall } from "@/context/paywall-context";
import { setServerLanguage } from "@/lib/billing";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Fact({ label, value, pending }: { label: string; value: string; pending?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/80 py-2.5 last:border-0">
      <dt className="text-sm text-ink-tertiary">{label}</dt>
      <dd className="max-w-[58%] text-right text-sm font-medium text-ink">
        {pending ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-gold-wash/70 align-middle" />
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

type BirthState = "loading" | "ok" | "missing" | "error";

export default function SettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const { isPro, refresh, today, pack } = useAppData();
  const { openPaywall } = usePaywall();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [birth, setBirth] = useState<BirthProfileSummary | null>(null);
  const [birthState, setBirthState] = useState<BirthState>("loading");
  const [birthError, setBirthError] = useState<string | null>(null);
  const [currentPlace, setCurrentPlace] = useState<ResolvedPlace | null>(null);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [langBusy, setLangBusy] = useState(false);

  const loadBirth = useCallback(async () => {
    setBirthState("loading");
    setBirthError(null);
    try {
      const result = await loadBirthProfileResult();
      if (result.status === "ok") {
        const summary = result.summary;
        setBirth(summary);
        setBirthState(summary.dateOfBirth ? "ok" : "missing");
        if (summary.currentCity && summary.currentLat != null && summary.currentLng != null) {
          setCurrentPlace({
            label: summary.currentCity,
            lat: summary.currentLat,
            lng: summary.currentLng,
            timezone: summary.timezone ?? "Asia/Kolkata",
          });
        }
      } else if (result.status === "no_profile") {
        setBirthState("missing");
      } else {
        setBirthState("error");
        setBirthError(result.status === "error" ? result.message : t("ui.birthLoadFailed"));
      }
    } catch (e) {
      setBirthState("error");
      setBirthError(e instanceof Error ? e.message : t("ui.birthLoadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email ?? null);
      setPhone(data.session?.user.phone ?? null);
    })();
    void loadBirth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    clearEngineCache({ forgetUser: true });
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/welcome");
  }

  async function changeLanguage(next: AppLocale) {
    if (next === locale) return;
    // Switching language regenerates the reading, so it is a Pro feature after onboarding.
    if (!isPro) {
      openPaywall("language");
      return;
    }
    setLangBusy(true);
    try {
      const server = await setServerLanguage(next);
      if (!server.ok && server.proRequired) {
        openPaywall("language");
        return;
      }
      // The data provider reloads every localized payload (pack, Today, chart list) as soon
      // as the locale changes and ignores any in-flight request from the old language.
      // Calling refresh() here used to reload with the *previous* locale captured in its
      // closure, which left Today in Telugu after switching back to English.
      await setLocale(next);
    } finally {
      setLangBusy(false);
    }
  }

  async function onCurrentPlaceChange(place: ResolvedPlace) {
    setCurrentPlace(place);
    setLocationMsg(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Not signed in.");
      await saveProfileCurrentPlace(supabase, place);
      clearEngineCache();
      await refresh();
      setLocationMsg(t("settings.locationSaved"));
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : t("onboarding.geoFailed"));
    }
  }


  const displayName =
    birth?.displayName || pack?.displayName || email?.split("@")[0] || t("common.you");
  const pending = birthState === "loading";
  const dash = birthState === "error" ? "?" : "—";

  return (
    <div className="space-y-8 pb-4" data-testid="settings-loaded">
      <PageHeader
        eyebrow={t("settings.profileEyebrow")}
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      <div className="rounded-2xl border border-gold-accent/25 bg-gradient-to-br from-paper via-paper to-gold-wash/20 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-wash text-gold-text">
            <User className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-xl text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-tertiary">{email ?? phone ?? "—"}</p>
          </div>
          <span className="rounded-full bg-gold-wash px-2.5 py-1 text-xs font-semibold text-gold-text">
            {isPro ? t("settings.planPro") : t("settings.planFree")}
          </span>
        </div>
      </div>

      <PlanSection />

      <Section title={t("settings.languageTitle")}>
        <p className="px-1 text-sm text-ink-secondary">
          {isPro ? t("settings.languageHint") : t("billing.langLocked")}
        </p>
        <div className="flex flex-wrap gap-2 px-1">
          {APP_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              disabled={langBusy}
              onClick={() => void changeLanguage(code)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                locale === code
                  ? "bg-gold-wash text-gold-text ring-1 ring-gold-accent/30"
                  : "border border-line bg-paper text-ink-secondary hover:border-gold-accent/40"
              }`}
            >
              {!isPro && locale !== code ? (
                <Lock className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Languages className="h-3.5 w-3.5" aria-hidden />
              )}
              {localeLabel(code)}
            </button>
          ))}
        </div>
      </Section>

      <ChartProfilesSection />

      <Section title={t("settings.signedIn")}>
        <div className="rounded-xl border border-line bg-paper px-4 py-1">
          <dl>
            <Fact
              label={t("settings.displayName")}
              value={birth?.displayName || pack?.displayName || dash}
              pending={pending && !pack?.displayName}
            />
            <Fact
              label={t("settings.dob")}
              value={birth?.dateOfBirth ? formatDisplayDate(birth.dateOfBirth, locale, { weekday: false }) : dash}
              pending={pending}
            />
            <Fact label={t("settings.birthPlace")} value={birth?.birthPlace ?? dash} pending={pending} />
            <Fact label={t("settings.birthTime")} value={birth?.timeLabel ?? dash} pending={pending} />
            <Fact label={t("settings.nakshatra")} value={birth?.janmaNakshatra ?? dash} pending={pending} />
            <Fact
              label={t("settings.timingsLocation")}
              value={
                today?.locationVerified
                  ? today.locationLabel || t("settings.verified")
                  : birth?.currentCity || t("settings.notSet")
              }
              pending={pending && !today?.locationVerified}
            />
          </dl>
        </div>
        {pending ? (
          <p className="px-1 text-sm text-ink-tertiary" aria-live="polite">{t("ui.loadingBirth")}</p>
        ) : null}
        {birthState === "ok" ? <BirthEditSection onSaved={() => void loadBirth()} /> : null}
        {birthState === "missing" ? (
          <p className="px-1 text-sm text-ink-secondary">{t("settings.birthMissing")}</p>
        ) : null}
        {birthState === "error" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-warning-wash/50 px-3 py-2" role="alert">
            <p className="text-sm text-warning-ink">
              {t("ui.birthLoadFailed")}
              {birthError ? <span className="block text-xs opacity-80">{birthError}</span> : null}
            </p>
            <button
              type="button"
              onClick={() => void loadBirth()}
              className="min-h-10 shrink-0 rounded-full border border-warning-ink/30 px-3 text-sm font-medium text-warning-ink"
            >
              {t("ui.retry")}
            </button>
          </div>
        ) : null}
      </Section>

      <Section title={t("settings.cityTitle")}>
        <p className="px-1 text-sm text-ink-secondary">{t("settings.cityHint")}</p>
        <LocationPicker
          label={t("settings.cityTitle")}
          value={currentPlace}
          onChange={(place) => void onCurrentPlaceChange(place)}
          autoDetect={
            (birthState === "ok" || birthState === "missing") &&
            !currentPlace &&
            birth?.currentLat == null
          }
        />
        {locationMsg ? <p className="px-1 text-sm text-success-ink">{locationMsg}</p> : null}
      </Section>

      <Section title={t("settings.alertsTitle")}>
        <PushSection />
      </Section>

      <Section title={t("settings.moreTitle")}>
        <SettingsRow
          href="/traditions"
          icon={<Sparkles className="h-4 w-4" />}
          title={t("settings.traditions")}
        />
        <SettingsRow
          href="/plans"
          icon={<Bookmark className="h-4 w-4" />}
          title={t("settings.plans")}
        />
        <SettingsRow
          href="/share"
          icon={<Share2 className="h-4 w-4" />}
          title={t("settings.share")}
        />
      </Section>

      <Section title={t("settings.legalTitle")}>
        <SettingsRow
          href="/settings/disclaimer"
          icon={<ScrollText className="h-4 w-4" />}
          title={t("legal.disclaimerTitle")}
        />
        <SettingsRow
          href={LegalUrls.privacy}
          external
          icon={<ScrollText className="h-4 w-4" />}
          title={t("settings.privacy")}
        />
        <SettingsRow
          href={LegalUrls.terms}
          external
          icon={<ScrollText className="h-4 w-4" />}
          title={t("settings.terms")}
        />
        <SettingsRow
          href={LegalUrls.deleteAccount}
          external
          title={t("settings.deleteWeb")}
        />
        <SettingsRow
          href={accountDeletionMailto(phone ?? undefined)}
          external
          title={t("settings.deleteEmail")}
        />
        <SettingsRow href="/pricing" icon={<ScrollText className="h-4 w-4" />} title={t("billing.legal.pricing")} />
        <SettingsRow href="/refund" icon={<ScrollText className="h-4 w-4" />} title={t("billing.legal.refund")} />
        <SettingsRow href="/contact" icon={<ScrollText className="h-4 w-4" />} title={t("billing.legal.contact")} />
        <SettingsRow href={`mailto:${LegalUrls.supportEmail}`} external title={t("settings.support")} />
      </Section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-danger-ink/40 bg-transparent px-4 text-sm font-semibold text-danger-ink transition-colors hover:bg-danger-ink/5 active:bg-danger-ink/10"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {t("common.signOut")}
      </button>
    </div>
  );
}
