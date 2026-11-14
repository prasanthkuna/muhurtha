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
import { lifeStageFromDob, type LifeStage } from "@/lib/life-stage";
import { CHART_PROFILE_STORAGE_KEY } from "@/lib/locale";
import {
  clearEngineCache,
  PACK_REVALIDATE_MS,
  clearCachedTodays,
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
import { fetchBillingStatus, type AccessDetails, type BillingStatus } from "@/lib/billing";
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
  /** Reading v2 job status (when the engine reports it). */
  pct?: number;
  stage?: string;
  slow?: boolean;
  failed?: boolean;
  /** Sharded reading: Decode preview (profile, current chapter, today) once part A is written. */
  preview?: ReadingPreview | null;
  /** Engine chart facts (birth star, Moon sign, current chapter), shown while the words are written. */
  chart?: ChartFacts | null;
};

export type ChartFacts = {
  nakshatra: string | null;
  nakshatraLabel: string | null;
  moonSign: string | null;
  moonSignLabel: string | null;
  md: string | null;
  ad: string | null;
  mdLabel: string | null;
  adLabel: string | null;
  adUntil: string | null;
};

/** Your reading exists in another language but not this one: written only when asked. */
export type NotWritten = { locale: string; otherLocales: string[]; chart: ChartFacts | null };

function chartFactsFrom(raw: unknown): ChartFacts | null {
  if (!raw || typeof raw !== "object") return null;
  const j = raw as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    nakshatra: s(j.nakshatra), nakshatraLabel: s(j.nakshatraLabel) ?? s(j.nakshatra),
    moonSign: s(j.moonSign), moonSignLabel: s(j.moonSignLabel),
    md: s(j.md), ad: s(j.ad), mdLabel: s(j.mdLabel) ?? s(j.md), adLabel: s(j.adLabel) ?? s(j.ad),
    adUntil: s(j.adUntil),
  };
}

export type ReadingPreview = {
  profile: { title: string; summary: string; strengths: string[] } | null;
  chapter: { title: string; highlight: string; body: string; period: string } | null;
  today: { date: string; title: string; line: string } | null;
};

type AccessInfo = Partial<AccessDetails>;

const ACTIVE_LABEL_KEY = "muh_active_chart_label_v1";
const ACTIVE_DOB_KEY = "muh_active_chart_dob_v1";
/** While a renamed/legacy friend reading regenerates in the background, re-check this often. */
const PACK_REFRESH_POLL_MS = 15_000;
const ACCESS_KEY_PREFIX = "muh_access_v1_";
const PACK_POLL_MS = 4_000;
const PACK_STALL_MS = 10 * 60_000;

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
  /** Full plan details (provider, renewal date…) when known. */
  access: AccessInfo | null;
  /** Apply an authoritative access payload (e.g. right after checkout). */
  applyAccess: (next: AccessInfo) => void;
  /** Re-read plan + today's usage from the server. */
  refreshAccess: () => Promise<BillingStatus | null>;
  /** Set while a reading (e.g. a newly added friend chart) is being generated. */
  preparing: PackPreparing | null;
  retryPreparing: () => void;
  /** Set when this language's reading has not been written yet (another language has one). */
  notWritten: NotWritten | null;
  /** Start writing the reading in the current language (after the user asks for it). */
  writeReadingInLocale: () => void;
  refresh: () => Promise<void>;
  /** Day payload for any date (cached per user/locale/chart/date); used by Today's day browser. */
  fetchDay: (date: string) => Promise<TodayPayload | null>;
  /** Locale the currently loaded pack/today were produced in. */
  dataLocale: string | null;
  activeChartProfileId: string | null;
  activeChartLabel: string | null;
  /** Age band of the chart on screen (friend charts by birth date; your own = adult). */
  activeLifeStage: LifeStage;
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

const CHART_LIST_KEY = "muhurta.chartProfiles.v1";

function readCachedChartProfiles(uid: string | null): ChartProfileSummary[] {
  if (!uid || typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(`${CHART_LIST_KEY}:${uid}`) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((p): p is ChartProfileSummary => Boolean(p && typeof p.id === "string" && p.label))
      : [];
  } catch {
    return [];
  }
}

function writeCachedChartProfiles(uid: string | null, list: ChartProfileSummary[]) {
  if (!uid || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CHART_LIST_KEY}:${uid}`, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
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
  const [activeChartDob, setActiveChartDob] = useState<string | null>(null);
  const [packRefreshing, setPackRefreshing] = useState(false);
  const [chartProfiles, setChartProfiles] = useState<ChartProfileSummary[]>([]);
  const [dataLocale, setDataLocale] = useState<string | null>(null);
  const [access, setAccessState] = useState<AccessInfo | null>(null);
  const [preparing, setPreparing] = useState<PackPreparing | null>(null);
  const [notWritten, setNotWritten] = useState<NotWritten | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const chartProfilesRef = useRef<ChartProfileSummary[]>([]);
  useEffect(() => {
    chartProfilesRef.current = chartProfiles;
  }, [chartProfiles]);
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
      // Family charts survive a hard reload (the chip menu used to show only "You" until a
      // full load finished, and never if that load was superseded or failed).
      const cachedCharts = readCachedChartProfiles(snap.uid);
      if (cachedCharts.length) setChartProfiles(cachedCharts);
    }
    if (readActiveChartId()) {
      try {
        setActiveChartLabel(localStorage.getItem(ACTIVE_LABEL_KEY));
        setActiveChartDob(localStorage.getItem(ACTIVE_DOB_KEY));
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

  const lastAccessJson = useRef<string>("");
  const recordAccess = useCallback((next: AccessInfo | undefined | null) => {
    if (!next || typeof next !== "object" || next.isPro === undefined) return;
    // Same entitlement again (every billing_status poll): keep the old object so nothing re-renders.
    const json = JSON.stringify(next);
    if (json === lastAccessJson.current) return;
    lastAccessJson.current = json;
    setAccessState(next);
    writeAccess(userIdRef.current, next);
  }, []);

  /** Stable across renders: consumers (paywall, plan section) may list it in effect deps. */
  const applyAccess = useCallback((next: AccessInfo) => recordAccess(next), [recordAccess]);
  const refreshAccess = useCallback(async () => {
    const status = await fetchBillingStatus();
    if (status?.access) recordAccess(status.access);
    return status;
  }, [recordAccess]);

  const reloadChartProfiles = useCallback(async () => {
    try {
      const { res, json } = await postEngine({
        action: "chart_profile_list",
        locale: localeRef.current,
      });
      if (res.ok) {
        const list = parseChartProfileList(json);
        setChartProfiles(list);
        writeCachedChartProfiles(userIdRef.current, list);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean; force?: boolean; poll?: boolean; retry?: boolean; generate?: boolean }) => {
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
      const setPreparingFrom = (raw: unknown, chartRaw?: unknown) => {
        const chart = chartFactsFrom(chartRaw);
        const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const done = Number(p.done ?? 0) || 0;
        const total = Number(p.total ?? 0) || 0;
        const pct = typeof p.pct === "number" ? p.pct : undefined;
        const stage = typeof p.stage === "string" ? p.stage : undefined;
        const failed = p.state === "failed";
        const slow = p.slow === true;
        const preview = p.preview && typeof p.preview === "object" ? (p.preview as ReadingPreview) : null;
        setPreparing((prev) => {
          const progressed = !prev || done !== prev.done || stage !== prev.stage;
          const startedAt = prev && !progressed ? prev.startedAt : Date.now();
          return {
            done,
            total,
            startedAt,
            stalled: failed || Date.now() - startedAt > PACK_STALL_MS,
            pct,
            stage,
            slow,
            failed,
            preview: preview ?? prev?.preview ?? null,
            chart: chart ?? prev?.chart ?? null,
          };
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
          setChartProfiles([]);
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
        // The chart list does not depend on the reading: fetch it right away, in parallel.
        if (!opts?.poll) void reloadChartProfiles();

        const cachedEntry = opts?.force ? null : cachedFor(uid);
        const hasPack = Boolean(cachedEntry);
        const switchedData = dataKeyRef.current !== dataKey;
        if (cachedEntry) {
          setPack(cachedEntry.pack);
          recordAccess(cachedEntry.pack.access);
          setPreparing(null);
          setNotWritten(null);
          markData();
        } else if (switchedData) {
          // Language or chart changed and nothing is cached for it: never keep showing the
          // previous language's reading while the new one loads.
          setPack(null);
          setToday(null);
          setNotWritten(null);
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

        const fetchToday = async (zone: string, fresh = false) => {
          const date = todayInTimezone(zone);
          const cached = opts?.force || fresh ? null : readCachedToday(uid!, locale, chartId, date);
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

        const fetchTodayFresh = (zone: string) => fetchToday(zone, true);

        const needPackFetch =
          opts?.force || !cachedEntry || cachedEntry.ageMs > PACK_REVALIDATE_MS;
        const packTask = needPackFetch
          ? postEngine(
              engineExtras(locale, chartId, {
                action: "birth_pack_get",
                may_generate: false,
                // Engine starts/advances generation in the background if no reading exists.
                ensure: true,
                ...(opts?.retry ? { retry: true } : {}),
                ...(opts?.generate ? { generate_locale: true } : {}),
              }),
            ).then(({ res, json }) => {
              if (!live()) return;
              if (res.ok && json.not_written === true) {
                if (hasPack) return;
                markData();
                setError(null);
                setPreparing(null);
                setNotWritten({
                  locale: json.locale?.toString() ?? locale,
                  otherLocales: Array.isArray(json.otherLocales) ? json.otherLocales.map(String) : [],
                  chart: chartFactsFrom(json.chart),
                });
                return;
              }
              if (res.ok && json.generating === true) {
                recordAccess(json.access as AccessInfo | undefined);
                if (hasPack) return; // keep showing the cached reading
                markData();
                setError(null);
                setNotWritten(null);
                setPreparingFrom(json.progress, json.chart);
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
              // Old reading served while a corrected one regenerates (e.g. a friend chart
              // written with the wrong name): keep polling quietly until it lands.
              setPackRefreshing(Boolean(json.refreshing));
              recordAccess(normalized.access);
              // A regenerated or corrected reading: cached Today/day payloads carry the old text.
              const versionChanged = Boolean(
                cachedEntry && cachedEntry.pack.readingVersion !== normalized.readingVersion,
              );
              setPack(normalized);
              setPreparing(null);
              setNotWritten(null);
              markData();
              setError(null);
              writeCachedPack(uid!, locale, chartId, normalized);
              if (versionChanged) {
                clearCachedTodays(uid!, locale, chartId);
                void fetchTodayFresh(tz);
              }
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
    (opts?: { silent?: boolean; force?: boolean; poll?: boolean; retry?: boolean; generate?: boolean }) => {
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
      setActiveChartDob(id ? chartProfilesRef.current.find((p) => p.id === id)?.dateOfBirth ?? null : null);
      setPackRefreshing(false);
      setPreparing(null);
      if (id) {
        localStorage.setItem(CHART_PROFILE_STORAGE_KEY, id);
        if (label) localStorage.setItem(ACTIVE_LABEL_KEY, label);
      } else {
        localStorage.removeItem(CHART_PROFILE_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_LABEL_KEY);
        localStorage.removeItem(ACTIVE_DOB_KEY);
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
      setActiveChartDob(null);
      return;
    }
    const found = chartProfiles.find((p) => p.id === activeChartProfileId);
    if (found) {
      setActiveChartLabel(found.label);
      setActiveChartDob(found.dateOfBirth ?? null);
      try {
        localStorage.setItem(ACTIVE_LABEL_KEY, found.label);
        if (found.dateOfBirth) localStorage.setItem(ACTIVE_DOB_KEY, found.dateOfBirth);
        else localStorage.removeItem(ACTIVE_DOB_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [activeChartProfileId, chartProfiles]);

  useEffect(() => {
    if (!packRefreshing) return;
    const timer = window.setTimeout(() => {
      void loadOnce({ silent: true, poll: true, force: true });
    }, PACK_REFRESH_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [packRefreshing, pack, loadOnce]);

  const activeLifeStage = useMemo<LifeStage>(
    () => (activeChartProfileId ? lifeStageFromDob(activeChartDob) : "adult"),
    [activeChartProfileId, activeChartDob],
  );

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
      access,
      applyAccess,
      refreshAccess,
      preparing,
      retryPreparing: () => {
        setPreparing(null);
        void loadOnce({ silent: true, force: true, retry: true });
      },
      notWritten,
      writeReadingInLocale: () => {
        setNotWritten(null);
        setPreparing({ done: 0, total: 0, startedAt: Date.now(), stalled: false, chart: notWritten?.chart ?? null });
        void loadOnce({ silent: true, force: true, generate: true });
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
      activeLifeStage,
      chartProfiles,
      setActiveChartProfile,
      reloadChartProfiles,
      saveChartProfile,
      deleteChartProfile,
    };
  }, [
    pack,
    access,
    applyAccess,
    refreshAccess,
    preparing,
    notWritten,
    today,
    loading,
    error,
    loadOnce,
    fetchDay,
    dataLocale,
    userId,
    activeChartProfileId,
    activeChartLabel,
    activeLifeStage,
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
