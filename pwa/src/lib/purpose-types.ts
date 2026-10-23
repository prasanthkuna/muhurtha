/** Must match `purposeRules` keys in muhurtha-api/engine.ts */
export const PURPOSE_OPTIONS = [
  { id: "career_interview", label: "Career interview" },
  { id: "business_launch", label: "Business launch" },
  { id: "money_talk", label: "Money talk" },
  { id: "property_vehicle", label: "Property / vehicle" },
  { id: "relationship_marriage_talk", label: "Relationship talk" },
  { id: "family_discussion", label: "Family discussion" },
  { id: "travel", label: "Travel" },
  { id: "study_exam", label: "Study / exam" },
  { id: "health_routine", label: "Health routine" },
  { id: "legal_dispute", label: "Legal matter" },
  { id: "spiritual_puja", label: "Spiritual / puja" },
  { id: "creative_public", label: "Creative / public" },
] as const;

/** Purposes shown for charts under 13 (also `purposeRules` keys in the engine). */
export const CHILD_PURPOSE_OPTIONS = [
  { id: "child_naming", label: "Naming ceremony" },
  { id: "child_first_food", label: "First food (annaprashana)" },
  { id: "child_first_haircut", label: "First haircut" },
  { id: "child_doctor_visit", label: "Vaccination / doctor visit" },
  { id: "travel", label: "Travel" },
  { id: "child_school_start", label: "School start" },
] as const;

export type PurposeType =
  | (typeof PURPOSE_OPTIONS)[number]["id"]
  | (typeof CHILD_PURPOSE_OPTIONS)[number]["id"];

const ALL_OPTIONS: readonly { id: PurposeType; label: string }[] = [
  ...PURPOSE_OPTIONS,
  ...CHILD_PURPOSE_OPTIONS,
];

/** Legacy query params from Today CTA */
export function purposeLabel(id: string): string {
  return ALL_OPTIONS.find((p) => p.id === id)?.label ?? id.replaceAll("_", " ");
}

export function normalizePurposeType(raw: string | null | undefined): PurposeType | "" {
  if (!raw) return "";
  const map: Record<string, PurposeType> = {
    career: "career_interview",
    money: "money_talk",
    relationship: "relationship_marriage_talk",
    family: "family_discussion",
  };
  if (raw in map) return map[raw]!;
  if (ALL_OPTIONS.some((p) => p.id === raw)) return raw as PurposeType;
  return "";
}
