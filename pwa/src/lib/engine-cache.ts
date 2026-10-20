import type { BirthPackPayload } from "./types";
import type { TodayPayload } from "./today-types";

const PACK_PREFIX = "muh_engine_pack_v2_";
const TODAY_PREFIX = "muh_engine_today_v2_";
const PACK_TTL_MS = 24 * 60 * 60 * 1000;

type CachedPack = { savedAt: number; pack: BirthPackPayload };
type CachedToday = { savedAt: number; today: TodayPayload };

function packKey(locale: string, chartProfileId: string | null) {
  return `${PACK_PREFIX}${locale}_${chartProfileId ?? "self"}`;
}

function todayKey(locale: string, chartProfileId: string | null, date: string) {
  return `${TODAY_PREFIX}${locale}_${chartProfileId ?? "self"}_${date}`;
}

export function readCachedPack(locale: string, chartProfileId: string | null): BirthPackPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(packKey(locale, chartProfileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPack;
    if (Date.now() - parsed.savedAt > PACK_TTL_MS) return null;
    return parsed.pack;
  } catch {
    return null;
  }
}

export function writeCachedPack(locale: string, chartProfileId: string | null, pack: BirthPackPayload) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPack = { savedAt: Date.now(), pack };
    localStorage.setItem(packKey(locale, chartProfileId), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function readCachedToday(
  locale: string,
  chartProfileId: string | null,
  date: string,
): TodayPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(todayKey(locale, chartProfileId, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedToday;
    if (parsed.today.date !== date) return null;
    return parsed.today;
  } catch {
    return null;
  }
}

export function writeCachedToday(
  locale: string,
  chartProfileId: string | null,
  today: TodayPayload,
) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedToday = { savedAt: Date.now(), today };
    localStorage.setItem(todayKey(locale, chartProfileId, today.date), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearEngineCache() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PACK_PREFIX) || key.startsWith(TODAY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}
