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

export async function loadBirthProfileSummary(): Promise<BirthProfileSummary | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, current_city, current_timezone")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!profile?.id) return null;

  const { data: birth } = await supabase
    .from("birth_inputs")
    .select("date_of_birth, birth_place, time_bucket, exact_birth_time, janma_nakshatra")
    .eq("profile_id", profile.id)
    .neq("source", "chart_profile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dob = birth?.date_of_birth?.toString() ?? null;
  const exact = birth?.exact_birth_time?.toString() ?? null;
  const bucket = birth?.time_bucket?.toString() ?? null;

  return {
    profileId: profile.id,
    displayName: profile.display_name ?? null,
    dateOfBirth: dob ? dob.slice(0, 10) : null,
    birthPlace: birth?.birth_place?.toString() ?? null,
    timeLabel: timeBucketLabel(bucket, exact),
    janmaNakshatra: birth?.janma_nakshatra?.toString() ?? null,
    currentCity: profile.current_city ?? null,
    timezone: profile.current_timezone ?? null,
  };
}
