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

export type PackPreparing = {
  /** Phases finished / total, when the engine reports them. */
  done: number;
  total: number;
  startedAt: number;
  /** No progress for a long time: show a retry instead of an endless spinner. */
  stalled: boolean;
};

type AccessInfo = { isPro?: boolean; isPlus?: boolean; planCode?: string };

const ACTIVE_LABEL_KEY = "muh_active_chart_label_v1";
const ACCESS_KEY_PREFIX = "muh_access_v1_";
const PACK_POLL_MS = 4_000;
const PACK_STALL_MS = 6 * 60_000;

function readAccess(uid: string | null): AccessInfo | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = localStorage.getItem(ACCESS_KEY_PREFIX + uid);
    return raw ? (JSON.parse(raw) as AccessInfo) : null;
  } catch {
    return null;
  }
}

function writeAccess(uid: string | null, access: AccessInfo) {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(ACCESS_KEY_PREFIX + uid, JSON.stringify(access));
  } catch {
    /* quota */
  }
}

type AppDataContextValue = {
  pack: BirthPackPayload | null;
  views: BirthPackViews | null;
  today: TodayPayload | null;
  loading: boolean;
  error: string | null;
  /** Entitlement of the signed-in account (never of the chart being viewed). */
  isPro: boolean;
  /** Set while a reading (e.g. a newly added friend chart) is being generated. */
  preparing: PackPreparing | null;
  retryPreparing: () => void;
  refresh: () => Promise<void>;
  /** Day payload for any date (cached per user/locale/chart/date); used by Today's day browser. */
  fetchDay: (date: string) => Promise<TodayPayload | null>;
  /** Locale the currently loaded pack/today were produced in. */
  dataLocale: string | null;
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
  const [dataLocale, setDataLocale] = useState<string | null>(null);
  const [access, setAccessState] = useState<AccessInfo | null>(null);
  const [preparing, setPreparing] = useState<PackPreparing | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const inflight = useRef<{ key: string; promise: Promise<void> } | null>(null);
  // Always the latest locale, so callbacks captured before a language switch (e.g. a
  // refresh() closure held by Settings) can never reload the previous language.
  const localeRef = useRef(locale);
  // Monotonic load generation: only the newest load may write state, so a slow request in
  // the old language cannot land after (and overwrite) the new language's data.
  const genRef = useRef(0);
  // "<locale>:<chart>" of the data currently on screen.
  const dataKeyRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    // Layout effects run before the load effect below, so load() always sees the new locale.
    localeRef.current = locale;
  }, [locale]);

  // Apply the cached snapshot before first paint (client only, so SSR markup matches).
  useIsomorphicLayoutEffect(() => {
    const snap = initialSnapshot(locale);
    setActiveChartProfileId(readActiveChartId());
    setProfileTimezone(snap.tz);
    if (snap.uid) {
      userIdRef.current = snap.uid;
      setUserId(snap.uid);
      setAccessState(readAccess(snap.uid));
    }
    if (readActiveChartId()) {
      try {
        setActiveChartLabel(localStorage.getItem(ACTIVE_LABEL_KEY));
      } catch {
        /* ignore */
      }
    }
    if (snap.pack) {
      setPack(snap.pack);
      setToday(snap.today);
      setDataLocale(locale);
      dataKeyRef.current = `${locale}:${readActiveChartId() ?? "self"}`;
      setLoading(false);
    }
  }, []);

  const recordAccess = useCallback((next: AccessInfo | undefined | null) => {
    if (!next || typeof next !== "object" || next.isPro === undefined) return;
    setAccessState(next);
    writeAccess(userIdRef.current, next);
  }, []);

  const reloadChartProfiles = useCallback(async () => {
    try {
      const { res, json } = await postEngine({
        action: "chart_profile_list",
        locale: localeRef.current,
      });
      if (res.ok) setChartProfiles(parseChartProfileList(json));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean; force?: boolean; poll?: boolean }) => {
      const locale = localeRef.current;
      const chartId = readActiveChartId();
      const dataKey = `${locale}:${chartId ?? "self"}`;
      const gen = ++genRef.current;
      const live = () => gen === genRef.current;
      const cachedFor = (uid: string) => readCachedPackEntry(uid, locale, chartId);
      const markData = () => {
        dataKeyRef.current = dataKey;
        setDataLocale(locale);
      };
      const setPreparingFrom = (raw: unknown) => {
        const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const done = Number(p.done ?? 0) || 0;
        const total = Number(p.total ?? 0) || 0;
        setPreparing((prev) => {
          const progressed = !prev || done !== prev.done;
          const startedAt = prev && !progressed ? prev.startedAt : Date.now();
          return { done, total, startedAt, stalled: Date.now() - startedAt > PACK_STALL_MS };
        });
      };

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
        if (!live()) return;

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
        const switchedData = dataKeyRef.current !== dataKey;
        if (cachedEntry) {
          setPack(cachedEntry.pack);
          recordAccess(cachedEntry.pack.access);
          setPreparing(null);
          markData();
        } else if (switchedData) {
          // Language or chart changed and nothing is cached for it: never keep showing the
          // previous language's reading while the new one loads.
          setPack(null);
          setToday(null);
        }
        if ((!opts?.silent || switchedData) && !hasPack) {
          setLoading(true);
          setError(null);
        }

        // Timezone: start with the cached value so the pack/today requests are not
        // serialized behind the profile query; correct it if the profile disagrees.
        let tz = readCachedTimezone() || profileTimezone || "Asia/Kolkata";
        const tzQuery: Promise<string | null> = opts?.poll
          ? Promise.resolve(null)
          : Promise.resolve(
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
            if (live()) setToday(cached);
            return;
          }
          const { res, json } = await postEngine(
            engineExtras(locale, chartId, { action: "today_get", date }),
          );
          if (!live()) return;
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
              engineExtras(locale, chartId, {
                action: "birth_pack_get",
                may_generate: false,
                // Engine starts/advances generation in the background if no reading exists.
                ensure: true,
              }),
            ).then(({ res, json }) => {
              if (!live()) return;
              if (res.ok && json.generating === true) {
                recordAccess(json.access as AccessInfo | undefined);
                if (hasPack) return; // keep showing the cached reading
                markData();
                setError(null);
                setPreparingFrom(json.progress);
                return;
              }
              if (!res.ok) {
                const code = json.error_code?.toString() ?? "";
                if (hasPack) return; // keep showing the cached reading
                if (code === "birth_pack_not_ready") {
                  markData();
                  setError(null);
                  setPreparingFrom(null);
                  return;
                }
                throw new Error(json.error?.toString() ?? "Failed to load pack");
              }
              const normalized = normalizePackResponse(json);
              recordAccess(normalized.access);
              setPack(normalized);
              setPreparing(null);
              markData();
              setError(null);
              writeCachedPack(uid!, locale, chartId, normalized);
            })
          : Promise.resolve();

        // Generation polls only need the pack; Today/timezone/chart list are already loaded.
        const todayTask = opts?.poll ? Promise.resolve() : fetchToday(tz).then(async () => {
          const fromProfile = await tzQuery.catch(() => null);
          if (!live()) return;
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
        if (live() && !opts?.poll) void reloadChartProfiles();
      } catch (e) {
        if (!live()) return;
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
        if (live()) setLoading(false);
      }
    },
    // profileTimezone intentionally omitted: it is read as a hint only. `locale` stays a
    // dependency so a language switch re-creates load and re-runs the load effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, reloadChartProfiles, recordAccess],
  );

  /** Coalesce overlapping loads (mount + auth events + locale change). */
  const loadOnce = useCallback(
    (opts?: { silent?: boolean; force?: boolean; poll?: boolean }) => {
      const key = `${localeRef.current}:${readActiveChartId() ?? "self"}`;
      if (inflight.current && inflight.current.key === key && !opts?.force) {
        return inflight.current.promise;
      }
      const promise = load(opts).finally(() => {
        if (inflight.current?.promise === promise) inflight.current = null;
      });
      inflight.current = { key, promise };
      return promise;
    },
    [load],
  );

  const fetchDay = useCallback(
    async (date: string): Promise<TodayPayload | null> => {
      const uid = userIdRef.current;
      const loc = localeRef.current;
      const chartId = readActiveChartId();
      if (uid) {
        const cached = readCachedToday(uid, loc, chartId, date);
        if (cached) return cached;
      }
      const { res, json } = await postEngine(
        engineExtras(loc, chartId, { action: "today_get", date }),
      );
      if (!res.ok) {
        throw new Error(json.error?.toString() ?? "Could not load this day");
      }
      const parsed = parseTodayPayload(json);
      if (uid && parsed.date === date) writeCachedToday(uid, loc, chartId, parsed);
      return parsed;
    },
    [],
  );

  const setActiveChartProfile = useCallback(
    async (id: string | null, label?: string | null) => {
      setActiveChartProfileId(id);
      setActiveChartLabel(label ?? null);
      setPreparing(null);
      if (id) {
        localStorage.setItem(CHART_PROFILE_STORAGE_KEY, id);
        if (label) localStorage.setItem(ACTIVE_LABEL_KEY, label);
      } else {
        localStorage.removeItem(CHART_PROFILE_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_LABEL_KEY);
      }
      // Cache-first: switching back to your own (or any previously opened) chart renders
      // instantly from the per-chart cache and revalidates in the background. The load
      // clears stale data itself when nothing is cached for the new chart.
      await loadOnce({ silent: true });
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
    if (found) {
      setActiveChartLabel(found.label);
      try {
        localStorage.setItem(ACTIVE_LABEL_KEY, found.label);
      } catch {
        /* ignore */
      }
    }
  }, [activeChartProfileId, chartProfiles]);

  // While a reading is generating, poll (each poll also nudges the background generator)
  // and swap the reading in as soon as it is ready — no "pull down to refresh".
  useEffect(() => {
    if (!preparing || preparing.stalled) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "hidden") {
        setPollTick((n) => n + 1);
        return;
      }
      void loadOnce({ silent: true, poll: true });
    }, PACK_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [preparing, pollTick, loadOnce]);

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
      const id = json.id?.toString() ?? "";
      const label = json.label?.toString() ?? input.label;

      // Show the new chart right away; everything slow happens in the background.
      setChartProfiles((prev) => [
        ...prev.filter((p) => p.id !== id),
        {
          id,
          label,
          birthInputId,
          dateOfBirth: input.dateOfBirth,
          birthPlace: input.birthPlace,
          exactBirthTime: input.exactBirthTime ?? undefined,
          timeBucket: input.timeBucket ?? undefined,
        },
      ]);
      const init = birthInputId
        ? fetch("/api/engine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "chart_initialize",
              birth_input_id: birthInputId,
              locale,
            }),
          }).catch(() => undefined)
        : Promise.resolve(undefined);
      void init.then(() => reloadChartProfiles());
      // Switch to the new chart without waiting: its reading starts generating on the
      // first load and the progress state resolves on its own.
      void setActiveChartProfile(id, label);
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
      isPro: (access?.isPro ?? pack?.access?.isPro) === true,
      preparing,
      retryPreparing: () => {
        setPreparing(null);
        void loadOnce({ silent: true, force: true });
      },
      refresh: async () => {
        clearEngineCache();
        await loadOnce({ force: true });
      },
      fetchDay,
      dataLocale,
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
    access,
    preparing,
    today,
    loading,
    error,
    loadOnce,
    fetchDay,
    dataLocale,
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
