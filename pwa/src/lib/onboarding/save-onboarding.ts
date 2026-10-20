import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/lib/locale";
import { resolveBirthInputMode } from "@/lib/onboarding/engine-resolution";

type ResolvedPlace = { lat: number; lng: number; timezone: string };

export async function ensureSignedInProfile(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

export type OnboardingFormInput = {
  displayName: string;
  dateOfBirth: string;
  birthPlace: string;
  currentCity: string;
  languageCode: AppLocale;
  timeBucket: string | null;
  exactBirthTime: string | null;
  janmaNakshatra: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  currentTimezone?: string | null;
  locationDetected?: boolean;
};

function formatExactTimeForDb(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
}

export async function saveOnboardingDraft(
  supabase: SupabaseClient,
  input: OnboardingFormInput,
): Promise<{ profileId: string; birthInputId: string }> {
  const profileId = await ensureSignedInProfile(supabase);

  const city = input.currentCity.trim();
  const resolvedCityViaEdge = city ? await resolvePlaceViaSupabase(supabase, city) : null;

  const useDetected =
    input.locationDetected && input.currentLat != null && input.currentLng != null;
  const currentLat = useDetected ? input.currentLat : resolvedCityViaEdge?.lat;
  const currentLng = useDetected ? input.currentLng : resolvedCityViaEdge?.lng;
  const currentTimezone = useDetected ? input.currentTimezone : resolvedCityViaEdge?.timezone;

  const locationMeta: Record<string, unknown> = {
    detected: useDetected,
    resolved: currentLat != null && currentLng != null,
  };
  if (currentLat != null) locationMeta.current_lat = currentLat;
  if (currentLng != null) locationMeta.current_lng = currentLng;
  if (currentTimezone) locationMeta.timezone = currentTimezone;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error: profileErr } = await supabase.from("profiles").upsert(
    {
      id: profileId,
      user_id: user.id,
      display_name: input.displayName.trim(),
      current_city: city || null,
      current_lat: currentLat ?? null,
      current_lng: currentLng ?? null,
      current_timezone: currentTimezone ?? null,
      language_code: input.languageCode,
      location_meta: locationMeta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileErr) throw profileErr;

  const resolvedBirth = await resolvePlaceViaSupabase(supabase, input.birthPlace.trim());
  const exactDb = input.exactBirthTime ? formatExactTimeForDb(input.exactBirthTime) : null;
  const bucketForDb =
    input.exactBirthTime || !input.timeBucket || input.timeBucket === "exact"
      ? null
      : input.timeBucket;

  const birthPayload: Record<string, unknown> = {
    profile_id: profileId,
    date_of_birth: input.dateOfBirth,
    birth_place: input.birthPlace.trim(),
    birth_input_mode: resolveBirthInputMode({
      exactBirthTime: exactDb,
      timeBucket: bucketForDb,
      janmaNakshatra: input.janmaNakshatra,
    }),
    exact_birth_time: exactDb,
    time_bucket: bucketForDb,
    janma_nakshatra: input.janmaNakshatra?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (resolvedBirth) {
    birthPayload.birth_lat = resolvedBirth.lat;
    birthPayload.birth_lng = resolvedBirth.lng;
    birthPayload.birth_timezone = resolvedBirth.timezone;
  }

  const { data: existingBirth } = await supabase
    .from("birth_inputs")
    .select("id")
    .eq("profile_id", profileId)
    .neq("source", "chart_profile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let birthInputId: string;
  if (existingBirth?.id) {
    birthInputId = existingBirth.id as string;
    const { error } = await supabase.from("birth_inputs").update(birthPayload).eq("id", birthInputId);
    if (error) throw error;
  } else {
    const { data: row, error } = await supabase
      .from("birth_inputs")
      .insert(birthPayload)
      .select("id")
      .single();
    if (error) throw error;
    birthInputId = row.id as string;
  }

  return { profileId, birthInputId };
}

async function resolvePlaceViaSupabase(
  supabase: SupabaseClient,
  place: string,
): Promise<ResolvedPlace | null> {
  const trimmed = place.trim();
  if (!trimmed) return null;
  try {
    const { data, error } = await supabase.functions.invoke("muhurtha-api", {
      body: { action: "birth_place_resolve", place: trimmed },
    });
    if (error || !data || typeof data !== "object") return null;
    const map = data as Record<string, unknown>;
    const lat = Number(map.lat);
    const lng = Number(map.lng);
    const timezone = map.timezone?.toString();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timezone) return null;
    return { lat, lng, timezone };
  } catch {
    return null;
  }
}

export async function initializeChartAfterOnboarding(
  birthInputId: string,
  locale: AppLocale,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chart_initialize",
        birth_input_id: birthInputId,
        locale,
      }),
    });
    if (res.ok) return;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
    else {
      const json = (await res.json()) as Record<string, unknown>;
      throw new Error(json.error?.toString() ?? "Could not start your reading");
    }
  }
}
