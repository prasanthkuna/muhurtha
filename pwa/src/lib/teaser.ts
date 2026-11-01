"use client";

/** Birth-star teaser inputs kept on the device so onboarding can prefill them after sign-in. */
export const TEASER_KEY = "muh_teaser_v1";

export type TeaserResult = {
  nakshatra: string;
  nakshatra_label: string;
  nak_index: number;
  pada: number | null;
  rashi_key: string;
  rashi_label: string;
  dasha_lord: string | null;
  dasha_label: string | null;
  dasha_end_year: number | null;
  approximate: boolean;
  line: string;
};

export type SavedTeaser = { dob: string; timeBucket: string | null; nakshatra?: string; at: number };

export function saveTeaser(t: SavedTeaser) {
  try {
    localStorage.setItem(TEASER_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

export function readTeaser(): SavedTeaser | null {
  try {
    const raw = localStorage.getItem(TEASER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedTeaser;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dob ?? "")) return null;
    // Stale after 30 days.
    if (Date.now() - (v.at ?? 0) > 30 * 86400000) return null;
    return v;
  } catch {
    return null;
  }
}

export async function fetchTeaser(input: { dob: string; timeBucket: string | null; locale: string }): Promise<TeaserResult | null> {
  try {
    const r = await fetch("/api/public/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_of_birth: input.dob, time_bucket: input.timeBucket ?? undefined, locale: input.locale }),
    });
    if (!r.ok) return null;
    return (await r.json()) as TeaserResult;
  } catch {
    return null;
  }
}
