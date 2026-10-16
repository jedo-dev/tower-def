import { describe, expect, it } from 'vitest';
import type { CreepEntity } from '../../../../entities/creep';
import {
  buildSentCreepOutcomes,
  createSentCreepDeathTally,
  recordSentCreepDeath,
  resetSentCreepDeathTally,
} from './sentCreepOutcomeTally';

function creep(overrides: Partial<CreepEntity>): CreepEntity {
  return {
    id: 'creep',
    type: 'basic',
    hp: 0,
    lifeState: 'dead',
    speed: 1,
    status: 'dead',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    physicalArmor: 0,
    magicalArmor: 0,
    moveType: 'ground',
    sizeClass: 'medium',
    ...overrides,
  } as CreepEntity;
}

describe('sent creep death tally', () => {
  it('counts sent deaths per field and reads leaks from the field at settle', () => {
    const tally = createSentCreepDeathTally();
    recordSentCreepDeath(tally, 'opponent', creep({ sender: 'player', sentTier: 2 }));
    recordSentCreepDeath(tally, 'opponent', creep({}));
    recordSentCreepDeath(tally, 'player', creep({ sender: 'opponent', sentTier: 1 }));

    const outcomes = buildSentCreepOutcomes(
      tally,
      [creep({ status: 'escaped', sender: 'opponent', sentTier: 3 })],
      [creep({ status: 'escaped' })],
    );

    expect(outcomes).toEqual({
      onPlayerField: { diedTiers: [1], leaks: [{ tier: 3, lives: 1 }] },
      onOpponentField: { diedTiers: [2], leaks: [] },
    });
  });

  it('empties on reset without touching outcomes already built', () => {
    const tally = createSentCreepDeathTally();
    recordSentCreepDeath(tally, 'player', creep({ sender: 'opponent', sentTier: 1 }));
    const outcomes = buildSentCreepOutcomes(tally, [], []);

    resetSentCreepDeathTally(tally);

    expect(tally).toEqual({ player: [], opponent: [] });
    expect(outcomes.onPlayerField.diedTiers).toEqual([1]);
  });
});
