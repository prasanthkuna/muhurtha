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
import type { BirthPackPayload } from "@/lib/types";

type AppDataContextValue = {
  pack: BirthPackPayload | null;
  views: BirthPackViews | null;
  loading: boolean;
  error: string | null;
  isPro: boolean;
  fromCache: boolean;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [pack, setPack] = useState<BirthPackPayload | null>(() => readPackCache());
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

      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_pack_get", locale: "en" }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(json.error?.toString() ?? "Failed to load pack");
      const normalized = normalizePackResponse(json);
      setPack(normalized);
      writePackCache(normalized);
      setFromCache(false);
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
      loading,
      error,
      isPro: pack?.access?.isPro === true,
      fromCache,
      refresh: () => load(),
    };
  }, [pack, loading, error, fromCache, load]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData outside provider");
  return ctx;
}
