# PWA celestial design system

Central place for **zodiac medallions**, **orbit motifs**, and **tab icons** in the PWA. Mirrors Flutter `celestial_components.dart` + `vedic_labels.ts` on the backend.

## Import path

```tsx
import {
  SignMedallion,
  CelestialHeaderCard,
  RASHI_SYMBOL,
  normalizeRashiKey,
  ICON,
} from "@/design-system/celestial";
```

Do **not** paste raw ♈–♓ unicode or one-off SVGs in feature pages — use this module so Decode, Today, Life, and Settings stay consistent.

## Components

| Component | Use |
|-----------|-----|
| `SignMedallion` | Large scintillating moon/rashi glyph. Sizes: `sm` · `md` · `lg` · `xl`. |
| `CelestialHeaderCard` | Hero row: medallion + label + title + subline + optional explainer. |
| `OrbitBackdrop` | Faint gold rings inside cards (decorative only). |
| `nav-icons.tsx` | Bottom tab + settings gear — 24px Material-style strokes. |

## Rashi tokens

- Keys: `mesha` … `meena` (sidereal), same as engine `moon_sign_key`.
- `RASHI_THEME` — per-sign rim, glow, core, symbol colors for medallion gradients.
- `normalizeRashiKey()` — accepts key or unicode symbol.

## Motion

- `.sign-medallion-shimmer` / `.sign-medallion-glyph` in `globals.css`.
- Disabled automatically when user prefers reduced motion.

## Screen map

| Screen | Pattern |
|--------|---------|
| Decode | `CelestialHeaderCard` + compact `LuckyStrip` with medallion |
| Today | `CelestialHeaderCard` when natal moon present |
| Life / Timing / Ask | Tab icons only (for now); chapter glyphs later |
| Settings | Gear icon from `NavIconSettings` |

## Future (optional)

- Custom SVG rashi logos (replace unicode at `xl` only).
- `@/design-system/celestial/icons` for inline domain/chapter glyphs.
- Shared `CelestialHeaderCard` on Life chapter detail from `journey_phases`.
