/** Mirrors app/lib/core/engine/engine_resolution.dart */

export function resolveBirthInputMode(input: {
  exactBirthTime?: string | null;
  timeBucket?: string | null;
  janmaNakshatra?: string | null;
}): string {
  const hasExact = !!input.exactBirthTime?.trim();
  const bucket = input.timeBucket?.trim();
  const hasBucket = !!bucket && bucket !== "unknown";
  const hasNak = !!input.janmaNakshatra?.trim();

  if (hasExact) return "exact_time";
  if (hasBucket && hasNak) return "time_bucket_plus_nakshatra";
  if (hasBucket) return "time_bucket";
  if (hasNak) return "nakshatra_only";
  return "unknown";
}
