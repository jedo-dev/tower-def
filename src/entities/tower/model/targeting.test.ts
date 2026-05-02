import { describe, expect, it } from 'vitest';
import type { CreepEntity } from '../../creep';
import { getCreepsInTowerRange, selectTowerTarget } from './targeting';
import { TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';

function createTower(overrides?: Partial<TowerEntity>): TowerEntity {
  return {
    id: 'tower:archer:0',
    type: 'archer',
    cost: 100,
    position: { x: 5, y: 5 },
    combatStats: TOWER_COMBAT_STATS_BY_TYPE.archer,
    ...overrides,
  };
}

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    id: 'creep:0',
    type: 'basic',
    hp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 5, y: 5 },
    pathIndex: 0,
    ...overrides,
  };
}

describe('tower targeting', () => {
  it('returns only alive creeps in range', () => {
    const tower = createTower();
    const inRange = createCreep({ id: 'creep:in', position: { x: 7, y: 5 } });
    const outOfRange = createCreep({ id: 'creep:out', position: { x: 9, y: 5 } });
    const deadInRange = createCreep({
      id: 'creep:dead',
      position: { x: 6, y: 5 },
      lifeState: 'dead',
      status: 'dead',
      hp: 0,
    });

    const result = getCreepsInTowerRange(tower, [inRange, outOfRange, deadInRange]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('creep:in');
  });

  it('selects target with highest path index in range', () => {
    const tower = createTower();
    const slowProgress = createCreep({ id: 'creep:a', position: { x: 6, y: 5 }, pathIndex: 2 });
    const deepProgress = createCreep({ id: 'creep:b', position: { x: 8, y: 5 }, pathIndex: 5 });

    const target = selectTowerTarget(tower, [slowProgress, deepProgress]);

    expect(target?.id).toBe('creep:b');
  });

  it('returns null when no creep is in range', () => {
    const tower = createTower();
    const target = selectTowerTarget(
      tower,
      [createCreep({ id: 'creep:far', position: { x: 0, y: 0 } })],
    );

    expect(target).toBeNull();
  });

  it('includes creep on exact range boundary', () => {
    const tower = createTower();
    const boundaryCreep = createCreep({
      id: 'creep:boundary',
      position: { x: 8, y: 5 },
    });

    const result = getCreepsInTowerRange(tower, [boundaryCreep]);
    expect(result.map((creep) => creep.id)).toEqual(['creep:boundary']);
  });

  it('when path progress ties, picks nearest creep', () => {
    const tower = createTower();
    const farther = createCreep({
      id: 'creep:farther',
      position: { x: 8, y: 5 },
      pathIndex: 4,
    });
    const nearer = createCreep({
      id: 'creep:nearer',
      position: { x: 6, y: 5 },
      pathIndex: 4,
    });

    const target = selectTowerTarget(tower, [farther, nearer]);
    expect(target?.id).toBe('creep:nearer');
  });
});
