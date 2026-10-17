/**
 * Size of one frame of a creep sprite sheet. Kept apart from `sprites.ts`
 * (which imports the sheet images) so headless code such as the duel
 * simulation can size creeps without loading image modules.
 */
export const UNIT_SPRITE_SHEET_FRAME = {
  width: 32,
  height: 32,
} as const;
