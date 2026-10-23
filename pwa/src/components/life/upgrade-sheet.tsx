"use client";

import { useEffect } from "react";
import { usePaywall } from "@/context/paywall-context";

/** Locked Life chapter -> the shared Pro paywall (checkout lives right in the PWA now). */
export function UpgradeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  chapterLabel?: string;
}) {
  const { openPaywall } = usePaywall();
  useEffect(() => {
    if (!open) return;
    openPaywall("chapter");
    onClose();
  }, [open, onClose, openPaywall]);
  return null;
}
