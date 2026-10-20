# PWA celestial design system

Central place for **zodiac medallions**, **orbit motifs**, **graha chapter glyphs**, and **tab icons** in the PWA. Mirrors Flutter `celestial_components.dart` + `vedic_labels.ts` on the backend.

## Import path

```tsx
import {
  SignMedallion,
  RashiGlyph,
  GrahaMedallion,
  ChapterHeroCard,
  CelestialHeaderCard,
  RASHI_SYMBOL,
  normalizeRashiKey,
  ICON,
} from "@/design-system/celestial";
```

Do **not** paste raw ♈–♓ unicode or one-off SVGs in feature pages — use this module so Decode, Today, Life, and Settings stay consistent.

Utility chrome (settings gear, back chevrons) uses Lucide via `@/components/celestial/muh-icon`.

## Components

| Component | Use |
|-----------|-----|
| `SignMedallion` | Scintillating rashi glyph. `sm` = unicode; `md`/`lg`/`xl` = custom `RashiGlyph` SVG. |
| `RashiGlyph` | 12 sidereal sign marks (48×48 stroke art). |
| `GrahaMedallion` | Vimshottari lord medallion (`sm` · `md` · `lg`) for Life spine + hero. |
| `GrahaGlyph` / `normalizeGraha()` | Nine graha stroke icons + name parsing. |
| `ChapterHeroCard` | Life index “current” + chapter detail hero (orbit + graha medallion). |
| `CelestialHeaderCard` | Hero row: medallion + label + title + subline + optional explainer. |
| `OrbitBackdrop` | Faint gold rings inside cards (decorative only). |
| `nav-icons.tsx` | Bottom tab icons — 24px custom strokes. |
| `muh-icon.tsx` | Lucide re-exports for settings, navigation, settings rows. |

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
| Life index | `ChapterHeroCard` for current chapter; spine rows with `GrahaMedallion` sm |
| Life chapter | `ChapterHeroCard` + prose; Lucide back link |
| Timing / Ask | Tab icons + screen-specific cards |
| Settings | Lucide `Settings` in app shell header |
