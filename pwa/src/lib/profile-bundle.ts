import { createClient } from "@/lib/supabase/client";

export type BirthProfileSummary = {
  profileId: string;
  displayName: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  timeLabel: string | null;
  janmaNakshatra: string | null;
  currentCity: string | null;
  timezone: string | null;
  currentLat: number | null;
  currentLng: number | null;
};

function timeBucketLabel(bucket: string | null, exact: string | null): string | null {
  if (exact) return exact.slice(0, 5);
  if (!bucket) return null;
  const map: Record<string, string> = {
    early_morning: "Early morning",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night",
    late_night: "Late night",
    unknown: "Time unknown",
  };
  return map[bucket] ?? bucket.replaceAll("_", " ");
}

export type BirthProfileResult =
  | { status: "ok"; summary: BirthProfileSummary }
  | { status: "no_profile" }
  | { status: "signed_out" }
  | { status: "error"; message: string };

/**
 * Settings birth details. Previously every failure (expired session, network, RLS) was
 * swallowed and rendered as "—" in every row, indistinguishable from "still loading".
 * Now the caller gets an explicit status.
 */
export async function loadBirthProfileResult(): Promise<BirthProfileResult> {
  const supabase = createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { status: "signed_out" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, current_city, current_timezone, current_lat, current_lng")
    .eq("user_id", uid)
    .maybeSingle();
  if (profileError) return { status: "error", message: profileError.message };
  if (!profile?.id) return { status: "no_profile" };

  // `source` is nullable: neq() alone would also drop rows where source IS NULL.
  const { data: birth, error: birthError } = await supabase
    .from("birth_inputs")
    .select("date_of_birth, birth_place, time_bucket, exact_birth_time, janma_nakshatra")
    .eq("profile_id", profile.id)
    .or("source.is.null,source.neq.chart_profile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (birthError) return { status: "error", message: birthError.message };

  const dob = birth?.date_of_birth?.toString() ?? null;
  const exact = birth?.exact_birth_time?.toString() ?? null;
  const bucket = birth?.time_bucket?.toString() ?? null;

  return { status: "ok", summary: {
    profileId: profile.id,
    displayName: profile.display_name ?? null,
    dateOfBirth: dob ? dob.slice(0, 10) : null,
    birthPlace: birth?.birth_place?.toString().trim() || null,
    timeLabel: timeBucketLabel(bucket, exact),
    janmaNakshatra: birth?.janma_nakshatra?.toString() ?? null,
    currentCity: profile.current_city ?? null,
    timezone: profile.current_timezone ?? null,
    currentLat: profile.current_lat != null ? Number(profile.current_lat) : null,
    currentLng: profile.current_lng != null ? Number(profile.current_lng) : null,
  } };
}

export async function loadBirthProfileSummary(): Promise<BirthProfileSummary | null> {
  const r = await loadBirthProfileResult();
  return r.status === "ok" ? r.summary : null;
}
