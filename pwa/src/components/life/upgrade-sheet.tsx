"use client";

import { WhySheet } from "@/components/explainer/why-sheet";
import { useLocale } from "@/context/locale-context";

/** Explains what Pro unlocks and where to get it (purchases live in the Android app). */
export function UpgradeSheet({
  open,
  onClose,
  chapterLabel,
}: {
  open: boolean;
  onClose: () => void;
  chapterLabel?: string;
}) {
  const { t } = useLocale();
  return (
    <WhySheet
      open={open}
      onClose={onClose}
      entry={{
        title: t("ui.upgradeTitle"),
        level0: chapterLabel ? `${chapterLabel} — ${t("ui.upgradeBody")}` : t("ui.upgradeBody"),
        level1: t("ui.upgradeHow"),
      }}
    />
  );
}
