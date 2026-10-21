import type { ResolvedPlace } from "@/lib/location/resolved-place";

/** Instant prefix matches (no network) — keep in sync with geo_resolver IN_CITY_FALLBACKS. */
const HINTS: { keys: string[]; place: ResolvedPlace }[] = [
  {
    keys: ["gudivada", "gudivada andhra"],
    place: { label: "Gudivada, Andhra Pradesh", lat: 16.441, lng: 80.9926, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["hyderabad", "hyd"],
    place: { label: "Hyderabad, Telangana", lat: 17.385, lng: 78.4867, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["vijayawada", "bezawada"],
    place: { label: "Vijayawada, Andhra Pradesh", lat: 16.5062, lng: 80.648, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["visakhapatnam", "vizag", "visakha"],
    place: {
      label: "Visakhapatnam, Andhra Pradesh",
      lat: 17.6868,
      lng: 83.2185,
      timezone: "Asia/Kolkata",
    },
  },
  {
    keys: ["bengaluru", "bangalore", "blr"],
    place: { label: "Bengaluru, Karnataka", lat: 12.9716, lng: 77.5946, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["chennai", "madras"],
    place: { label: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["mumbai", "bombay"],
    place: { label: "Mumbai, Maharashtra", lat: 19.076, lng: 72.8777, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["delhi", "new delhi"],
    place: { label: "New Delhi, Delhi", lat: 28.6139, lng: 77.209, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["kolkata", "calcutta"],
    place: { label: "Kolkata, West Bengal", lat: 22.5726, lng: 88.3639, timezone: "Asia/Kolkata" },
  },
  {
    keys: ["pune"],
    place: { label: "Pune, Maharashtra", lat: 18.5204, lng: 73.8567, timezone: "Asia/Kolkata" },
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function localPlaceHints(query: string, limit = 6): ResolvedPlace[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const out: ResolvedPlace[] = [];
  const seen = new Set<string>();
  for (const row of HINTS) {
    if (out.length >= limit) break;
    const hit = row.keys.some((k) => k.startsWith(q) || q.startsWith(k) || k.includes(q));
    if (!hit) continue;
    const key = `${row.place.lat},${row.place.lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row.place);
  }
  return out;
}
