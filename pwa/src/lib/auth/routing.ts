import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirrors Flutter `ProfileRepository.initialSignedInRoute`. */
export async function resolveInitialAppPath(
  supabase: SupabaseClient,
  fallbackNext = "/today",
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/welcome";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.id) return "/onboarding";

  const { data: birth } = await supabase
    .from("birth_inputs")
    .select("id")
    .eq("profile_id", profile.id)
    .or("source.is.null,source.neq.chart_profile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!birth?.id) return "/onboarding";

  const next =
    fallbackNext.startsWith("/") &&
    !fallbackNext.startsWith("/auth") &&
    !fallbackNext.startsWith("/welcome")
      ? fallbackNext
      : "/today";
  return next;
}
