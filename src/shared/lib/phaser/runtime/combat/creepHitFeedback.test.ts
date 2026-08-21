import { describe, expect, it, vi } from 'vitest';
import { CreepTypeId } from '../../../../types/content-ids';
import type { CreepRenderState } from '../../scenes/gameScene.types';

// The combat runtime pulls in Phaser only for colour maths; a stub keeps this
// suite in the node environment (Phaser needs a real canvas to initialise).
vi.mock('phaser', () => ({
  default: {
    Display: {
      Color: {
        ValueToColor: (value: number) => ({
          r: (value >> 16) & 0xff,
          g: (value >> 8) & 0xff,
          b: value & 0xff,
        }),
        Interpolate: {
          ColorWithColor: (
            from: { r: number; g: number; b: number },
            to: { r: number; g: number; b: number },
            length: number,
            index: number,
          ) => ({
            r: Math.round(from.r + ((to.r - from.r) * index) / length),
            g: Math.round(from.g + ((to.g - from.g) * index) / length),
            b: Math.round(from.b + ((to.b - from.b) * index) / length),
          }),
        },
        GetColor: (r: number, g: number, b: number) => (r << 16) | (g << 8) | b,
      },
    },
  },
}));

const { updateCreepHitFeedback } = await import('./gameSceneCombatRuntime');
type CombatConfig = Parameters<typeof updateCreepHitFeedback>[1];

const ORC_TINT = 0x8fce6a;
const FLASH_MS = 120;
const CONFIG = {
  creepBaseColor: 0xffffff,
  creepHitFlashColor: 0xff5555,
  creepHitFlashDurationMs: FLASH_MS,
} as CombatConfig;

function createCreep(baseTint?: number): CreepRenderState & { tints: number[] } {
  const tints: number[] = [];
  return {
    entity: {
      id: 'creep:1',
      type: CreepTypeId.BASIC,
      hp: 10,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { x: 0, y: 0 },
      pathIndex: 0,
    },
    sprite: {
      setTint: (value: number) => {
        tints.push(value);
      },
    } as unknown as CreepRenderState['sprite'],
    hitFlashRemainingMs: FLASH_MS,
    deathFadeRemainingMs: 0,
    baseTint,
    tints,
  };
}

describe('updateCreepHitFeedback', () => {
  it('restores the faction tint when the hit flash ends', () => {
    const creep = createCreep(ORC_TINT);

    updateCreepHitFeedback([creep], CONFIG, FLASH_MS);

    expect(creep.hitFlashRemainingMs).toBe(0);
    expect(creep.tints.at(-1)).toBe(ORC_TINT);
  });

  it('falls back to the base creep color for untinted creeps', () => {
    const creep = createCreep();

    updateCreepHitFeedback([creep], CONFIG, FLASH_MS);

    expect(creep.tints.at(-1)).toBe(CONFIG.creepBaseColor);
  });

  it('interpolates from the faction tint mid-flash rather than from white', () => {
    const tinted = createCreep(ORC_TINT);
    const plain = createCreep();

    updateCreepHitFeedback([tinted], CONFIG, FLASH_MS / 2);
    updateCreepHitFeedback([plain], CONFIG, FLASH_MS / 2);

    expect(tinted.hitFlashRemainingMs).toBeGreaterThan(0);
    expect(tinted.tints.at(-1)).not.toBe(plain.tints.at(-1));
  });
});
