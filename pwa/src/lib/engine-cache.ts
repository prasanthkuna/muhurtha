import type { BirthPackPayload } from "./types";
import type { TodayPayload } from "./today-types";

const PACK_PREFIX = "muh_engine_pack_v4_";
const TODAY_PREFIX = "muh_engine_today_v4_";
// Last reading stays renderable offline for a week; it is revalidated hourly when online.
const PACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CachedPack = { savedAt: number; pack: BirthPackPayload };
type CachedToday = { savedAt: number; today: TodayPayload };

function packKey(userId: string, locale: string, chartProfileId: string | null) {
  return `${PACK_PREFIX}${userId}_${locale}_${chartProfileId ?? "self"}`;
}

function todayKey(userId: string, locale: string, chartProfileId: string | null, date: string) {
  return `${TODAY_PREFIX}${userId}_${locale}_${chartProfileId ?? "self"}_${date}`;
}

const LAST_UID_KEY = "muh_last_uid_v1";
const PROFILE_TZ_KEY = "muh_profile_tz_v1";
/** Pack older than this is still rendered instantly but revalidated in the background. */
export const PACK_REVALIDATE_MS = 60 * 60 * 1000;

export function readLastUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_UID_KEY);
  } catch {
    return null;
  }
}

export function writeLastUserId(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (uid) localStorage.setItem(LAST_UID_KEY, uid);
    else localStorage.removeItem(LAST_UID_KEY);
  } catch {
    /* ignore */
  }
}

export function readCachedTimezone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PROFILE_TZ_KEY);
  } catch {
    return null;
  }
}

export function writeCachedTimezone(tz: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_TZ_KEY, tz);
  } catch {
    /* ignore */
  }
}

/** Cached pack plus its age, for stale-while-revalidate. */
export function readCachedPackEntry(
  userId: string,
  locale: string,
  chartProfileId: string | null,
): { pack: BirthPackPayload; ageMs: number } | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(packKey(userId, locale, chartProfileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPack;
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > PACK_TTL_MS) return null;
    return { pack: parsed.pack, ageMs };
  } catch {
    return null;
  }
}

export function readCachedPack(
  userId: string,
  locale: string,
  chartProfileId: string | null,
): BirthPackPayload | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(packKey(userId, locale, chartProfileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPack;
    if (Date.now() - parsed.savedAt > PACK_TTL_MS) return null;
    return parsed.pack;
  } catch {
    return null;
  }
}

export function writeCachedPack(
  userId: string,
  locale: string,
  chartProfileId: string | null,
  pack: BirthPackPayload,
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: CachedPack = { savedAt: Date.now(), pack };
    localStorage.setItem(packKey(userId, locale, chartProfileId), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function readCachedToday(
  userId: string,
  locale: string,
  chartProfileId: string | null,
  date: string,
): TodayPayload | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(todayKey(userId, locale, chartProfileId, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedToday;
    if (parsed.today.date !== date) return null;
    return parsed.today;
  } catch {
    return null;
  }
}

export function writeCachedToday(
  userId: string,
  locale: string,
  chartProfileId: string | null,
  today: TodayPayload,
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: CachedToday = { savedAt: Date.now(), today };
    localStorage.setItem(
      todayKey(userId, locale, chartProfileId, today.date),
      JSON.stringify(payload),
    );
  } catch {
    /* quota */
  }
}

export function clearEngineCache(opts?: { forgetUser?: boolean }) {
  if (typeof window === "undefined") return;
  if (opts?.forgetUser) {
    writeLastUserId(null);
    try {
      localStorage.removeItem(PROFILE_TZ_KEY);
    } catch {
      /* ignore */
    }
  }
  for (const key of Object.keys(localStorage)) {
    // Also sweeps older cache versions (v3 and before).
    if (key.startsWith("muh_engine_pack_v") || key.startsWith("muh_engine_today_v")) {
      localStorage.removeItem(key);
    }
  }
}
