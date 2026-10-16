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

export async function resolveBirthPlace(
  placeRaw: string | null | undefined,
): Promise<BirthPlaceResolution | null> {
  const place = cleanPlace(placeRaw ?? "");
  if (place.length < 2) return null;

  const q = /\bindia\b/i.test(place) ? place : `${place}, India`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MuhurthaApp/1.0 support@muhurta.app",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) {
    console.warn("Birth place geocode failed", res.status, await res.text());
    return fallbackIndianCity(place);
  }
  const rows = await res.json() as NominatimRow[];
  const top = Array.isArray(rows) ? rows[0] : null;
  const lat = Number(top?.lat);
  const lng = Number(top?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fallbackIndianCity(place);
  }

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

export async function resolveCoordinates(
  lat: number,
  lng: number,
): Promise<BirthPlaceResolution | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MuhurthaApp/1.0 support@muhurta.app",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) {
    console.warn("Reverse geocode failed", res.status, await res.text());
    return null;
  }
  const top = await res.json() as NominatimReverseRow;
  let timezone = "Asia/Kolkata";
  try {
    timezone = tzLookup(lat, lng);
  } catch {
    timezone = "Asia/Kolkata";
  }

  const city = shortCityLabel(top) || top?.display_name?.trim() || "Current location";
  return {
    place: city,
    resolvedLabel: city,
    lat,
    lng,
    timezone,
    source: "nominatim",
  };
}
