import { GLYPHS, type GlyphName } from "@/lib/glyphs";

type Props = {
  name: GlyphName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
};

/** Themed line glyph (24-grid, currentColor). Decorative unless a title is given. */
export function Glyph({ name, size = 20, className, strokeWidth = 1.75, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path d={GLYPHS[name]} />
    </svg>
  );
}
