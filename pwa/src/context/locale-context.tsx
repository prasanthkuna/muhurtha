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
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLocaleReady(true);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLocaleReady(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("language_code")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const fromProfile = normalizeLocale(profile?.language_code?.toString());
      setLocaleState(fromProfile);
      localStorage.setItem(LOCALE_STORAGE_KEY, fromProfile);
      setLocaleReady(true);
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
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase
          .from("profiles")
          .update({ language_code: next, updated_at: new Date().toISOString() })
          .eq("user_id", auth.user.id);
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
