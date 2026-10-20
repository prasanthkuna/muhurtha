import type { BirthPackPayload } from "./types";

const KEY = "muhurtha_birth_pack_v1";
const TTL_MS = 20 * 60 * 1000;

type Cached = { savedAt: number; pack: BirthPackPayload };

export function readPackCache(): BirthPackPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.pack;
  } catch {
    return null;
  }
}

export function writePackCache(pack: BirthPackPayload) {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { savedAt: Date.now(), pack };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearPackCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
