/**
 * Design token references for components that need theme values in TSX
 * (e.g. inline CSS custom properties). The actual values live as CSS custom
 * properties in `src/app/styles/global.css` (:root) — components must never
 * hardcode raw hex colors.
 */

export const THEME_COLOR_VARS = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
} as const;

export type FactionThemeName = 'undead' | 'orc' | 'human' | 'elf';

export const FACTION_THEME_COLOR_VARS: Record<FactionThemeName, string> = {
  undead: 'var(--color-faction-undead)',
  orc: 'var(--color-faction-orc)',
  human: 'var(--color-faction-human)',
  elf: 'var(--color-faction-elf)',
};
