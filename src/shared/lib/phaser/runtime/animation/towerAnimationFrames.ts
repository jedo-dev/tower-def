import {
  TOWER_SHEET_CONTRACT_FRAMES,
  TOWER_SHEET_FRAME_LAYOUTS,
  type TowerSheetFrameLayout,
} from '../../../../constants/sprites';

/** Frames every tower animation plays; every list is non-empty and drawn. */
export type TowerAnimationFrames = {
  build: readonly number[];
  idle: readonly number[];
  attack: readonly number[];
  hitReaction: readonly number[];
  sell: readonly number[];
};

/**
 * Resolves the frames a sheet's animations play. A sheet without a
 * hit-reaction pose reuses its first idle frame, so the reaction never flashes
 * an empty slot. The placeholder and any unregistered key follow the contract,
 * which the placeholder draws in every slot.
 */
export function resolveTowerAnimationFrames(spriteKey: string): TowerAnimationFrames {
  const layout: TowerSheetFrameLayout =
    TOWER_SHEET_FRAME_LAYOUTS[spriteKey as keyof typeof TOWER_SHEET_FRAME_LAYOUTS] ??
    TOWER_SHEET_CONTRACT_FRAMES;

  return {
    build: layout.build,
    idle: layout.idle,
    attack: layout.attack,
    hitReaction: layout.hitReaction ?? layout.idle.slice(0, 1),
    sell: layout.sell,
  };
}
