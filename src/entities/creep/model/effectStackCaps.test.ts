import { describe, expect, it } from 'vitest';
import { applyEffectToCreep, findActiveEffect } from './effects';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectId } from '../../../shared/types/content-ids';

function createCreep(): CreepEntity {
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
  };
}

const POISON = resolveEffectDefinition(EffectId.POISON);

describe('tower-specific stack caps', () => {
  it('lets a tower raise the cap above the balance default', () => {
    let creep = createCreep();

    for (let application = 0; application < 10; application += 1) {
      creep = applyEffectToCreep(creep, {
        effectId: EffectId.POISON,
        maxStacks: POISON.maxStacks + 2,
      });
    }

    expect(findActiveEffect(creep, EffectId.POISON)?.stacks).toBe(POISON.maxStacks + 2);
  });

  it.each([EffectId.POISON, EffectId.BURN, EffectId.ARMOR_BREAK])(
    'honours an authored %s cap below the balance default',
    (effectId) => {
      for (const authoredCap of [1, 2]) {
        let creep = createCreep();

        for (let application = 0; application < 10; application += 1) {
          creep = applyEffectToCreep(creep, { effectId, maxStacks: authoredCap });
        }

        const effect = findActiveEffect(creep, effectId);
        expect(resolveEffectDefinition(effectId).maxStacks).toBeGreaterThan(authoredCap);
        expect(effect?.maxStacks).toBe(authoredCap);
        expect(effect?.stacks).toBe(authoredCap);
      }
    },
  );

  it.each([EffectId.POISON, EffectId.BURN, EffectId.ARMOR_BREAK])(
    'uses the balance cap for %s when the tower authors none',
    (effectId) => {
      let creep = createCreep();

      for (let application = 0; application < 10; application += 1) {
        creep = applyEffectToCreep(creep, { effectId });
      }

      expect(findActiveEffect(creep, effectId)?.stacks).toBe(
        resolveEffectDefinition(effectId).maxStacks,
      );
    },
  );

  it('keeps the higher cap when a no-stack tower feeds a stacking poison', () => {
    let creep = createCreep();

    for (let application = 0; application < 2; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.POISON });
    }
    for (let application = 0; application < 4; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.POISON, maxStacks: 1 });
    }

    const effect = findActiveEffect(creep, EffectId.POISON);
    expect(effect?.maxStacks).toBe(POISON.maxStacks);
    expect(effect?.stacks).toBe(POISON.maxStacks);
  });

  it('lifts an existing stack ceiling when a stronger tower joins in', () => {
    let creep = createCreep();

    for (let application = 0; application < 6; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.POISON });
    }

    creep = applyEffectToCreep(creep, {
      effectId: EffectId.POISON,
      maxStacks: POISON.maxStacks + 1,
    });

    expect(findActiveEffect(creep, EffectId.POISON)?.maxStacks).toBe(POISON.maxStacks + 1);
  });
});
