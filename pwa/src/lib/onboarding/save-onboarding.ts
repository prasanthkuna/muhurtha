import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/lib/locale";
import type { ResolvedPlace } from "@/lib/location/resolved-place";
import { resolveBirthInputMode } from "@/lib/onboarding/engine-resolution";

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
  birthPlace: ResolvedPlace;
  currentPlace: ResolvedPlace;
  languageCode: AppLocale;
  timeBucket: string | null;
  exactBirthTime: string | null;
  janmaNakshatra: string | null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const locationMeta = {
    detected: true,
    resolved: true,
    current_lat: input.currentPlace.lat,
    current_lng: input.currentPlace.lng,
    timezone: input.currentPlace.timezone,
  };

  const { error: profileErr } = await supabase.from("profiles").upsert(
    {
      id: profileId,
      user_id: user.id,
      display_name: input.displayName.trim(),
      current_city: input.currentPlace.label,
      current_lat: input.currentPlace.lat,
      current_lng: input.currentPlace.lng,
      current_timezone: input.currentPlace.timezone,
      language_code: input.languageCode,
      location_meta: locationMeta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileErr) throw profileErr;

  const exactDb = input.exactBirthTime ? formatExactTimeForDb(input.exactBirthTime) : null;
  const bucketForDb =
    input.exactBirthTime || !input.timeBucket || input.timeBucket === "exact"
      ? null
      : input.timeBucket;

  const birthPayload: Record<string, unknown> = {
    profile_id: profileId,
    date_of_birth: input.dateOfBirth,
    birth_place: input.birthPlace.label,
    birth_lat: input.birthPlace.lat,
    birth_lng: input.birthPlace.lng,
    birth_timezone: input.birthPlace.timezone,
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

  const { data: existingBirth } = await supabase
    .from("birth_inputs")
    .select("id")
    .eq("profile_id", profileId)
    .or("source.is.null,source.neq.chart_profile")
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

export async function saveProfileCurrentPlace(
  supabase: SupabaseClient,
  place: ResolvedPlace,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({
      current_city: place.label,
      current_lat: place.lat,
      current_lng: place.lng,
      current_timezone: place.timezone,
      location_meta: {
        detected: true,
        resolved: true,
        current_lat: place.lat,
        current_lng: place.lng,
        timezone: place.timezone,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (error) throw error;
}
