import { describe, expect, it } from 'vitest';
import { isCreepAlive, isCreepDead, setCreepLifeState } from './lifeState';
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

describe('creep life state', () => {
  it('recognizes alive creep', () => {
    const creep = createCreep();
    expect(isCreepAlive(creep)).toBe(true);
    expect(isCreepDead(creep)).toBe(false);
  });

  it('recognizes dead creep', () => {
    const creep = createCreep({
      hp: 0,
      lifeState: 'dead',
      status: 'dead',
    });

    expect(isCreepAlive(creep)).toBe(false);
    expect(isCreepDead(creep)).toBe(true);
  });

  it('sets dead state consistently', () => {
    const creep = createCreep();
    const deadCreep = setCreepLifeState(creep, 'dead');

    expect(deadCreep.lifeState).toBe('dead');
    expect(deadCreep.status).toBe('dead');
    expect(deadCreep.hp).toBeGreaterThanOrEqual(0);
  });
});
