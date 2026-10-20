"use client";

import { cn } from "@/components/ui/cn";
import { RashiGlyph } from "@/components/celestial/rashi-glyphs";
import { normalizeRashiKey, RASHI_SYMBOL, RASHI_THEME, type RashiKey } from "@/design-system/rashi";

const SIZE_MAP = {
  sm: { box: 52, symbol: "text-2xl" },
  md: { box: 72, symbol: "text-4xl" },
  lg: { box: 96, symbol: "text-5xl" },
  xl: { box: 120, symbol: "text-6xl" },
} as const;

export type SignMedallionSize = keyof typeof SIZE_MAP;

export function SignMedallion({
  signKey,
  symbol,
  size = "lg",
  scintillate = true,
  className,
  label,
}: {
  signKey?: string | null;
  symbol?: string;
  size?: SignMedallionSize;
  scintillate?: boolean;
  className?: string;
  label?: string;
}) {
  const key = normalizeRashiKey(signKey ?? symbol) ?? ("karka" as RashiKey);
  const theme = RASHI_THEME[key];
  const glyph = symbol && symbol.length <= 2 ? symbol : RASHI_SYMBOL[key];
  const dim = SIZE_MAP[size];
  const useSvgGlyph = size !== "sm";

  return (
    <div
      className={cn("relative inline-flex flex-col items-center gap-2", className)}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div
        className={cn(
          "sign-medallion relative flex items-center justify-center rounded-full border-2",
          scintillate && "sign-medallion-shimmer",
        )}
        style={{
          width: dim.box,
          height: dim.box,
          borderColor: `${theme.rim}99`,
          background: `radial-gradient(circle at 32% 28%, ${theme.core} 0%, #fffcf6 45%, ${theme.core} 100%)`,
          boxShadow: `0 8px 28px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.85)`,
        }}
      >
        {useSvgGlyph ? (
          <RashiGlyph
            signKey={key}
            className={cn("sign-medallion-glyph h-[58%] w-[58%]")}
            style={{ color: theme.symbol }}
          />
        ) : (
          <span
            className={cn("sign-medallion-glyph leading-none font-bold select-none", dim.symbol)}
            style={{ color: theme.symbol }}
          >
            {glyph}
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-40"
          style={{
            background: `conic-gradient(from 210deg, transparent, ${theme.rim}33, transparent)`,
          }}
        />
      </div>
      {label ? (
        <span className="max-w-[9rem] text-center text-xs font-semibold text-gold-text">{label}</span>
      ) : null}
    </div>
  );
}
