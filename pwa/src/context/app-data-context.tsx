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
import { BirthPackViews, normalizePackResponse } from "@/lib/birth-pack-views";
import { clearPackCache, readPackCache, writePackCache } from "@/lib/pack-cache";
import { createClient } from "@/lib/supabase/client";
import type { TodayPayload } from "@/lib/today-types";
import { parseTodayPayload } from "@/lib/today-types";
import type { BirthPackPayload } from "@/lib/types";

type AppDataContextValue = {
  pack: BirthPackPayload | null;
  views: BirthPackViews | null;
  today: TodayPayload | null;
  loading: boolean;
  error: string | null;
  isPro: boolean;
  fromCache: boolean;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [pack, setPack] = useState<BirthPackPayload | null>(() => readPackCache());
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(!readPackCache());
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!readPackCache());

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        setPack(null);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Sign in to load your reading.");
        setPack(null);
        clearPackCache();
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const [packRes, todayRes] = await Promise.all([
        fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "birth_pack_get", locale: "en" }),
        }),
        fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "today_get", locale: "en", date }),
        }),
      ]);
      const json = (await packRes.json()) as Record<string, unknown>;
      if (!packRes.ok) throw new Error(json.error?.toString() ?? "Failed to load pack");
      const normalized = normalizePackResponse(json);
      setPack(normalized);
      writePackCache(normalized);
      setFromCache(false);

      const todayJson = (await todayRes.json()) as Record<string, unknown>;
      if (todayRes.ok) {
        setToday(parseTodayPayload(todayJson));
      } else {
        setToday(null);
      }
    } catch (e) {
      if (!readPackCache()) {
        setError(e instanceof Error ? e.message : "Load failed");
        setPack(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readPackCache();
    if (cached) {
      setPack(cached);
      setFromCache(true);
      setLoading(false);
    }
    void load({ silent: !!cached });
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AppDataContextValue>(() => {
    const views = pack ? new BirthPackViews(pack) : null;
    return {
      pack,
      views,
      today,
      loading,
      error,
      isPro: pack?.access?.isPro === true,
      fromCache,
      refresh: () => load(),
    };
  }, [pack, today, loading, error, fromCache, load]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData outside provider");
  return ctx;
}
