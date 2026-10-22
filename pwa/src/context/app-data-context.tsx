"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/context/locale-context";
import { BirthPackViews, normalizePackResponse } from "@/lib/birth-pack-views";
import { parseChartProfileList, type ChartProfileSummary } from "@/lib/chart-profiles";
import { CHART_PROFILE_STORAGE_KEY } from "@/lib/locale";
import {
  clearEngineCache,
  PACK_REVALIDATE_MS,
  readCachedPackEntry,
  readCachedTimezone,
  readCachedToday,
  readLastUserId,
  writeCachedPack,
  writeCachedTimezone,
  writeCachedToday,
  writeLastUserId,
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

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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

function initialSnapshot(locale: string) {
  // Instant render: hydrate from the last signed-in user's cached reading before any
  // network call. The session check below replaces it if the user changed.
  const uid = readLastUserId();
  const tz = readCachedTimezone() || "Asia/Kolkata";
  if (!uid) return { uid: null, tz, pack: null, today: null };
  const chartId = readActiveChartId();
  return {
    uid,
    tz,
    pack: readCachedPackEntry(uid, locale, chartId)?.pack ?? null,
    today: readCachedToday(uid, locale, chartId, todayInTimezone(tz)),
  };
}

async function postEngine(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { locale, localeReady } = useLocale();
  const [pack, setPack] = useState<BirthPackPayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileTimezone, setProfileTimezone] = useState("Asia/Kolkata");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChartProfileId, setActiveChartProfileId] = useState<string | null>(null);
  const [activeChartLabel, setActiveChartLabel] = useState<string | null>(null);
  const [chartProfiles, setChartProfiles] = useState<ChartProfileSummary[]>([]);
  const userIdRef = useRef<string | null>(null);
  const inflight = useRef<{ key: string; promise: Promise<void> } | null>(null);

  // Apply the cached snapshot before first paint (client only, so SSR markup matches).
  useIsomorphicLayoutEffect(() => {
    const snap = initialSnapshot(locale);
    setActiveChartProfileId(readActiveChartId());
    setProfileTimezone(snap.tz);
    if (snap.uid) {
      userIdRef.current = snap.uid;
      setUserId(snap.uid);
    }
    if (snap.pack) {
      setPack(snap.pack);
      setToday(snap.today);
      setLoading(false);
    }
  }, []);

  const reloadChartProfiles = useCallback(async () => {
    try {
      const { res, json } = await postEngine({ action: "chart_profile_list", locale });
      if (res.ok) setChartProfiles(parseChartProfileList(json));
    } catch {
      /* ignore */
    }
  }, [locale]);

  const load = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      const chartId = readActiveChartId();
      const cachedFor = (uid: string) => readCachedPackEntry(uid, locale, chartId);

      let uid: string | null = null;
      try {
        const supabase = createClient();
        if (!supabase) {
          setError("Supabase is not configured.");
          setPack(null);
          return;
        }

        // Local session read (no network); the engine verifies the token server-side.
        const { data: sessionData } = await supabase.auth.getSession();
        uid = sessionData.session?.user.id ?? null;

        if (!sessionData.session || !uid) {
          userIdRef.current = null;
          setUserId(null);
          setError("Sign in to load your reading.");
          setPack(null);
          setToday(null);
          clearEngineCache({ forgetUser: true });
          return;
        }

        if (uid !== userIdRef.current) {
          // Different account than the cached snapshot: never show someone else's reading.
          setPack(null);
          setToday(null);
        }
        userIdRef.current = uid;
        setUserId(uid);
        writeLastUserId(uid);

        const cachedEntry = opts?.force ? null : cachedFor(uid);
        const hasPack = Boolean(cachedEntry);
        if (cachedEntry) setPack(cachedEntry.pack);
        if (!opts?.silent && !hasPack) {
          setLoading(true);
          setError(null);
        }

        // Timezone: start with the cached value so the pack/today requests are not
        // serialized behind the profile query; correct it if the profile disagrees.
        let tz = readCachedTimezone() || profileTimezone || "Asia/Kolkata";
        const tzQuery: Promise<string | null> = Promise.resolve(
          supabase
            .from("profiles")
            .select("current_timezone")
            .eq("user_id", uid)
            .maybeSingle(),
        ).then(({ data }) => data?.current_timezone?.toString() || null);

        const fetchToday = async (zone: string) => {
          const date = todayInTimezone(zone);
          const cached = opts?.force ? null : readCachedToday(uid!, locale, chartId, date);
          if (cached) {
            setToday(cached);
            return;
          }
          const { res, json } = await postEngine(
            engineExtras(locale, chartId, { action: "today_get", date }),
          );
          if (res.ok) {
            const parsed = parseTodayPayload(json);
            setToday(parsed);
            writeCachedToday(uid!, locale, chartId, parsed);
          } else if (!hasPack) {
            setToday(null);
          }
        };

        const needPackFetch =
          opts?.force || !cachedEntry || cachedEntry.ageMs > PACK_REVALIDATE_MS;
        const packTask = needPackFetch
          ? postEngine(
              engineExtras(locale, chartId, { action: "birth_pack_get", may_generate: false }),
            ).then(({ res, json }) => {
              if (!res.ok) {
                const code = json.error_code?.toString() ?? "";
                if (hasPack) return; // keep showing the cached reading
                if (code === "birth_pack_not_ready") {
                  setError("Your reading is still preparing. Pull down to refresh in a moment.");
                  return;
                }
                throw new Error(json.error?.toString() ?? "Failed to load pack");
              }
              const normalized = normalizePackResponse(json);
              setPack(normalized);
              setError(null);
              writeCachedPack(uid!, locale, chartId, normalized);
            })
          : Promise.resolve();

        const todayTask = fetchToday(tz).then(async () => {
          const fromProfile = await tzQuery.catch(() => null);
          if (fromProfile && fromProfile !== tz) {
            tz = fromProfile;
            setProfileTimezone(fromProfile);
            writeCachedTimezone(fromProfile);
            await fetchToday(fromProfile);
          } else if (fromProfile) {
            setProfileTimezone(fromProfile);
            writeCachedTimezone(fromProfile);
          }
        });

        await Promise.all([packTask, todayTask]);
        void reloadChartProfiles();
      } catch (e) {
        if (!uid || !cachedFor(uid)) {
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          setError(
            offline
              ? "You're offline. Connect to load your reading."
              : e instanceof Error
                ? e.message
                : "Load failed",
          );
          setPack(null);
        }
      } finally {
        setLoading(false);
      }
    },
    // profileTimezone intentionally omitted: it is read as a hint only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, reloadChartProfiles],
  );

  /** Coalesce overlapping loads (mount + auth events + locale change). */
  const loadOnce = useCallback(
    (opts?: { silent?: boolean; force?: boolean }) => {
      const key = `${locale}:${readActiveChartId() ?? "self"}`;
      if (inflight.current && inflight.current.key === key && !opts?.force) {
        return inflight.current.promise;
      }
      const promise = load(opts).finally(() => {
        if (inflight.current?.promise === promise) inflight.current = null;
      });
      inflight.current = { key, promise };
      return promise;
    },
    [load, locale],
  );

  const setActiveChartProfile = useCallback(
    async (id: string | null, label?: string | null) => {
      setActiveChartProfileId(id);
      setActiveChartLabel(label ?? null);
      if (id) localStorage.setItem(CHART_PROFILE_STORAGE_KEY, id);
      else localStorage.removeItem(CHART_PROFILE_STORAGE_KEY);
      setPack(null);
      setToday(null);
      await loadOnce({ force: true });
    },
    [loadOnce],
  );

  useEffect(() => {
    if (!localeReady) return;
    void loadOnce({ silent: false });
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION / TOKEN_REFRESHED / USER_UPDATED must not trigger a reload:
      // they fired a second full load (and a spinner) on every page open before.
      const nextUid = session?.user.id ?? null;
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && nextUid !== userIdRef.current)) {
        void loadOnce({ silent: true, force: event === "SIGNED_IN" });
      }
    });
    return () => subscription.unsubscribe();
  }, [loadOnce, localeReady]);

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
        await loadOnce({ force: true });
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
    loadOnce,
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
