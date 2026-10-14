import {
  UNIT_DIRECTIONAL_FRAME_COUNT,
  UnitAnimationKind,
  toUnitAnimationKey,
} from '../../../../shared/constants/sprites';
import type { CreepRenderState } from '../../scenes/gameScene.types';

/**
 * Which row of a directional creep sheet is playing. Movement to the left uses
 * the same row as movement to the right, mirrored, so the sheet needs three
 * walk rows instead of four.
 */
export type CreepFacing = 'down' | 'side' | 'up';

const ANIMATION_BY_FACING: Record<CreepFacing, UnitAnimationKind> = {
  down: UnitAnimationKind.WALK_DOWN,
  side: UnitAnimationKind.WALK_SIDE,
  up: UnitAnimationKind.WALK_UP,
};

export function resolveCreepFacing(deltaX: number, deltaY: number): CreepFacing {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return 'side';
  }

  return deltaY > 0 ? 'down' : 'up';
}

/** True for sheets that carry all four rows; legacy strips keep the old behaviour. */
export function isDirectionalCreepSprite(sprite: Phaser.GameObjects.Sprite): boolean {
  const frames = sprite.texture?.getFrameNames?.();

  return Array.isArray(frames) && frames.length >= UNIT_DIRECTIONAL_FRAME_COUNT;
}

export function getCreepDeathAnimationKey(sprite: Phaser.GameObjects.Sprite): string {
  return toUnitAnimationKey(sprite.texture.key, UnitAnimationKind.DEATH);
}

/**
 * Points the creep the way it is walking. A directional sheet switches rows and
 * mirrors for the left side; a legacy one-row sheet is rotated toward its
 * heading, which is what the game did before directional art existed.
 */
export function applyCreepFacing(creep: CreepRenderState, deltaX: number, deltaY: number): void {
  if (!creep.isDirectional) {
    creep.sprite.rotation = Math.atan2(deltaY, deltaX);
    return;
  }

  const facing = resolveCreepFacing(deltaX, deltaY);
  const isFlipped = facing === 'side' && deltaX < 0;

  // Switching rows every frame would restart the walk cycle on every step.
  if (creep.facing === facing && creep.facingFlipped === isFlipped) {
    return;
  }

  creep.facing = facing;
  creep.facingFlipped = isFlipped;
  creep.sprite.setFlipX(isFlipped);
  creep.sprite.play(
    toUnitAnimationKey(creep.sprite.texture.key, ANIMATION_BY_FACING[facing]),
    true,
  );
}
