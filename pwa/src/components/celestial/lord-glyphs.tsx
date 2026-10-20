import type { CSSProperties } from "react";
import { cn } from "@/components/ui/cn";
import { GRAHA_SYMBOL, type GrahaKey } from "@/design-system/graha";

export { normalizeGraha, type GrahaKey } from "@/design-system/graha";

/** Canonical graha Unicode inside medallions (☉ ☽ ♂ … ☊ ☋). */
export function GrahaGlyph({
  graha,
  className,
  style,
}: {
  graha: GrahaKey;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("sign-medallion-glyph leading-none font-bold select-none", className)}
      style={style}
      aria-hidden
    >
      {GRAHA_SYMBOL[graha]}
    </span>
  );
}
