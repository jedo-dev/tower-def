import { describe, expect, it } from 'vitest';
import { getTowerKillBonusGold } from '../../../../entities/tower';
import { resolveEffectDefinition } from '../../../../shared/constants/effects';
import { EffectId } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks, tickFieldCreepEffects } from './towerCombatCore';

// Kills are credited to the tower that landed them, so an aura's
// `goldPerKill` can pay its owner; damage-over-time kills carry no tower.

describe('kill credit', () => {
  it('credits a hit kill to the tower, whose aura bonus sets the extra gold', () => {
    const buffed = createFixtureTower({
      id: 'buffed',
      auraBonus: { attackSpeedBonus: 0, rangeBonus: 0, goldPerKill: 2 },
    });
    const creep = createFixtureCreep('creep', { x: 3, y: 1 }, { hp: 50 });
    const hooks = createRecordingHooks();

    resolveTowerAttacks(createFixtureField([buffed], [creep]), hooks, 1_000);

    expect(hooks.kills).toEqual([{ creepId: 'creep', killerId: 'buffed' }]);
    expect(getTowerKillBonusGold(buffed.entity)).toBe(2);
  });

  it('credits no tower for a damage-over-time kill', () => {
    const poisoner = createFixtureTower({
      stats: { damage: 0, onHitEffects: [{ effectId: EffectId.POISON, magnitude: 100 }] },
    });
    const creep = createFixtureCreep('creep', { x: 3, y: 1 }, { hp: 50 });
    const field = createFixtureField([poisoner], [creep]);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 1_000);
    tickFieldCreepEffects(field, hooks, resolveEffectDefinition(EffectId.POISON).tickIntervalMs);

    expect(hooks.kills).toEqual([{ creepId: 'creep', killerId: undefined }]);
  });
});
