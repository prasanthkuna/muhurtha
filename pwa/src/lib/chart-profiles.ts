import { formatDisplayDate } from "./format-date";
import { formatWindowClock } from "./format-time";
import type { AppLocale } from "./locale";

export type ChartProfileSummary = {
  id: string;
  label: string;
  birthInputId?: string;
  dateOfBirth?: string;
  birthPlace?: string;
  nakshatra?: string;
  exactBirthTime?: string;
  timeBucket?: string;
};

export function parseChartProfileList(json: Record<string, unknown>): ChartProfileSummary[] {
  const rows = json.profiles;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((row) => {
      const birth = row.birth_inputs;
      const birthMap =
        birth && typeof birth === "object" ? (birth as Record<string, unknown>) : null;
      return {
        id: row.id?.toString() ?? "",
        label: row.label?.toString() ?? "",
        birthInputId: row.birth_input_id?.toString(),
        dateOfBirth: birthMap?.date_of_birth?.toString()?.slice(0, 10),
        birthPlace: birthMap?.birth_place?.toString(),
        nakshatra: birthMap?.janma_nakshatra?.toString(),
        exactBirthTime: birthMap?.exact_birth_time?.toString() || undefined,
        timeBucket: birthMap?.time_bucket?.toString() || undefined,
      };
    })
    .filter((p) => p.id && p.label);
}

export const TIME_BUCKETS = [
  { value: "early_morning", key: "bucket.earlyMorning" },
  { value: "morning", key: "bucket.morning" },
  { value: "afternoon", key: "bucket.afternoon" },
  { value: "evening", key: "bucket.evening" },
  { value: "night", key: "bucket.night" },
  { value: "late_night", key: "bucket.lateNight" },
  { value: "unknown", key: "bucket.unknown" },
] as const;

/** "20 May 2025 · 11:46 PM · Hyderabad" (time bucket label when no exact time). */
export function chartBirthLine(
  p: Pick<ChartProfileSummary, "dateOfBirth" | "exactBirthTime" | "timeBucket" | "birthPlace">,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (p.dateOfBirth) parts.push(formatDisplayDate(p.dateOfBirth, locale, { weekday: false }));
  if (p.exactBirthTime) {
    parts.push(formatWindowClock(p.exactBirthTime.slice(0, 5)));
  } else if (p.timeBucket) {
    const bucket = TIME_BUCKETS.find((b) => b.value === p.timeBucket);
    if (bucket) parts.push(t(bucket.key));
  }
  if (p.birthPlace) parts.push(p.birthPlace.split(",")[0]!.trim());
  return parts.join(" · ");
}

export function initialOf(label: string | null | undefined): string {
  const ch = (label ?? "").trim().charAt(0);
  return ch ? ch.toLocaleUpperCase() : "?";
}
