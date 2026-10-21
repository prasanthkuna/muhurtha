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
import {
  clearEngineCache,
  readCachedPack,
  readCachedToday,
  writeCachedPack,
  writeCachedToday,
} from "@/lib/engine-cache";
import { todayInTimezone } from "@/lib/local-date";
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
    birthLat?: number;
    birthLng?: number;
    birthTimezone?: string;
    timeBucket?: string | null;
    exactBirthTime?: string | null;
    birthInputMode: string;
    janmaNakshatra?: string;
  }) => Promise<void>;
  deleteChartProfile: (id: string) => Promise<void>;
  profileTimezone: string;
  userId: string | null;
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
  const [pack, setPack] = useState<BirthPackPayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileTimezone, setProfileTimezone] = useState("Asia/Kolkata");
  const [userId, setUserId] = useState<string | null>(null);
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
    async (opts?: { silent?: boolean; force?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }

      let uid: string | null = null;
      try {
        const supabase = createClient();
        if (!supabase) {
          setError("Supabase is not configured.");
          setPack(null);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        uid = sessionData.session?.user.id ?? null;
        setUserId(uid);

        if (!sessionData.session || !uid) {
          setError("Sign in to load your reading.");
          setPack(null);
          clearEngineCache();
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("current_timezone")
          .eq("user_id", uid)
          .maybeSingle();
        const tz = prof?.current_timezone?.toString() || "Asia/Kolkata";
        setProfileTimezone(tz);

        const chartId = readActiveChartId();
        const date = todayInTimezone(tz);

        if (!opts?.force) {
          const cachedPack = readCachedPack(uid, locale, chartId);
          const cachedToday = readCachedToday(uid, locale, chartId, date);
          if (cachedPack) setPack(cachedPack);
          if (cachedToday) setToday(cachedToday);
          if (cachedPack && cachedToday) {
            void reloadChartProfiles();
            return;
          }
        }

        const needPack = opts?.force || !readCachedPack(uid, locale, chartId);
        const needToday = opts?.force || !readCachedToday(uid, locale, chartId, date);

        const [packRes, todayRes] = await Promise.all([
          needPack
            ? fetch("/api/engine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  engineExtras(locale, chartId, {
                    action: "birth_pack_get",
                    may_generate: false,
                  }),
                ),
              })
            : Promise.resolve(null),
          needToday
            ? fetch("/api/engine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  engineExtras(locale, chartId, { action: "today_get", date }),
                ),
              })
            : Promise.resolve(null),
        ]);

        if (packRes) {
          const json = (await packRes.json()) as Record<string, unknown>;
          if (!packRes.ok) {
            const code = json.error_code?.toString() ?? "";
            if (code === "birth_pack_not_ready") {
              setError("Your reading is still preparing. Pull down to refresh in a moment.");
            } else {
              throw new Error(json.error?.toString() ?? "Failed to load pack");
            }
          } else {
            const normalized = normalizePackResponse(json);
            setPack(normalized);
            writeCachedPack(uid, locale, chartId, normalized);
          }
        }

        if (todayRes) {
          const todayJson = (await todayRes.json()) as Record<string, unknown>;
          if (todayRes.ok) {
            const parsed = parseTodayPayload(todayJson);
            setToday(parsed);
            writeCachedToday(uid, locale, chartId, parsed);
          } else {
            setToday(null);
          }
        }

        void reloadChartProfiles();
      } catch (e) {
        const chartId = readActiveChartId();
        if (!uid || !readCachedPack(uid, locale, chartId)) {
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
      clearEngineCache();
      await load({ force: true });
    },
    [load],
  );

  useEffect(() => {
    if (!localeReady) return;
    void load({ silent: false });
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
      birthLat?: number;
      birthLng?: number;
      birthTimezone?: string;
      timeBucket?: string | null;
      exactBirthTime?: string | null;
      birthInputMode: string;
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
            birth_lat: input.birthLat,
            birth_lng: input.birthLng,
            birth_timezone: input.birthTimezone,
            birth_input_mode: input.birthInputMode,
            time_bucket: input.timeBucket,
            exact_birth_time: input.exactBirthTime,
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
        clearEngineCache();
        await load({ force: true });
      },
      profileTimezone,
      userId,
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
    userId,
    activeChartProfileId,
    activeChartLabel,
    chartProfiles,
    setActiveChartProfile,
    reloadChartProfiles,
    saveChartProfile,
    deleteChartProfile,
    profileTimezone,
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
  const { activeChartProfileId, profileTimezone } = useAppData();
  return useCallback(
    (action: string, extra: Record<string, unknown> = {}) =>
      engineExtras(locale, activeChartProfileId, {
        action,
        ...extra,
        ...(action === "today_get" && !extra.date
          ? { date: todayInTimezone(profileTimezone) }
          : {}),
      }),
    [locale, activeChartProfileId, profileTimezone],
  );
}
