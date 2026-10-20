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
import { useLocale } from "@/context/locale-context";
import { BirthPackViews, normalizePackResponse } from "@/lib/birth-pack-views";
import { parseChartProfileList, type ChartProfileSummary } from "@/lib/chart-profiles";
import { CHART_PROFILE_STORAGE_KEY } from "@/lib/locale";
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
  refresh: () => Promise<void>;
  activeChartProfileId: string | null;
  activeChartLabel: string | null;
  chartProfiles: ChartProfileSummary[];
  setActiveChartProfile: (id: string | null, label?: string | null) => Promise<void>;
  reloadChartProfiles: () => Promise<void>;
  saveChartProfile: (input: {
    label: string;
    dateOfBirth: string;
    birthPlace: string;
    timeBucket: string;
    janmaNakshatra?: string;
  }) => Promise<void>;
  deleteChartProfile: (id: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function readActiveChartId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHART_PROFILE_STORAGE_KEY);
  return raw && raw.length > 0 ? raw : null;
}

function engineExtras(
  locale: string,
  chartProfileId: string | null,
  extra: Record<string, unknown> = {},
) {
  return {
    locale,
    ...(chartProfileId ? { chart_profile_id: chartProfileId } : {}),
    ...extra,
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { locale, localeReady } = useLocale();
  const [pack, setPack] = useState<BirthPackPayload | null>(() => readPackCache());
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(!readPackCache());
  const [error, setError] = useState<string | null>(null);
  const [activeChartProfileId, setActiveChartProfileId] = useState<string | null>(() =>
    readActiveChartId(),
  );
  const [activeChartLabel, setActiveChartLabel] = useState<string | null>(null);
  const [chartProfiles, setChartProfiles] = useState<ChartProfileSummary[]>([]);

  const reloadChartProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chart_profile_list", locale }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (res.ok) setChartProfiles(parseChartProfileList(json));
    } catch {
      /* ignore */
    }
  }, [locale]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
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

        const chartId = readActiveChartId();
        const date = new Date().toISOString().slice(0, 10);
        const [packRes, todayRes] = await Promise.all([
          fetch("/api/engine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              engineExtras(locale, chartId, { action: "birth_pack_get" }),
            ),
          }),
          fetch("/api/engine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              engineExtras(locale, chartId, { action: "today_get", date }),
            ),
          }),
        ]);
        const json = (await packRes.json()) as Record<string, unknown>;
        if (!packRes.ok) throw new Error(json.error?.toString() ?? "Failed to load pack");
        const normalized = normalizePackResponse(json);
        setPack(normalized);
        writePackCache(normalized);

        const todayJson = (await todayRes.json()) as Record<string, unknown>;
        if (todayRes.ok) {
          setToday(parseTodayPayload(todayJson));
        } else {
          setToday(null);
        }

        void reloadChartProfiles();
      } catch (e) {
        if (!readPackCache()) {
          setError(e instanceof Error ? e.message : "Load failed");
          setPack(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [locale, reloadChartProfiles],
  );

  const setActiveChartProfile = useCallback(
    async (id: string | null, label?: string | null) => {
      setActiveChartProfileId(id);
      setActiveChartLabel(label ?? null);
      if (id) localStorage.setItem(CHART_PROFILE_STORAGE_KEY, id);
      else localStorage.removeItem(CHART_PROFILE_STORAGE_KEY);
      clearPackCache();
      await load();
    },
    [load],
  );

  useEffect(() => {
    if (!localeReady) return;
    const cached = readPackCache();
    if (cached) {
      setPack(cached);
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
  }, [load, locale, localeReady]);

  useEffect(() => {
    if (!activeChartProfileId) {
      setActiveChartLabel(null);
      return;
    }
    const found = chartProfiles.find((p) => p.id === activeChartProfileId);
    if (found) setActiveChartLabel(found.label);
  }, [activeChartProfileId, chartProfiles]);

  const saveChartProfile = useCallback(
    async (input: {
      label: string;
      dateOfBirth: string;
      birthPlace: string;
      timeBucket: string;
      janmaNakshatra?: string;
    }) => {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          engineExtras(locale, null, {
            action: "chart_profile_save",
            label: input.label,
            date_of_birth: input.dateOfBirth,
            birth_place: input.birthPlace,
            birth_input_mode: input.janmaNakshatra ? "time_bucket_plus_nakshatra" : "time_bucket",
            time_bucket: input.timeBucket,
            ...(input.janmaNakshatra ? { janma_nakshatra: input.janmaNakshatra } : {}),
          }),
        ),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(json.error?.toString() ?? "Could not save chart");

      const birthInputId = json.birth_input_id?.toString();
      if (birthInputId) {
        await fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chart_initialize",
            birth_input_id: birthInputId,
            locale,
          }),
        });
      }

      const id = json.id?.toString() ?? "";
      const label = json.label?.toString() ?? input.label;
      await reloadChartProfiles();
      await setActiveChartProfile(id, label);
    },
    [locale, reloadChartProfiles, setActiveChartProfile],
  );

  const deleteChartProfile = useCallback(
    async (id: string) => {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          engineExtras(locale, null, {
            action: "chart_profile_delete",
            chart_profile_id: id,
          }),
        ),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(json.error?.toString() ?? "Could not delete chart");
      if (activeChartProfileId === id) {
        await setActiveChartProfile(null);
      }
      await reloadChartProfiles();
    },
    [activeChartProfileId, locale, reloadChartProfiles, setActiveChartProfile],
  );

  const value = useMemo<AppDataContextValue>(() => {
    const views = pack ? new BirthPackViews(pack) : null;
    return {
      pack,
      views,
      today,
      loading,
      error,
      isPro: pack?.access?.isPro === true,
      refresh: async () => {
        clearPackCache();
        await load();
      },
      activeChartProfileId,
      activeChartLabel,
      chartProfiles,
      setActiveChartProfile,
      reloadChartProfiles,
      saveChartProfile,
      deleteChartProfile,
    };
  }, [
    pack,
    today,
    loading,
    error,
    load,
    activeChartProfileId,
    activeChartLabel,
    chartProfiles,
    setActiveChartProfile,
    reloadChartProfiles,
    saveChartProfile,
    deleteChartProfile,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData outside provider");
  return ctx;
}

/** Engine POST body with locale + active chart profile. */
export function useEngineBody() {
  const { locale } = useLocale();
  const { activeChartProfileId } = useAppData();
  return useCallback(
    (action: string, extra: Record<string, unknown> = {}) =>
      engineExtras(locale, activeChartProfileId, { action, ...extra }),
    [locale, activeChartProfileId],
  );
}
