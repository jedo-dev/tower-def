import { describe, expect, it } from 'vitest';
import { applyDamageToCreep } from './damage';
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

describe('applyDamageToCreep', () => {
  it('reduces hp for alive creep', () => {
    const creep = createCreep({ hp: 90 });
    const result = applyDamageToCreep(creep, 25);

    expect(result.damageApplied).toBe(25);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(65);
    expect(result.creep.lifeState).toBe('alive');
    expect(result.creep.status).toBe('alive');
  });

  it('kills creep when damage reaches remaining hp', () => {
    const creep = createCreep({ hp: 30 });
    const result = applyDamageToCreep(creep, 30);

    expect(result.damageApplied).toBe(30);
    expect(result.killed).toBe(true);
    expect(result.creep.hp).toBe(0);
    expect(result.creep.lifeState).toBe('dead');
    expect(result.creep.status).toBe('dead');
  });

  it('does not damage creep that is already dead', () => {
    const deadCreep = createCreep({
      hp: 0,
      lifeState: 'dead',
      status: 'dead',
    });
    const result = applyDamageToCreep(deadCreep, 50);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep).toEqual(deadCreep);
  });

  it('caps applied damage to current hp on overkill', () => {
    const creep = createCreep({ hp: 10 });
    const result = applyDamageToCreep(creep, 999);

    expect(result.damageApplied).toBe(10);
    expect(result.killed).toBe(true);
    expect(result.creep.hp).toBe(0);
  });

  it('ignores negative damage values', () => {
    const creep = createCreep({ hp: 80 });
    const result = applyDamageToCreep(creep, -25);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(80);
    expect(result.creep.lifeState).toBe('alive');
  });
});
