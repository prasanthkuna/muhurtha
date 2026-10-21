import type { AppLocale } from "@/lib/locale";
import { t as translate } from "@/lib/messages";
import { PURPOSE_OPTIONS, type PurposeType } from "@/lib/purpose-types";

export function localizedPurposeLabel(locale: AppLocale, id: string): string {
  const key = `purpose.${id}`;
  const label = translate(locale, key);
  if (label !== key) return label;
  return PURPOSE_OPTIONS.find((p) => p.id === id)?.label ?? id.replaceAll("_", " ");
}

export function localizedPurposeOptions(locale: AppLocale): { id: PurposeType; label: string }[] {
  return PURPOSE_OPTIONS.map((p) => ({
    id: p.id,
    label: localizedPurposeLabel(locale, p.id),
  }));
}
