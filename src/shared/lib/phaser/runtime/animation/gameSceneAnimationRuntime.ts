import type Phaser from 'phaser';
import {
  TOWER_ANIMATION_SETS,
  TOWER_BONE_ARCHER_ANIMATION_FRAMES,
  TOWER_SPRITE_KEYS,
  UNIT_ANIMATION_KEYS,
  UNIT_SPRITE_KEYS,
} from '../../../../constants/sprites';

export type TowerAnimationSet = (typeof TOWER_ANIMATION_SETS)[keyof typeof TOWER_ANIMATION_SETS];

const UNIT_WALK_ANIMATIONS: ReadonlyArray<{ animationKey: string; spriteKey: string }> = [
  { animationKey: UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK, spriteKey: UNIT_SPRITE_KEYS.UNDEAD_SKELETON },
  { animationKey: UNIT_ANIMATION_KEYS.UNDEAD_GHOUL_WALK, spriteKey: UNIT_SPRITE_KEYS.UNDEAD_GHOUL },
  { animationKey: UNIT_ANIMATION_KEYS.UNDEAD_CRYPT_FIEND_WALK, spriteKey: UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND },
  { animationKey: UNIT_ANIMATION_KEYS.UNDEAD_GARGOYLE_WALK, spriteKey: UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE },
];

export function createUnitWalkAnimations(scene: Phaser.Scene): void {
  UNIT_WALK_ANIMATIONS.forEach(({ animationKey, spriteKey }) => {
    if (scene.anims.exists(animationKey)) {
      return;
    }

    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(spriteKey, {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: -1,
    });
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
  Object.values(TOWER_SPRITE_KEYS).forEach((spriteKey) => {
    const animationSet = getTowerAnimationSet(spriteKey);
    createTowerAnimation(scene, spriteKey, animationSet.build, TOWER_BONE_ARCHER_ANIMATION_FRAMES.build, 10, 0);
    createTowerAnimation(scene, spriteKey, animationSet.idle, TOWER_BONE_ARCHER_ANIMATION_FRAMES.idle, 8, -1);
    createTowerAnimation(scene, spriteKey, animationSet.attack, TOWER_BONE_ARCHER_ANIMATION_FRAMES.attack, 14, 0);
    createTowerAnimation(
      scene,
      spriteKey,
      animationSet.hitReaction,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.hitReaction,
      10,
      0,
    );
    createTowerAnimation(scene, spriteKey, animationSet.sell, TOWER_BONE_ARCHER_ANIMATION_FRAMES.sell, 10, 0);
  });
}

export function getTowerAnimationSet(spriteKey: string): TowerAnimationSet {
  return (
    TOWER_ANIMATION_SETS[spriteKey as keyof typeof TOWER_ANIMATION_SETS] ??
    TOWER_ANIMATION_SETS[TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]
  );
}

export function getWalkAnimationKeyBySpriteKey(spriteKey: string): string {
  switch (spriteKey) {
    case UNIT_SPRITE_KEYS.UNDEAD_SKELETON:
      return UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK;
    case UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND:
      return UNIT_ANIMATION_KEYS.UNDEAD_CRYPT_FIEND_WALK;
    case UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE:
      return UNIT_ANIMATION_KEYS.UNDEAD_GARGOYLE_WALK;
    default:
      return UNIT_ANIMATION_KEYS.UNDEAD_GHOUL_WALK;
  }
}
