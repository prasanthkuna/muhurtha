import type { CSSProperties } from "react";
import { cn } from "@/components/ui/cn";
import { RASHI_SYMBOL, type RashiKey } from "@/design-system/rashi";

/** Renders canonical zodiac Unicode (♈–♓) — same as engine + Flutter medallions. */
export function RashiGlyph({
  signKey,
  className,
  style,
}: {
  signKey: RashiKey;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("sign-medallion-glyph leading-none font-bold select-none", className)}
      style={style}
      aria-hidden
    >
      {RASHI_SYMBOL[signKey]}
    </span>
  );
}
