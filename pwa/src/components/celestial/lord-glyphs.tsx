/** Vimshottari graha marks for Life chapter hero (48×48 editorial strokes). */

import type { CSSProperties } from "react";

export type GrahaKey =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu"
  | "unknown";

export function normalizeGraha(lord?: string | null): GrahaKey {
  if (!lord) return "unknown";
  const s = lord.trim().toLowerCase();
  if (s.includes("sun") || s.includes("surya")) return "Sun";
  if (s.includes("moon") || s.includes("chandra")) return "Moon";
  if (s.includes("mars") || s.includes("mangal") || s.includes("kuja")) return "Mars";
  if (s.includes("mercury") || s.includes("budh")) return "Mercury";
  if (s.includes("jupiter") || s.includes("guru")) return "Jupiter";
  if (s.includes("venus") || s.includes("shukra")) return "Venus";
  if (s.includes("saturn") || s.includes("shani")) return "Saturn";
  if (s.includes("rahu")) return "Rahu";
  if (s.includes("ketu")) return "Ketu";
  return "unknown";
}

type P = { className?: string; style?: CSSProperties };

export function GrahaGlyph({ graha, className, style }: { graha: GrahaKey; className?: string; style?: CSSProperties }) {
  const common: P & { viewBox: string; fill: string; xmlns: string; "aria-hidden": boolean } = {
    className,
    style,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (graha) {
    case "Sun":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2.2" />
          <path d="M24 8v4M24 36v4M8 24h4M36 24h4M13 13l3 3M32 32l3 3M35 13l-3 3M16 32l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "Moon":
      return (
        <svg {...common}>
          <path d="M28 10a14 14 0 1 0 0 28 10 10 0 0 1 0-28z" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "Mars":
      return (
        <svg {...common}>
          <circle cx="20" cy="28" r="10" stroke="currentColor" strokeWidth="2.2" />
          <path d="M28 20l10-10M32 8h6v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "Mercury":
      return (
        <svg {...common}>
          <circle cx="24" cy="20" r="8" stroke="currentColor" strokeWidth="2.2" />
          <path d="M24 28v12M18 36h12M16 12l4-4M32 12l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "Jupiter":
      return (
        <svg {...common}>
          <path d="M18 14h16v22a6 6 0 0 1-6 6H18V14z" stroke="currentColor" strokeWidth="2.2" />
          <path d="M18 22h16" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "Venus":
      return (
        <svg {...common}>
          <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="2.2" />
          <path d="M24 26v12M18 36h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "Saturn":
      return (
        <svg {...common}>
          <circle cx="22" cy="26" r="10" stroke="currentColor" strokeWidth="2.2" />
          <path d="M30 14c8 2 12 8 10 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "Rahu":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2.2" strokeDasharray="4 3" />
          <circle cx="34" cy="14" r="4" fill="currentColor" />
        </svg>
      );
    case "Ketu":
      return (
        <svg {...common}>
          <path d="M14 34c8-16 20-16 28 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="34" r="3" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 24h24M24 12v24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}
