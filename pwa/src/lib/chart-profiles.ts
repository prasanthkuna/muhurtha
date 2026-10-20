export type ChartProfileSummary = {
  id: string;
  label: string;
  birthInputId?: string;
  dateOfBirth?: string;
  birthPlace?: string;
  nakshatra?: string;
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
