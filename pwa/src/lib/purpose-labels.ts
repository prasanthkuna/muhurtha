import type { AppLocale } from "@/lib/locale";
import { isChildStage, type LifeStage } from "@/lib/life-stage";
import { t as translate } from "@/lib/messages";
import {
  CHILD_PURPOSE_OPTIONS,
  PURPOSE_OPTIONS,
  purposeLabel,
  type PurposeType,
} from "@/lib/purpose-types";

export function localizedPurposeLabel(locale: AppLocale, id: string): string {
  const key = `purpose.${id}`;
  const label = translate(locale, key);
  if (label !== key) return label;
  return purposeLabel(id);
}

/** Adult purposes, or the child milestone set when the active chart is under 13. */
export function localizedPurposeOptions(
  locale: AppLocale,
  stage: LifeStage = "adult",
): { id: PurposeType; label: string }[] {
  const options = isChildStage(stage) ? CHILD_PURPOSE_OPTIONS : PURPOSE_OPTIONS;
  return options.map((p) => ({
    id: p.id,
    label: localizedPurposeLabel(locale, p.id),
  }));
}
