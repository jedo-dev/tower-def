import { describe, expect, it } from 'vitest';
import { applyEffectToCreep, getActiveEffects, tickCreepEffects } from './effects';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';
import { EFFECT_BALANCE, resolveEffectDefinition } from '../../../shared/constants/effects';
import { EFFECT_IDS, EffectId } from '../../../shared/types/content-ids';

/**
 * The effect engine drives gameplay every frame on mid-tier phones, so two
 * properties are non-negotiable: the same inputs must produce the same state,
 * and a creep under fire must not accumulate unbounded work.
 */

/** Ticking 400 creeps for a second of frames must stay well inside a frame budget. */
const HOT_PATH_BUDGET_MS = 250;
const HOT_PATH_CREEP_COUNT = 400;
const HOT_PATH_FRAME_COUNT = 60;
const FRAME_MS = 16;

function createCreep(id: string): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id,
    type: 'basic',
    hp: 1_000,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
  };
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

type SimulationResult = {
  damage: number;
  state: string;
};

function simulate(seed: number, frames: number): SimulationResult {
  const random = seededRandom(seed);
  let creep = createCreep('creep:sim');
  let damage = 0;

  for (let frame = 0; frame < frames; frame += 1) {
    if (random() < 0.3) {
      const effectId = EFFECT_IDS[Math.floor(random() * EFFECT_IDS.length)];
      creep = applyEffectToCreep(creep, { effectId });
    }

    const deltaMs = 8 + Math.floor(random() * 24);
    const result = tickCreepEffects(creep, deltaMs);
    creep = result.creep;
    damage += result.damage;
  }

  return { damage, state: JSON.stringify(getActiveEffects(creep)) };
}

describe('effect engine determinism', () => {
  it('produces identical state for the same seed and delta sequence', () => {
    const first = simulate(20_260_821, 300);
    const second = simulate(20_260_821, 300);

    expect(second).toEqual(first);
    expect(first.damage).toBeGreaterThan(0);
  });

  it('produces different state for a different seed', () => {
    expect(simulate(1, 300)).not.toEqual(simulate(2, 300));
  });

  it('deals identical total damage no matter how the frames are paced', () => {
    const damageFor = (frameMs: number): number => {
      let creep = applyEffectToCreep(createCreep('creep:pacing'), { effectId: EffectId.POISON });
      let damage = 0;

      for (let elapsed = 0; elapsed < 4_000; elapsed += frameMs) {
        const result = tickCreepEffects(creep, frameMs);
        creep = result.creep;
        damage += result.damage;
      }

      return damage;
    };

    expect(damageFor(8)).toBe(damageFor(16));
    expect(damageFor(16)).toBe(damageFor(33));
  });
});

describe('effect list growth', () => {
  it('never grows past one entry per declared effect', () => {
    let creep = createCreep('creep:spam');

    for (let application = 0; application < 500; application += 1) {
      for (const effectId of EFFECT_IDS) {
        creep = applyEffectToCreep(creep, { effectId });
      }
    }

    expect(getActiveEffects(creep).length).toBeLessThanOrEqual(
      EFFECT_BALANCE.maxDistinctEffectsPerCreep,
    );
  });

  it('caps stacks at the value each effect declares', () => {
    let creep = createCreep('creep:stacks');

    for (let application = 0; application < 200; application += 1) {
      for (const effectId of EFFECT_IDS) {
        creep = applyEffectToCreep(creep, { effectId });
      }
    }

    for (const effect of getActiveEffects(creep)) {
      expect(effect.stacks, effect.id).toBeLessThanOrEqual(
        resolveEffectDefinition(effect.id).maxStacks,
      );
    }
  });

  it('drops every effect once the timers run out', () => {
    let creep = createCreep('creep:expiry');

    for (const effectId of EFFECT_IDS) {
      creep = applyEffectToCreep(creep, { effectId });
    }

    const longestDurationMs = Math.max(
      ...EFFECT_IDS.map((effectId) => resolveEffectDefinition(effectId).durationMs),
    );

    for (let elapsed = 0; elapsed <= longestDurationMs; elapsed += FRAME_MS) {
      creep = tickCreepEffects(creep, FRAME_MS).creep;
    }

    expect(getActiveEffects(creep)).toHaveLength(0);
  });
});

describe('effect hot path budget', () => {
  it(`ticks ${HOT_PATH_CREEP_COUNT} affected creeps for ${HOT_PATH_FRAME_COUNT} frames under ${HOT_PATH_BUDGET_MS}ms`, () => {
    let creeps = Array.from({ length: HOT_PATH_CREEP_COUNT }, (_, index) => {
      let creep = createCreep(`creep:${index}`);
      creep = applyEffectToCreep(creep, { effectId: EffectId.POISON });
      creep = applyEffectToCreep(creep, { effectId: EffectId.CHILL });
      creep = applyEffectToCreep(creep, { effectId: EffectId.ARMOR_BREAK });
      return creep;
    });

    const startedAtMs = performance.now();

    for (let frame = 0; frame < HOT_PATH_FRAME_COUNT; frame += 1) {
      creeps = creeps.map((creep) => tickCreepEffects(creep, FRAME_MS).creep);
    }

    const elapsedMs = performance.now() - startedAtMs;

    expect(elapsedMs).toBeLessThan(HOT_PATH_BUDGET_MS);
  });

  it('costs nothing for creeps that carry no effects', () => {
    const creep = createCreep('creep:idle');

    for (let frame = 0; frame < HOT_PATH_FRAME_COUNT; frame += 1) {
      expect(tickCreepEffects(creep, FRAME_MS).creep).toBe(creep);
    }
  });
});
