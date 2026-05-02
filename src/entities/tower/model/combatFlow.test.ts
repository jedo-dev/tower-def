import { describe, expect, it } from 'vitest';
import { applyDamageToCreep, type CreepEntity } from '../../creep';
import { selectTowerTarget } from './targeting';
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
    position: { x: 6, y: 5 },
    pathIndex: 0,
    ...overrides,
  };
}

describe('tower combat flow', () => {
  it('selects in-range target and applies tower damage', () => {
    const tower = createTower();
    const lowProgress = createCreep({
      id: 'creep:low',
      position: { x: 6, y: 5 },
      pathIndex: 1,
      hp: 100,
    });
    const highProgress = createCreep({
      id: 'creep:high',
      position: { x: 7, y: 5 },
      pathIndex: 3,
      hp: 60,
    });

    const target = selectTowerTarget(tower, [lowProgress, highProgress]);
    expect(target?.id).toBe('creep:high');

    const damageResult = applyDamageToCreep(target as CreepEntity, tower.combatStats.damage);
    expect(damageResult.damageApplied).toBe(tower.combatStats.damage);
    expect(damageResult.creep.hp).toBe(60 - tower.combatStats.damage);
    expect(damageResult.killed).toBe(false);
  });

  it('archer tower can kill creep in finite number of attacks', () => {
    const tower = createTower();
    let creep = createCreep({
      id: 'creep:killable',
      hp: 95,
      pathIndex: 2,
      position: { x: 6, y: 5 },
    });

    let attacks = 0;
    while (creep.status === 'alive' && attacks < 20) {
      const target = selectTowerTarget(tower, [creep]);
      expect(target).not.toBeNull();

      const damageResult = applyDamageToCreep(target as CreepEntity, tower.combatStats.damage);
      creep = damageResult.creep;
      attacks += 1;
    }

    expect(creep.status).toBe('dead');
    expect(attacks).toBeLessThanOrEqual(20);
  });
});
