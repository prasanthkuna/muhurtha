/** Central icon sizing — match Flutter MuhIcons.tab / inline. */
export const ICON = {
  tab: 24,
  tabStroke: 1.75,
  tabStrokeActive: 2,
  inline: 20,
  settings: 22,
  hero: 28,
} as const;

export type IconSize = keyof typeof ICON;
