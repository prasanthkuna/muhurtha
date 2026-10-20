import type { CSSProperties } from "react";
import type { RashiKey } from "@/design-system/rashi";

/** Custom sidereal zodiac marks (48×48) — replaces unicode at md+ sizes. */
export function RashiGlyph({
  signKey,
  className,
  style,
}: {
  signKey: RashiKey;
  className?: string;
  style?: CSSProperties;
}) {
  const common = {
    className,
    style,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  switch (signKey) {
    case "mesha":
      return (
        <svg {...common}>
          <path
            d="M10 32c6-14 14-18 22-12 4 3 6 8 6 14M14 28c2-6 8-10 14-8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="34" cy="14" r="3" fill="currentColor" />
        </svg>
      );
    case "vrishabha":
      return (
        <svg {...common}>
          <circle cx="24" cy="26" r="12" stroke="currentColor" strokeWidth="2.2" />
          <path d="M14 14c-2 4-2 8 0 12M34 14c2 4 2 8 0 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "mithuna":
      return (
        <svg {...common}>
          <path d="M16 10v28M32 10v28M16 10h16M16 38h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 14h8M28 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "karka":
      return (
        <svg {...common}>
          <path
            d="M30 12c-8 0-14 6-14 14s6 14 14 14c4 0 8-2 10-5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M32 16l6-4M32 16l-2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "simha":
      return (
        <svg {...common}>
          <circle cx="22" cy="22" r="10" stroke="currentColor" strokeWidth="2.2" />
          <path d="M32 32c6 2 10 8 8 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="19" cy="20" r="1.5" fill="currentColor" />
          <circle cx="25" cy="20" r="1.5" fill="currentColor" />
        </svg>
      );
    case "kanya":
      return (
        <svg {...common}>
          <path
            d="M18 10v20c0 6 4 10 10 10M18 10h14M18 24h10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "tula":
      return (
        <svg {...common}>
          <path d="M12 30h24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 30V18c0-4 3-8 8-8s8 4 8 8v12" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "vrishchika":
      return (
        <svg {...common}>
          <path d="M28 10l-8 16 8 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 26h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M32 38l4 4M32 38l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "dhanu":
      return (
        <svg {...common}>
          <path d="M14 34l14-20 6 6-14 20z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M10 38h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "makara":
      return (
        <svg {...common}>
          <path
            d="M14 34c0-12 8-20 18-18 6 1 10 6 10 12 0 8-6 12-14 10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "kumbha":
      return (
        <svg {...common}>
          <path d="M14 18c4-6 16-6 20 0v14H14V18z" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 32h24M18 32v6M30 32v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "meena":
      return (
        <svg {...common}>
          <path d="M12 20c6-8 18-8 24 0-6 8-18 8-24 0z" stroke="currentColor" strokeWidth="2.2" />
          <path d="M18 28v10M30 28v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
  }
}
