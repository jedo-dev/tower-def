import { describe, expect, it, vi } from 'vitest';
import {
  applyCreepFacing,
  getCreepDeathAnimationKey,
  isDirectionalCreepSprite,
  resolveCreepFacing,
} from './creepFacing';
import { UNIT_DIRECTIONAL_FRAME_COUNT, UNIT_SPRITE_KEYS } from '../../../../constants/sprites';
import type { CreepRenderState } from '../../scenes/gameScene.types';

function createSprite(frameCount: number, textureKey = UNIT_SPRITE_KEYS.ORC_GRUNT) {
  const played: string[] = [];
  const flips: boolean[] = [];

  return {
    played,
    flips,
    rotation: 0,
    texture: {
      key: textureKey,
      getFrameNames: () => Array.from({ length: frameCount }, (_, index) => String(index)),
    },
    play: vi.fn((key: string) => played.push(key)),
    setFlipX: vi.fn((value: boolean) => flips.push(value)),
  };
}

function createCreep(frameCount: number): CreepRenderState & ReturnType<typeof createSprite> {
  const sprite = createSprite(frameCount);
  const creep = {
    sprite,
    isDirectional: isDirectionalCreepSprite(sprite as never),
    facing: undefined,
    facingFlipped: undefined,
  } as unknown as CreepRenderState;

  return Object.assign(creep, sprite) as never;
}

describe('resolveCreepFacing', () => {
  it('reads mostly horizontal movement as the side row', () => {
    expect(resolveCreepFacing(10, 2)).toBe('side');
    expect(resolveCreepFacing(-10, 2)).toBe('side');
  });

  it('reads vertical movement as the down or up row', () => {
    expect(resolveCreepFacing(1, 10)).toBe('down');
    expect(resolveCreepFacing(1, -10)).toBe('up');
  });

  it('prefers the side row on a perfect diagonal, where the art reads best', () => {
    expect(resolveCreepFacing(5, 5)).toBe('side');
  });
});

describe('isDirectionalCreepSprite', () => {
  it('accepts a full four-row sheet', () => {
    expect(isDirectionalCreepSprite(createSprite(UNIT_DIRECTIONAL_FRAME_COUNT) as never)).toBe(true);
  });

  it('rejects a legacy four-frame strip', () => {
    expect(isDirectionalCreepSprite(createSprite(4) as never)).toBe(false);
  });
});

describe('applyCreepFacing', () => {
  it('plays the row that matches the heading', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT);

    applyCreepFacing(creep, 0, 8);
    expect(creep.played.at(-1)).toBe(`${UNIT_SPRITE_KEYS.ORC_GRUNT}.walk.down`);

    applyCreepFacing(creep, 0, -8);
    expect(creep.played.at(-1)).toBe(`${UNIT_SPRITE_KEYS.ORC_GRUNT}.walk.up`);

    applyCreepFacing(creep, 8, 0);
    expect(creep.played.at(-1)).toBe(`${UNIT_SPRITE_KEYS.ORC_GRUNT}.walk.side`);
  });

  it('mirrors the side row when walking left', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT);

    applyCreepFacing(creep, 8, 0);
    expect(creep.flips.at(-1)).toBe(false);

    applyCreepFacing(creep, -8, 0);
    expect(creep.flips.at(-1)).toBe(true);
    expect(creep.played.at(-1)).toBe(`${UNIT_SPRITE_KEYS.ORC_GRUNT}.walk.side`);
  });

  it('does not restart the walk while the heading holds', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT);

    applyCreepFacing(creep, 8, 1);
    applyCreepFacing(creep, 7, 1);
    applyCreepFacing(creep, 9, 0);

    expect(creep.played).toHaveLength(1);
  });

  it('never rotates a directional sprite', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT);

    applyCreepFacing(creep, 0, 8);

    expect(creep.sprite.rotation).toBe(0);
  });

  it('keeps rotating a legacy sheet, which has no rows to switch to', () => {
    const creep = createCreep(4);

    applyCreepFacing(creep, 0, 8);

    expect(creep.sprite.rotation).toBeCloseTo(Math.PI / 2, 5);
    expect(creep.played).toHaveLength(0);
  });
});

describe('getCreepDeathAnimationKey', () => {
  it('derives the death key from the sheet the creep uses', () => {
    expect(getCreepDeathAnimationKey(createSprite(16) as never))
      .toBe(`${UNIT_SPRITE_KEYS.ORC_GRUNT}.death`);
  });
});
