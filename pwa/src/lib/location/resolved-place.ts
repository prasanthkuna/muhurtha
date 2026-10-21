export type ResolvedPlace = {
  label: string;
  lat: number;
  lng: number;
  timezone: string;
};

async function enginePost(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export async function searchPlaces(query: string, limit = 8): Promise<ResolvedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { res, data } = await enginePost({
    action: "birth_place_search",
    query: q,
    limit,
  });
  if (!res.ok) {
    throw new Error(data.error?.toString() ?? "Place search failed");
  }
  const raw = data.suggestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => mapRow(row, q))
    .filter((p): p is ResolvedPlace => p != null);
}

export function readDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 25_000,
      maximumAge: 60_000,
    });
  });
}

export async function detectCurrentPlace(): Promise<ResolvedPlace> {
  const pos = await readDeviceLocation();
  const resolved = await resolvePlaceByCoords(pos.coords.latitude, pos.coords.longitude);
  if (!resolved) throw new Error("Could not resolve this location.");
  return resolved;
}
