import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import { CreepTypeId } from '../../../../types/content-ids';
import { UNIT_DIRECTIONAL_FRAME_COUNT, UNIT_SPRITE_KEYS } from '../../../../constants/sprites';
import type { CreepRenderState } from '../../scenes/gameScene.types';

vi.mock('phaser', () => ({ default: { Display: { Color: {} } } }));

const { removeDeadCreepsFromActiveWave } = await import('./gameSceneCombatRuntime');

const FADE_MS = 180;
const DEATH_MS = 620;

function createCreep(
  frameCount: number,
  isDead: boolean,
): CreepRenderState & {
  played: string[];
  alphas: number[];
  destroyed: boolean;
} {
  const played: string[] = [];
  const alphas: number[] = [];
  const state = {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'creep:1',
      type: CreepTypeId.BASIC,
      hp: isDead ? 0 : 50,
      lifeState: isDead ? 'dead' : 'alive',
      speed: 1,
      status: isDead ? 'dead' : 'alive',
      position: { x: 0, y: 0 },
      pathIndex: 0,
    },
    sprite: {
      texture: {
        key: UNIT_SPRITE_KEYS.ORC_GRUNT,
        getFrameNames: () => Array.from({ length: frameCount }, (_, index) => String(index)),
      },
      play: vi.fn((key: string) => played.push(key)),
      setAlpha: vi.fn((value: number) => alphas.push(value)),
      destroy: vi.fn(() => {
        state.destroyed = true;
      }),
    },
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    isDirectional: frameCount >= UNIT_DIRECTIONAL_FRAME_COUNT,
    played,
    alphas,
    destroyed: false,
  } as unknown as CreepRenderState & { played: string[]; alphas: number[]; destroyed: boolean };

  return state;
}

describe('creep death', () => {
  it('plays the death row once for a sheet that has one', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT, true);

    let creeps = removeDeadCreepsFromActiveWave([creep], 16, FADE_MS, DEATH_MS);
    creeps = removeDeadCreepsFromActiveWave(creeps, 16, FADE_MS, DEATH_MS);

    expect(creep.played).toEqual([`${UNIT_SPRITE_KEYS.ORC_GRUNT}.death`]);
    expect(creep.alphas).toEqual([]);
    expect(creeps).toHaveLength(1);
  });

  it('destroys the sprite only after the death row has played out', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT, true);
    let creeps: CreepRenderState[] = [creep];

    const ticksBeforeTheEnd = Math.floor(DEATH_MS / 16);

    for (let tick = 0; tick < ticksBeforeTheEnd; tick += 1) {
      creeps = removeDeadCreepsFromActiveWave(creeps, 16, FADE_MS, DEATH_MS);
    }

    expect(creep.destroyed).toBe(false);

    creeps = removeDeadCreepsFromActiveWave(creeps, 16, FADE_MS, DEATH_MS);

    expect(creep.destroyed).toBe(true);
    expect(creeps).toHaveLength(0);
  });

  it('keeps fading a legacy sheet, which has no death row', () => {
    const creep = createCreep(4, true);
    let creeps: CreepRenderState[] = [creep];

    for (let elapsed = 0; elapsed <= FADE_MS; elapsed += 60) {
      creeps = removeDeadCreepsFromActiveWave(creeps, 60, FADE_MS, DEATH_MS);
    }

    expect(creep.played).toEqual([]);
    expect(creep.alphas.length).toBeGreaterThan(0);
    expect(creep.destroyed).toBe(true);
  });

  it('leaves living creeps alone', () => {
    const creep = createCreep(UNIT_DIRECTIONAL_FRAME_COUNT, false);

    const creeps = removeDeadCreepsFromActiveWave([creep], 16, FADE_MS, DEATH_MS);

    expect(creeps).toHaveLength(1);
    expect(creep.played).toEqual([]);
    expect(creep.destroyed).toBe(false);
  });
});
