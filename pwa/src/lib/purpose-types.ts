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

export type PurposeType = (typeof PURPOSE_OPTIONS)[number]["id"];

/** Legacy query params from Today CTA */
export function normalizePurposeType(raw: string | null | undefined): PurposeType | "" {
  if (!raw) return "";
  const map: Record<string, PurposeType> = {
    career: "career_interview",
    money: "money_talk",
    relationship: "relationship_marriage_talk",
    family: "family_discussion",
  };
  if (raw in map) return map[raw]!;
  if (PURPOSE_OPTIONS.some((p) => p.id === raw)) return raw as PurposeType;
  return "";
}
