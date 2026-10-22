"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALE_STORAGE_KEY, normalizeLocale, type AppLocale } from "@/lib/locale";
import { t as translate } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
  t: (key: string) => string;
  localeReady: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    if (typeof window === "undefined") return "en";
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  });
  const [localeReady, setLocaleReady] = useState(false);

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
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) {
        await supabase
          .from("profiles")
          .update({ language_code: next, updated_at: new Date().toISOString() })
          .eq("user_id", uid);
      }
    }
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
