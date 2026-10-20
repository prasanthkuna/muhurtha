export type ResolvedPlace = {
  label: string;
  lat: number;
  lng: number;
  timezone: string;
};

export async function resolvePlaceByCoords(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "birth_place_resolve", lat, lng }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) return null;
  const rLat = Number(data.lat);
  const rLng = Number(data.lng);
  const timezone = data.timezone?.toString();
  const label =
    data.resolvedLabel?.toString() ||
    data.label?.toString() ||
    data.place?.toString() ||
    `${rLat.toFixed(2)}, ${rLng.toFixed(2)}`;
  if (!Number.isFinite(rLat) || !Number.isFinite(rLng) || !timezone) return null;
  return { label, lat: rLat, lng: rLng, timezone };
}

export async function resolvePlaceByQuery(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q) return null;
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "birth_place_resolve", place: q }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) return null;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const timezone = data.timezone?.toString();
  const label = data.resolvedLabel?.toString() || data.label?.toString() || q;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timezone) return null;
  return { label, lat, lng, timezone };
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
