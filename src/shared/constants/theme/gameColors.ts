import type { FactionThemeName } from './index';

/**
 * Numeric mirrors of the CSS colour tokens in `src/app/styles/global.css`, for
 * the Phaser canvas, which cannot read CSS custom properties. The values are
 * the tokens themselves, never tuned separately: `gameColors.test.ts` fails as
 * soon as a token and its mirror drift apart.
 */
export const FACTION_ACCENT_COLORS: Readonly<Record<FactionThemeName, number>> = {
  undead: 0x8fd14f,
  orc: 0xec7048,
  human: 0x6b9df5,
  elf: 0xa98cf5,
};

/** `--color-success`, `--color-warning` and `--color-danger`. */
export const STATUS_COLORS = {
  success: 0x44aa44,
  warning: 0xffb15f,
  danger: 0xff7b6b,
} as const;
