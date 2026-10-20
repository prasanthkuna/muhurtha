import type { BirthPackPayload } from "./types";
import { clearEngineCache } from "./engine-cache";

/** @deprecated use engine-cache; kept for call sites */
export function readPackCache(): BirthPackPayload | null {
  return null;
}

export function writePackCache(_: BirthPackPayload) {
  /* handled by engine-cache in app-data-context */
}

export function clearPackCache() {
  clearEngineCache();
}
