"use client";

import { useEffect, useRef } from "react";
import type { ExplainerEntry } from "@/lib/jyotish-explainers";
import { useLocale } from "@/context/locale-context";

type Props = {
  open: boolean;
  onClose: () => void;
  entry: ExplainerEntry | null;
};

export function WhySheet({ open, onClose, entry }: Props) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !entry) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("explainer.close")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="why-sheet-title"
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <h2 id="why-sheet-title" className="font-serif text-xl font-semibold text-gold-text">
          {entry.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{entry.level0}</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{entry.level1}</p>
        {entry.notAssessed ? (
          <p className="mt-3 text-xs text-ink-tertiary">{entry.notAssessed}</p>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gold-accent py-3 text-sm font-semibold text-paper"
        >
          {t("explainer.gotIt")}
        </button>
      </div>
    </div>
  );
}

export function WhyLink({
  label,
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-gold-text underline-offset-2 hover:underline"
    >
      {label ?? t("explainer.whyThis")}
    </button>
  );
}
