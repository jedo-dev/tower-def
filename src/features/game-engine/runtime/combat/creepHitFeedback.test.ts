import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../entities/creep';
import { CreepTypeId } from '../../../../shared/types/content-ids';
import type { CreepRenderState } from '../../scenes/gameScene.types';

// Sibling combat modules import Phaser (which needs a real canvas to
// initialise); the hit flash itself no longer touches Phaser's colour helpers.
vi.mock('phaser', () => ({ default: { Display: { Color: {} } } }));

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
      ...DEFAULT_CREEP_COMBAT_TRAITS,
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

  it('truncates mid-flash channels exactly like Phaser instead of rounding', () => {
    const creep = createCreep(ORC_TINT);

    updateCreepHitFeedback([creep], CONFIG, FLASH_MS / 2);

    // Halfway from 0x8fce6a to 0xff5555: green 145.5 and blue 95.5 truncate.
    expect(creep.tints.at(-1)).toBe(0xc7915f);
  });
});
