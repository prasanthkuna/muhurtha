"use client";

import { useState } from "react";
import { Glyph } from "@/components/ui/glyph";
import { ShareSheet } from "@/components/share/share-sheet";
import { useLocale } from "@/context/locale-context";
import type { CardData, CardType } from "@/lib/share/card-types";
import { cn } from "@/components/ui/cn";

/** Small "Share" pill that opens the card share sheet. `build` runs at tap time. */
export function ShareCardButton({
  type,
  build,
  className,
  label,
  variant = "pill",
}: {
  type: CardType;
  build: () => CardData | null;
  className?: string;
  label?: string;
  variant?: "pill" | "icon";
}) {
  const { t } = useLocale();
  const [data, setData] = useState<CardData | null>(null);
  const open = () => {
    const d = build();
    if (d) setData(d);
  };
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={label ?? t("shareCard.share")}
        data-testid={`share-${type}`}
        className={cn(
          variant === "icon"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-gold-text active:bg-gold-wash/50"
            : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gold-accent/30 bg-paper px-3 text-xs font-semibold text-gold-text active:bg-gold-wash/50",
          className,
        )}
      >
        <Glyph name="share" size={variant === "icon" ? 18 : 15} />
        {variant === "icon" ? null : <span>{label ?? t("shareCard.share")}</span>}
      </button>
      {data ? <ShareSheet open onClose={() => setData(null)} type={type} data={data} /> : null}
    </>
  );
}
