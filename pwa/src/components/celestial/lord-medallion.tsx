import { cn } from "@/components/ui/cn";
import { GrahaGlyph, normalizeGraha, type GrahaKey } from "@/components/celestial/lord-glyphs";

export const GRAHA_THEME: Record<GrahaKey, { rim: string; glow: string; core: string; ink: string }> = {
  Sun: { rim: "#e09030", glow: "rgba(224,144,48,0.45)", core: "#fff8ed", ink: "#9a5a12" },
  Moon: { rim: "#7a9eb8", glow: "rgba(122,158,184,0.42)", core: "#f2f8fc", ink: "#3d5a72" },
  Mars: { rim: "#c45c4a", glow: "rgba(196,92,74,0.45)", core: "#fff5f2", ink: "#8b3a2f" },
  Mercury: { rim: "#6a8fc4", glow: "rgba(106,143,196,0.4)", core: "#f0f5fc", ink: "#3a5880" },
  Jupiter: { rim: "#d4a843", glow: "rgba(212,168,67,0.42)", core: "#fffaf0", ink: "#7a5a18" },
  Venus: { rim: "#c9a0a8", glow: "rgba(201,160,168,0.4)", core: "#fff6f7", ink: "#7a4a52" },
  Saturn: { rim: "#5a6470", glow: "rgba(90,100,112,0.4)", core: "#f2f4f6", ink: "#2e3640" },
  Rahu: { rim: "#8a7a62", glow: "rgba(138,122,98,0.38)", core: "#faf7f2", ink: "#4a4032" },
  Ketu: { rim: "#9a6bb8", glow: "rgba(154,107,184,0.42)", core: "#f8f2fc", ink: "#5a3870" },
  unknown: { rim: "#a67b35", glow: "rgba(166,123,53,0.4)", core: "#fffcf6", ink: "#77541f" },
};

const SIZE = { sm: 36, md: 56, lg: 96 } as const;

export function GrahaMedallion({
  lord,
  size = "md",
  shimmer = false,
  className,
}: {
  lord?: string | null;
  size?: keyof typeof SIZE;
  shimmer?: boolean;
  className?: string;
}) {
  const graha = normalizeGraha(lord);
  const theme = GRAHA_THEME[graha];
  const box = SIZE[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2",
        shimmer && "sign-medallion-shimmer",
        className,
      )}
      style={{
        width: box,
        height: box,
        borderColor: `${theme.rim}99`,
        background: `radial-gradient(circle at 32% 28%, ${theme.core} 0%, #fffcf6 45%, ${theme.core} 100%)`,
        boxShadow: size === "lg" ? `0 8px 28px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.85)` : `0 4px 12px ${theme.glow}`,
      }}
    >
      <GrahaGlyph
        graha={graha}
        className={cn("sign-medallion-glyph", size === "sm" ? "h-[50%] w-[50%]" : "h-[52%] w-[52%]")}
        style={{ color: theme.ink }}
      />
    </div>
  );
}
