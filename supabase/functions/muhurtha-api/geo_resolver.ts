import tzLookup from "tz-lookup";

export type BirthPlaceResolution = {
  place: string;
  resolvedLabel: string;
  lat: number;
  lng: number;
  timezone: string;
  source: "nominatim";
};

type NominatimRow = {
  display_name?: string;
  lat?: string;
  lon?: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    state_district?: string;
  };
};

type NominatimReverseRow = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimRow["address"];
};

const GEO_TIMEOUT_MS = 4_000;
const NOMINATIM_HEADERS = {
  "User-Agent": "MuhurthaApp/1.1 (+https://pwa-lyart-phi.vercel.app; support@muhurta.app)",
  "Accept-Language": "en",
};

/** fetch with a hard timeout so a slow geocoder never stalls the request. */
async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = GEO_TIMEOUT_MS,
): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    console.warn("Geocoder request failed", String(url).split("?")[0], String(e));
    return null;
  }
}

function safeTimezone(lat: number, lng: number): string {
  try {
    return tzLookup(lat, lng);
  } catch {
    return "Asia/Kolkata";
  }
}

function cleanPlace(place: string): string {
  return place.trim().replace(/\s+/g, " ");
}

/** Known Indian localities when Nominatim rate-limits or misses spelling variants. */
const IN_CITY_FALLBACKS: Record<string, { lat: number; lng: number; label: string }> = {
  gudivada: { lat: 16.441, lng: 80.9926, label: "Gudivada" },
  gudivadaandhra: { lat: 16.441, lng: 80.9926, label: "Gudivada" },
  hyderabad: { lat: 17.385, lng: 78.4867, label: "Hyderabad" },
  vijayawada: { lat: 16.5062, lng: 80.648, label: "Vijayawada" },
  visakhapatnam: { lat: 17.6868, lng: 83.2185, label: "Visakhapatnam" },
  vizag: { lat: 17.6868, lng: 83.2185, label: "Visakhapatnam" },
};

function fallbackIndianCity(place: string): BirthPlaceResolution | null {
  const key = place.toLowerCase().replace(/[^a-z]/g, "");
  const hit = IN_CITY_FALLBACKS[key];
  if (!hit) return null;
  let timezone = "Asia/Kolkata";
  try {
    timezone = tzLookup(hit.lat, hit.lng);
  } catch {
    timezone = "Asia/Kolkata";
  }
  return {
    place,
    resolvedLabel: hit.label,
    lat: hit.lat,
    lng: hit.lng,
    timezone,
    source: "nominatim",
  };
}

function rowToResolution(place: string, top: NominatimRow | null): BirthPlaceResolution | null {
  const lat = Number(top?.lat);
  const lng = Number(top?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let timezone = "Asia/Kolkata";
  try {
    timezone = tzLookup(lat, lng);
  } catch {
    timezone = "Asia/Kolkata";
  }
  return {
    place,
    resolvedLabel: shortCityLabel(top) || top?.display_name?.trim() || place,
    lat,
    lng,
    timezone,
    source: "nominatim",
  };
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

async function photonSearch(q: string, limit: number): Promise<BirthPlaceResolution[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(10, Math.max(1, limit))));
  url.searchParams.set("lang", "en");

  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
  });
  if (!res || !res.ok) {
    console.warn("Photon geocode failed", res?.status);
    return [];
  }
  const payload = await res.json() as { features?: PhotonFeature[] };
  const features = Array.isArray(payload.features) ? payload.features : [];
  const out: BirthPlaceResolution[] = [];
  for (const f of features) {
    const coords = f.geometry?.coordinates;
    const lng = coords?.[0];
    const lat = coords?.[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const props = f.properties ?? {};
    const cc = props.countrycode?.toUpperCase();
    if (cc && cc !== "IN") continue;
    const name = props.name?.trim() || props.city?.trim();
    if (!name) continue;
    const state = props.state?.trim();
    const label = state ? `${name}, ${state}` : name;
    let timezone = "Asia/Kolkata";
    try {
      timezone = tzLookup(lat!, lng!);
    } catch {
      timezone = "Asia/Kolkata";
    }
    out.push({
      place: q,
      resolvedLabel: label,
      lat: lat!,
      lng: lng!,
      timezone,
      source: "nominatim",
    });
    if (out.length >= limit) break;
  }
  return out;
}

function dedupeResolutions(rows: BirthPlaceResolution[]): BirthPlaceResolution[] {
  const seen = new Set<string>();
  const out: BirthPlaceResolution[] = [];
  for (const r of rows) {
    const key = `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function nominatimSearch(q: string, limit: number): Promise<NominatimRow[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(Math.min(10, Math.max(1, limit))));
  url.searchParams.set("addressdetails", "1");

  const res = await fetchWithTimeout(url, { headers: NOMINATIM_HEADERS });
  if (!res || !res.ok) {
    console.warn("Birth place geocode failed", res?.status);
    return [];
  }
  const rows = await res.json().catch(() => []) as NominatimRow[];
  return Array.isArray(rows) ? rows : [];
}

export async function searchBirthPlaces(
  placeRaw: string | null | undefined,
  limit = 8,
): Promise<BirthPlaceResolution[]> {
  const place = cleanPlace(placeRaw ?? "");
  if (place.length < 2) return [];

  const q = /\bindia\b/i.test(place) ? place : `${place}, India`;
  const [photonRows, nominatimRows] = await Promise.all([
    photonSearch(q, limit),
    nominatimSearch(q, limit).then((rows) =>
      rows
        .map((row) => rowToResolution(place, row))
        .filter((r): r is BirthPlaceResolution => r != null)
    ),
  ]);

  const merged = dedupeResolutions([...photonRows, ...nominatimRows]).slice(0, limit);
  if (merged.length > 0) return merged;

  const fallback = fallbackIndianCity(place);
  return fallback ? [fallback] : [];
}

export async function resolveBirthPlace(
  placeRaw: string | null | undefined,
): Promise<BirthPlaceResolution | null> {
  const place = cleanPlace(placeRaw ?? "");
  if (place.length < 2) return null;

  const q = /\bindia\b/i.test(place) ? place : `${place}, India`;
  const rows = await nominatimSearch(q, 1);
  const top = rows[0] ?? null;
  const resolved = rowToResolution(place, top);
  if (resolved) return resolved;
  return fallbackIndianCity(place);
}

function shortCityLabel(row: NominatimRow | NominatimReverseRow | null): string {
  const addr = row?.address;
  if (!addr) return "";
  return (
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.village?.trim() ||
    addr.state_district?.trim() ||
    ""
  );
}

type PhotonReverse = { features?: PhotonFeature[] };
type BigDataCloudReverse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

async function nominatimReverse(lat: number, lng: number): Promise<string> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "10");
  const res = await fetchWithTimeout(url, { headers: NOMINATIM_HEADERS });
  if (!res || !res.ok) {
    console.warn("Nominatim reverse failed", res?.status);
    return "";
  }
  const top = await res.json().catch(() => null) as NominatimReverseRow | null;
  return shortCityLabel(top);
}

async function photonReverse(lat: number, lng: number): Promise<string> {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lang", "en");
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res || !res.ok) {
    console.warn("Photon reverse failed", res?.status);
    return "";
  }
  const payload = await res.json().catch(() => null) as PhotonReverse | null;
  const props = payload?.features?.[0]?.properties;
  return props?.city?.trim() || props?.name?.trim() || "";
}

async function bigDataCloudReverse(lat: number, lng: number): Promise<string> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "en");
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res || !res.ok) {
    console.warn("BigDataCloud reverse failed", res?.status);
    return "";
  }
  const payload = await res.json().catch(() => null) as BigDataCloudReverse | null;
  return payload?.city?.trim() || payload?.locality?.trim() || "";
}

function nearestKnownCity(lat: number, lng: number): string {
  let best = "";
  let bestDist = Infinity;
  for (const city of Object.values(IN_CITY_FALLBACKS)) {
    const d = Math.hypot(city.lat - lat, city.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = city.label;
    }
  }
  // ~0.35 degrees ≈ 35-40 km: close enough to call it "near <city>".
  return bestDist <= 0.35 ? best : "";
}

/**
 * Reverse geocode for "use my location". Coordinates + timezone are what timing needs,
 * so a valid lat/lng never fails: providers are tried in order (each with a 4 s cap)
 * and the label falls back to a nearby known city or the rounded coordinates.
 */
export async function resolveCoordinates(
  lat: number,
  lng: number,
): Promise<BirthPlaceResolution | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  let label = await nominatimReverse(lat, lng);
  if (!label) label = await photonReverse(lat, lng);
  if (!label) label = await bigDataCloudReverse(lat, lng);
  if (!label) label = nearestKnownCity(lat, lng);
  if (!label) label = `Near ${lat.toFixed(2)}, ${lng.toFixed(2)}`;

  return {
    place: label,
    resolvedLabel: label,
    lat,
    lng,
    timezone: safeTimezone(lat, lng),
    source: "nominatim",
  };
}
