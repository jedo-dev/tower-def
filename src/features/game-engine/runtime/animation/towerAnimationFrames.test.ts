import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { resolveTowerAnimationFrames, type TowerAnimationFrames } from './towerAnimationFrames';
import { createTowerAnimations, getTowerAnimationSet } from './gameSceneAnimationRuntime';
import { PLACEHOLDER_TEXTURE_KEYS } from '../assets/placeholderTexture';
import { PLACEHOLDER_TOWER_FRAME_COUNT } from '../../scenes/gameScene.constants';
import {
  TOWER_SHEET_CONTRACT_FRAMES,
  TOWER_SPRITE_KEYS,
} from '../../../../shared/constants/sprites';

/** Contract slots 8 and 14 hold nothing; every sheet cut by split-tower-pair.py leaves them transparent. */
const CONTRACT_EMPTY_SLOTS = [8, 14] as const;

/** Slots the shipped sheets leave transparent, read from the art itself. */
const EMPTY_SLOTS_BY_SHEET: Record<string, readonly number[]> = {
  ...Object.fromEntries(
    Object.values(TOWER_SPRITE_KEYS).map((spriteKey) => [spriteKey, CONTRACT_EMPTY_SLOTS]),
  ),
  [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER]: [8, 9, 14],
};

function allFrames(frames: TowerAnimationFrames): number[] {
  return [...frames.build, ...frames.idle, ...frames.attack, ...frames.hitReaction, ...frames.sell];
}

describe('resolveTowerAnimationFrames', () => {
  it('plays the hit reaction of a contract sheet from slot 9', () => {
    expect(resolveTowerAnimationFrames(TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER).hitReaction).toEqual([
      9,
    ]);
  });

  it('falls back to the first idle frame for a sheet without a hit-reaction pose', () => {
    const frames = resolveTowerAnimationFrames(TOWER_SPRITE_KEYS.ELF_MOON_ARCHER);
    expect(frames.hitReaction).toEqual([frames.idle[0]]);
  });

  it.each(Object.entries(EMPTY_SLOTS_BY_SHEET))(
    'never addresses an empty slot of %s',
    (spriteKey, emptySlots) => {
      const frames = allFrames(resolveTowerAnimationFrames(spriteKey));
      emptySlots.forEach((slot) => expect(frames).not.toContain(slot));
    },
  );

  it('keeps every registered sheet on the contract outside the hit reaction', () => {
    Object.values(TOWER_SPRITE_KEYS).forEach((spriteKey) => {
      const frames = resolveTowerAnimationFrames(spriteKey);
      expect(frames.build).toEqual(TOWER_SHEET_CONTRACT_FRAMES.build);
      expect(frames.idle).toEqual(TOWER_SHEET_CONTRACT_FRAMES.idle);
      expect(frames.attack).toEqual(TOWER_SHEET_CONTRACT_FRAMES.attack);
      expect(frames.sell).toEqual(TOWER_SHEET_CONTRACT_FRAMES.sell);
      expect(frames.hitReaction.length).toBeGreaterThan(0);
    });
  });

  it('maps the placeholder to the contract, inside the frames it draws', () => {
    const frames = resolveTowerAnimationFrames(PLACEHOLDER_TEXTURE_KEYS.TOWER);
    expect(frames.hitReaction).toEqual(TOWER_SHEET_CONTRACT_FRAMES.hitReaction);
    allFrames(frames).forEach((frame) => {
      expect(frame).toBeGreaterThanOrEqual(0);
      expect(frame).toBeLessThan(PLACEHOLDER_TOWER_FRAME_COUNT);
    });
  });

  it('maps an unregistered key to the contract', () => {
    expect(resolveTowerAnimationFrames('tower.unknown').hitReaction).toEqual([9]);
  });
});

describe('createTowerAnimations', () => {
  type CreatedAnimation = { key: string; frames: Array<{ key: string; frame: number }> };

  function createSceneStub() {
    const created = new Map<string, CreatedAnimation>();
    const scene = {
      anims: {
        exists: (key: string) => created.has(key),
        create: (config: CreatedAnimation) => {
          created.set(config.key, config);
        },
      },
    } as unknown as Phaser.Scene;
    return { scene, created };
  }

  it.each([
    [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER, [9]],
    [TOWER_SPRITE_KEYS.ORC_TAR_PIT, [9]],
    [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER, [3]],
    [PLACEHOLDER_TEXTURE_KEYS.TOWER, [9]],
  ])('builds the %s hit reaction from frames %j', (spriteKey, expectedFrames) => {
    const { scene, created } = createSceneStub();
    createTowerAnimations(scene);

    const animation = created.get(getTowerAnimationSet(spriteKey).hitReaction);
    expect(animation?.frames).toEqual(expectedFrames.map((frame) => ({ key: spriteKey, frame })));
  });
});
