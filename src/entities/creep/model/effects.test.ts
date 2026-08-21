import { describe, expect, it } from 'vitest';
import {
  applyEffectToCreep,
  findActiveEffect,
  getActiveEffects,
  getEffectiveSpeedMultiplier,
  removeEffectFromCreep,
  tickCreepEffects,
} from './effects';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';
import { EFFECT_BALANCE, resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectId } from '../../../shared/types/content-ids';

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: 'creep:test',
    type: 'basic',
    hp: 500,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...overrides,
  };
}

const POISON = resolveEffectDefinition(EffectId.POISON);
const CHILL = resolveEffectDefinition(EffectId.CHILL);
const BURN = resolveEffectDefinition(EffectId.BURN);

describe('applyEffectToCreep', () => {
  it('adds an effect to a creep that has none', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
    const effect = findActiveEffect(creep, EffectId.POISON);

    expect(effect).toEqual({
      id: EffectId.POISON,
      magnitude: POISON.magnitude,
      remainingMs: POISON.durationMs,
      stacks: 1,
      nextTickInMs: POISON.tickIntervalMs,
    });
  });

  it('never mutates the creep it is given', () => {
    const original = createCreep();
    const affected = applyEffectToCreep(original, { effectId: EffectId.CHILL });

    expect(getActiveEffects(original)).toHaveLength(0);
    expect(getActiveEffects(affected)).toHaveLength(1);
    expect(affected).not.toBe(original);
  });

  it('lets a tower override magnitude and duration', () => {
    const creep = applyEffectToCreep(createCreep(), {
      effectId: EffectId.CHILL,
      magnitude: 0.5,
      durationMs: 3_000,
    });

    expect(findActiveEffect(creep, EffectId.CHILL)).toMatchObject({
      magnitude: 0.5,
      remainingMs: 3_000,
    });
  });

  it('stacks poison up to its cap and refreshes the timer', () => {
    let creep = createCreep();

    for (let application = 0; application < POISON.maxStacks + 3; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.POISON });
      creep = tickCreepEffects(creep, 100).creep;
    }

    const effect = findActiveEffect(creep, EffectId.POISON);

    expect(effect?.stacks).toBe(POISON.maxStacks);
    expect(effect?.remainingMs).toBe(POISON.durationMs - 100);
  });

  it('refreshes a burn instead of stacking it', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.BURN });
    creep = tickCreepEffects(creep, 800).creep;
    creep = applyEffectToCreep(creep, { effectId: EffectId.BURN });

    const effect = findActiveEffect(creep, EffectId.BURN);

    expect(effect?.stacks).toBe(1);
    expect(effect?.remainingMs).toBe(BURN.durationMs);
  });

  it('keeps the stronger chill and drops a weaker application', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.CHILL, magnitude: 0.5 });
    creep = tickCreepEffects(creep, 500).creep;

    const beforeWeakHit = findActiveEffect(creep, EffectId.CHILL);
    creep = applyEffectToCreep(creep, { effectId: EffectId.CHILL, magnitude: 0.2 });

    expect(findActiveEffect(creep, EffectId.CHILL)).toEqual(beforeWeakHit);

    creep = applyEffectToCreep(creep, { effectId: EffectId.CHILL, magnitude: 0.6 });

    expect(findActiveEffect(creep, EffectId.CHILL)).toMatchObject({
      magnitude: 0.6,
      remainingMs: CHILL.durationMs,
    });
  });

  it('removes an effect on request and leaves the creep alone when it is absent', () => {
    const chilled = applyEffectToCreep(createCreep(), { effectId: EffectId.CHILL });

    expect(getActiveEffects(removeEffectFromCreep(chilled, EffectId.CHILL))).toHaveLength(0);
    expect(removeEffectFromCreep(chilled, EffectId.POISON)).toBe(chilled);
  });
});

describe('tickCreepEffects', () => {
  it('returns the same creep when there is nothing to tick', () => {
    const creep = createCreep();
    const result = tickCreepEffects(creep, 16);

    expect(result.creep).toBe(creep);
    expect(result.damage).toBe(0);
    expect(result.expired).toHaveLength(0);
  });

  it('reports damage without touching hit points', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
    const result = tickCreepEffects(creep, POISON.tickIntervalMs);

    expect(result.damage).toBe(POISON.magnitude);
    expect(result.creep.hp).toBe(creep.hp);
  });

  it('does not tick before the interval elapses', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });

    expect(tickCreepEffects(creep, POISON.tickIntervalMs - 1).damage).toBe(0);
  });

  it('scales damage with the number of stacks', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
    creep = applyEffectToCreep(creep, { effectId: EffectId.POISON });

    expect(tickCreepEffects(creep, POISON.tickIntervalMs).damage).toBe(POISON.magnitude * 2);
  });

  it('deals the same total damage regardless of frame pacing', () => {
    const totalDamageFor = (frameMs: number): number => {
      let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
      let damage = 0;

      for (let elapsed = 0; elapsed < POISON.durationMs; elapsed += frameMs) {
        const result = tickCreepEffects(creep, frameMs);
        damage += result.damage;
        creep = result.creep;
      }

      return damage;
    };

    const expectedTicks = POISON.durationMs / POISON.tickIntervalMs;

    expect(totalDamageFor(POISON.tickIntervalMs)).toBe(POISON.magnitude * expectedTicks);
    expect(totalDamageFor(100)).toBe(POISON.magnitude * expectedTicks);
    expect(totalDamageFor(16)).toBe(POISON.magnitude * expectedTicks);
  });

  it('expires exactly at the end of the duration', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.CHILL });
    const justBefore = tickCreepEffects(creep, CHILL.durationMs - 1);

    expect(justBefore.expired).toHaveLength(0);
    expect(getActiveEffects(justBefore.creep)).toHaveLength(1);

    const atBoundary = tickCreepEffects(justBefore.creep, 1);

    expect(atBoundary.expired).toEqual([EffectId.CHILL]);
    expect(getActiveEffects(atBoundary.creep)).toHaveLength(0);
  });

  it('stops ticking an effect once it has run out mid frame', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
    creep = tickCreepEffects(creep, POISON.durationMs - POISON.tickIntervalMs).creep;

    const result = tickCreepEffects(creep, POISON.durationMs);

    expect(result.damage).toBe(POISON.magnitude);
    expect(result.expired).toEqual([EffectId.POISON]);
  });

  it('ticks several effects in one pass', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });
    creep = applyEffectToCreep(creep, { effectId: EffectId.BURN });

    const result = tickCreepEffects(creep, 500);

    expect(result.damage).toBe(POISON.magnitude + BURN.magnitude);
    expect(getActiveEffects(result.creep)).toHaveLength(2);
  });
});

describe('getEffectiveSpeedMultiplier', () => {
  it('leaves an unaffected creep at full speed', () => {
    expect(getEffectiveSpeedMultiplier(createCreep())).toBe(1);
  });

  it('slows a chilled creep by the effect magnitude', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.CHILL });

    expect(getEffectiveSpeedMultiplier(creep)).toBeCloseTo(1 - CHILL.magnitude, 5);
  });

  it('ignores effects that do not touch movement', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.POISON });

    expect(getEffectiveSpeedMultiplier(creep)).toBe(1);
  });

  it('stops a stunned creep', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.STUN });

    expect(getEffectiveSpeedMultiplier(creep)).toBe(0);
  });

  it('never slows below the balance floor', () => {
    const creep = applyEffectToCreep(createCreep(), { effectId: EffectId.CHILL, magnitude: 0.95 });

    expect(getEffectiveSpeedMultiplier(creep)).toBe(EFFECT_BALANCE.minimumSpeedMultiplier);
  });
});
