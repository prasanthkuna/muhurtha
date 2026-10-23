"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALE_STORAGE_KEY, normalizeLocale, type AppLocale } from "@/lib/locale";
import { t as translate } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";
import { setServerLanguage } from "@/lib/billing";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
  t: (key: string) => string;
  localeReady: boolean;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Start from "en" on both server and client so hydration matches (React #418); the saved
  // device locale is applied in a layout effect, before the first paint.
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [localeReady, setLocaleReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved) setLocaleState(normalizeLocale(saved));
  }, []);

  useEffect(() => {
    // A locale saved on this device is good enough to start loading immediately;
    // the profile value is reconciled in the background instead of blocking every load
    // behind an Auth + PostgREST round trip.
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) setLocaleReady(true);
    void (async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("language_code")
          .eq("user_id", uid)
          .maybeSingle();
        if (!profile?.language_code) return;
        const fromProfile = normalizeLocale(profile.language_code.toString());
        localStorage.setItem(LOCALE_STORAGE_KEY, fromProfile);
        setLocaleState((prev) => (prev === fromProfile ? prev : fromProfile));
      } catch {
        /* keep device locale */
      } finally {
        setLocaleReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(async (next: AppLocale) => {
    // The saved profile language only changes through the server (language_set), which
    // enforces Pro after onboarding; the database refuses direct client writes.
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id) {
        const server = await setServerLanguage(next).catch(() => ({ ok: false, proRequired: false }));
        if (!server.ok && server.proRequired) return;
      }
    }
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
      localeReady,
    }),
    [locale, setLocale, localeReady],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale outside LocaleProvider");
  return ctx;
}
