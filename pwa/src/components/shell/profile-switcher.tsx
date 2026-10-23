"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "@/components/celestial/muh-icon";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { initialOf } from "@/lib/chart-profiles";

/** Compact "whose chart" chip: You + saved partner/friend charts + Add someone. */
export function ProfileSwitcher() {
  const { t } = useLocale();
  const { chartProfiles, activeChartProfileId, activeChartLabel, setActiveChartProfile } =
    useAppData();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const viewingOther = Boolean(activeChartProfileId);
  const label = viewingOther ? activeChartLabel || "…" : t("common.you");

  const pick = (id: string | null, name?: string) => {
    setOpen(false);
    if ((id ?? null) === (activeChartProfileId ?? null)) return;
    void setActiveChartProfile(id, name ?? null);
  };

  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-gold-wash/40";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t("chart.switcherLabel")}: ${label}`}
        data-testid="profile-switcher"
        className={cn(
          "flex min-h-10 max-w-[11rem] items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-sm font-medium transition-colors",
          viewingOther
            ? "border-gold-accent/60 bg-gold-wash text-ink"
            : "border-line bg-paper text-ink-secondary hover:border-gold-accent/40",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            viewingOther ? "bg-gold-accent text-paper" : "bg-gold-wash text-gold-text",
          )}
          aria-hidden
        >
          {viewingOther ? initialOf(activeChartLabel) : initialOf(t("common.you"))}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-[90] mt-2 w-64 rounded-2xl border border-line bg-canvas p-1.5 shadow-xl"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
            {t("chart.switcherLabel")}
          </p>
          <button type="button" role="menuitemradio" aria-checked={!viewingOther} className={item} onClick={() => pick(null)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-wash text-xs font-semibold text-gold-text" aria-hidden>
              {initialOf(t("common.you"))}
            </span>
            <span className="flex-1 font-medium text-ink">{t("common.you")}</span>
            {!viewingOther ? <Check className="h-4 w-4 text-gold-text" aria-hidden /> : null}
          </button>
          {chartProfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={activeChartProfileId === p.id}
              className={item}
              onClick={() => pick(p.id, p.label)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-wash text-xs font-semibold text-gold-text" aria-hidden>
                {initialOf(p.label)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.label}</span>
              {activeChartProfileId === p.id ? <Check className="h-4 w-4 text-gold-text" aria-hidden /> : null}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <Link href="/settings#add-chart" role="menuitem" className={cn(item, "text-gold-text")} onClick={() => setOpen(false)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gold-accent/50" aria-hidden>
              <Plus className="h-4 w-4" />
            </span>
            <span className="font-medium">{t("chart.addSomeone")}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
