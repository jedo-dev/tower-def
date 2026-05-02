import { describe, expect, it } from 'vitest';
import { filterActiveWaveCreeps } from './runtime';
import type { CreepEntity } from './types';

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    id: 'creep:test',
    type: 'basic',
    hp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...overrides,
  };
}

describe('filterActiveWaveCreeps', () => {
  it('keeps only alive and non-escaped creeps', () => {
    const alive = createCreep({ id: 'alive' });
    const dead = createCreep({
      id: 'dead',
      hp: 0,
      lifeState: 'dead',
      status: 'dead',
    });
    const escaped = createCreep({
      id: 'escaped',
      status: 'escaped',
    });

    const result = filterActiveWaveCreeps([alive, dead, escaped]);
    expect(result.map((creep) => creep.id)).toEqual(['alive']);
  });
});
