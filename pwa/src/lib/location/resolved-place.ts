import { localPlaceHints } from "@/lib/location/place-hints";

export type ResolvedPlace = {
  label: string;
  lat: number;
  lng: number;
  timezone: string;
};

async function enginePost(body: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { res, data };
}

function mapRow(data: Record<string, unknown>, fallbackLabel: string): ResolvedPlace | null {
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const timezone = data.timezone?.toString();
  const label =
    data.resolvedLabel?.toString() ||
    data.label?.toString() ||
    data.place?.toString() ||
    fallbackLabel;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timezone) return null;
  return { label, lat, lng, timezone };
}

function mergePlaces(primary: ResolvedPlace[], extra: ResolvedPlace[], limit: number): ResolvedPlace[] {
  const seen = new Set<string>();
  const out: ResolvedPlace[] = [];
  for (const p of [...primary, ...extra]) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export async function resolvePlaceByCoords(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const { res, data } = await enginePost({ action: "birth_place_resolve", lat, lng });
  if (!res.ok) {
    throw new Error(data.error?.toString() ?? "Could not resolve coordinates");
  }
  return mapRow(data, `${lat.toFixed(2)}, ${lng.toFixed(2)}`);
}

export async function resolvePlaceByQuery(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q) return null;
  const { res, data } = await enginePost({ action: "birth_place_resolve", place: q });
  if (!res.ok) {
    throw new Error(data.error?.toString() ?? "Could not resolve that place");
  }
  return mapRow(data, q);
}

export async function searchPlaces(
  query: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<ResolvedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const instant = localPlaceHints(q, limit);

  const { res, data } = await enginePost(
    {
      action: "birth_place_search",
      query: q,
      limit,
    },
    signal,
  );
  if (!res.ok) {
    if (instant.length > 0) return instant;
    throw new Error(data.error?.toString() ?? "Place search failed");
  }
  const raw = data.suggestions;
  if (!Array.isArray(raw)) return instant;
  const remote = raw
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => mapRow(row, q))
    .filter((p): p is ResolvedPlace => p != null);

  return mergePlaces(instant, remote, limit);
}

export function readDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 120_000,
    });
  });
}

export function geolocationErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err === null || !("code" in err)) {
    return err instanceof Error ? err.message : "Could not detect location.";
  }
  const code = (err as GeolocationPositionError).code;
  if (code === 1) return "Location permission denied. Allow location in browser settings.";
  if (code === 2) return "Location unavailable. Try search instead.";
  if (code === 3) return "Location timed out. Try again or search a city.";
  return "Could not detect location.";
}

export async function detectCurrentPlace(): Promise<ResolvedPlace> {
  let pos: GeolocationPosition;
  try {
    pos = await readDeviceLocation();
  } catch (e) {
    throw new Error(geolocationErrorMessage(e));
  }
  const resolved = await resolvePlaceByCoords(pos.coords.latitude, pos.coords.longitude);
  if (!resolved) throw new Error("Could not resolve this location.");
  return resolved;
}
