import type Phaser from 'phaser';
import { PLACEHOLDER_TEXTURE_KEYS } from '../assets/placeholderTexture';
import {
  PLACEHOLDER_ANIMATION_KEYS,
  TOWER_SPRITE_KEYS,
  UNIT_DIRECTIONAL_FRAME_COUNT,
  UNIT_SHEET_FRAMES_PER_ROW,
  UNIT_SHEET_ROWS,
  UNIT_SPRITE_KEYS,
  UnitAnimationKind,
  isTowerSpriteKey,
  toTowerAnimationSet,
  toUnitAnimationKey,
  type TowerAnimationSet,
} from '../../../../shared/constants/sprites';
import { resolveTowerAnimationFrames } from './towerAnimationFrames';

export type { TowerAnimationSet };

const UNIT_WALK_FRAME_RATE = 8;
const UNIT_DEATH_FRAME_RATE = 7;

/** Row of the sheet each animation reads, in the frame order Phaser assigns. */
const DIRECTIONAL_ANIMATIONS: ReadonlyArray<{
  kind: UnitAnimationKind;
  row: number;
  loops: boolean;
}> = [
  { kind: UnitAnimationKind.WALK_DOWN, row: UNIT_SHEET_ROWS.WALK_DOWN, loops: true },
  { kind: UnitAnimationKind.WALK_SIDE, row: UNIT_SHEET_ROWS.WALK_SIDE, loops: true },
  { kind: UnitAnimationKind.WALK_UP, row: UNIT_SHEET_ROWS.WALK_UP, loops: true },
  { kind: UnitAnimationKind.DEATH, row: UNIT_SHEET_ROWS.DEATH, loops: false },
];

function countSheetFrames(scene: Phaser.Scene, spriteKey: string): number {
  if (!scene.textures.exists(spriteKey)) {
    return 0;
  }

  // getFrameNames lists the numbered frames only, without Phaser's __BASE entry.
  return scene.textures.get(spriteKey).getFrameNames().length;
}

/** A creep sheet is directional when it carries all four rows of the 128x128 contract. */
export function hasDirectionalUnitSheet(scene: Phaser.Scene, spriteKey: string): boolean {
  return countSheetFrames(scene, spriteKey) >= UNIT_DIRECTIONAL_FRAME_COUNT;
}

const PLACEHOLDER_TOWER_ANIMATION_SET = {
  build: PLACEHOLDER_ANIMATION_KEYS.TOWER_BUILD,
  idle: PLACEHOLDER_ANIMATION_KEYS.TOWER_IDLE,
  attack: PLACEHOLDER_ANIMATION_KEYS.TOWER_ATTACK,
  hitReaction: PLACEHOLDER_ANIMATION_KEYS.TOWER_HIT_REACTION,
  sell: PLACEHOLDER_ANIMATION_KEYS.TOWER_SELL,
} as const;

function createRowAnimation(
  scene: Phaser.Scene,
  spriteKey: string,
  kind: UnitAnimationKind,
  row: number,
  loops: boolean,
): void {
  const animationKey = toUnitAnimationKey(spriteKey, kind);

  if (scene.anims.exists(animationKey)) {
    return;
  }

  const start = row * UNIT_SHEET_FRAMES_PER_ROW;

  scene.anims.create({
    key: animationKey,
    frames: scene.anims.generateFrameNumbers(spriteKey, {
      start,
      end: start + UNIT_SHEET_FRAMES_PER_ROW - 1,
    }),
    frameRate: loops ? UNIT_WALK_FRAME_RATE : UNIT_DEATH_FRAME_RATE,
    repeat: loops ? -1 : 0,
  });
}

/**
 * Builds the animations a creep sheet can support: a 16-frame sheet gets three
 * walk directions plus a death row, a legacy 4-frame strip gets the side walk
 * only, which is what the movement runtime falls back to.
 */
export function createUnitWalkAnimations(scene: Phaser.Scene): void {
  const spriteKeys: string[] = [...Object.values(UNIT_SPRITE_KEYS), PLACEHOLDER_TEXTURE_KEYS.UNIT];

  spriteKeys.forEach((spriteKey) => {
    if (!scene.textures.exists(spriteKey)) {
      return;
    }

    if (hasDirectionalUnitSheet(scene, spriteKey)) {
      DIRECTIONAL_ANIMATIONS.forEach(({ kind, row, loops }) => {
        createRowAnimation(scene, spriteKey, kind, row, loops);
      });
      return;
    }

    createRowAnimation(scene, spriteKey, UnitAnimationKind.WALK_SIDE, 0, true);
  });
}

function createTowerAnimation(
  scene: Phaser.Scene,
  spriteKey: string,
  key: string,
  frameIndexes: readonly number[],
  frameRate: number,
  repeat: number,
): void {
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: frameIndexes.map((frame) => ({
      key: spriteKey,
      frame,
    })),
    frameRate,
    repeat,
  });
}

export function createTowerAnimations(scene: Phaser.Scene): void {
  [...Object.values(TOWER_SPRITE_KEYS), PLACEHOLDER_TEXTURE_KEYS.TOWER].forEach((spriteKey) => {
    const animationSet = getTowerAnimationSet(spriteKey);
    const frames = resolveTowerAnimationFrames(spriteKey);
    createTowerAnimation(scene, spriteKey, animationSet.build, frames.build, 10, 0);
    createTowerAnimation(scene, spriteKey, animationSet.idle, frames.idle, 8, -1);
    createTowerAnimation(scene, spriteKey, animationSet.attack, frames.attack, 14, 0);
    createTowerAnimation(scene, spriteKey, animationSet.hitReaction, frames.hitReaction, 10, 0);
    createTowerAnimation(scene, spriteKey, animationSet.sell, frames.sell, 10, 0);
  });
}

export function getTowerAnimationSet(spriteKey: string): TowerAnimationSet {
  if (spriteKey === PLACEHOLDER_TEXTURE_KEYS.TOWER) {
    return PLACEHOLDER_TOWER_ANIMATION_SET;
  }

  return toTowerAnimationSet(
    isTowerSpriteKey(spriteKey) ? spriteKey : TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER,
  );
}

/** The animation a creep starts on: the side walk, which every sheet provides. */
export function getWalkAnimationKeyBySpriteKey(spriteKey: string): string {
  return toUnitAnimationKey(spriteKey, UnitAnimationKind.WALK_SIDE);
}
