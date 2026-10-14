import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../creep';
import { UnitMoveType, UnitSizeClass } from '../../../shared/types/content-ids';
import type { CreepEntity } from '../../creep';
import { canTowerTargetCreep, getCreepsInTowerRange, selectTowerTarget } from './targeting';
import { TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';

function createTower(overrides?: Partial<TowerEntity>): TowerEntity {
  return {
    id: 'tower:archer:0',
    type: 'single',
    cost: 100,
    position: { x: 5, y: 5 },
    level: 1,
    combatStats: TOWER_COMBAT_STATS_BY_TYPE.single,
    ...overrides,
  };
}

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
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

describe('tower targeting by footprint centre', () => {
  it('measures a large creep from its 2x2 centre, not its anchor cell', () => {
    const tower = createTower();
    const range = tower.combatStats.range;
    // Tower centre is (5.5, 5.5); the large creep's centre lands exactly at range.
    const anchor = { x: 5 - range, y: 5 };
    const medium = createCreep({ id: 'creep:medium', position: anchor });
    const large = createCreep({
      id: 'creep:large',
      position: anchor,
      sizeClass: UnitSizeClass.LARGE,
    });

    const result = getCreepsInTowerRange(tower, [medium, large]);

    expect(result.map((creep) => creep.id)).toEqual(['creep:large']);
  });
});

describe('tower targeting', () => {
  it('returns only alive creeps in range', () => {
    const tower = createTower();
    const inRange = createCreep({ id: 'creep:in', position: { x: 7, y: 5 } });
    const outOfRange = createCreep({ id: 'creep:out', position: { x: 12, y: 5 } });
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

  it('selects the target with the least remaining route distance in range', () => {
    const tower = createTower();
    const slowProgress = createCreep({
      id: 'creep:a',
      position: { x: 6, y: 5 },
      remainingRouteDistance: 20,
    });
    const deepProgress = createCreep({
      id: 'creep:b',
      position: { x: 8, y: 5 },
      remainingRouteDistance: 12,
    });

    const target = selectTowerTarget(tower, [slowProgress, deepProgress]);

    expect(target?.id).toBe('creep:b');
  });

  it('returns null when no creep is in range', () => {
    const tower = createTower();
    const target = selectTowerTarget(tower, [
      createCreep({ id: 'creep:far', position: { x: 0, y: 0 } }),
    ]);

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
      remainingRouteDistance: 9,
    });
    const nearer = createCreep({
      id: 'creep:nearer',
      position: { x: 6, y: 5 },
      remainingRouteDistance: 9,
    });

    const target = selectTowerTarget(tower, [farther, nearer]);
    expect(target?.id).toBe('creep:nearer');
  });
});

describe('tower targeting from a 2x2 footprint', () => {
  it('measures range from the centre of the block, not its anchor', () => {
    const tower = createTower({ position: { x: 5, y: 5 } });
    const range = tower.combatStats.range;
    // Just inside range from the centre (5.5, 5.5), just outside from the anchor.
    const creep = createCreep({ position: { x: 5.5 + range - 0.1, y: 5.5 } });

    expect(getCreepsInTowerRange(tower, [creep])).toHaveLength(1);
  });
});

describe('tower target scope (allowedTargets)', () => {
  const flier = (overrides?: Partial<CreepEntity>) =>
    createCreep({ id: 'creep:air', moveType: UnitMoveType.AIR, ...overrides });

  it('a ground-only tower never sees an air creep, even in range', () => {
    const splash = createTower({ type: 'splash', combatStats: TOWER_COMBAT_STATS_BY_TYPE.splash });
    expect(getCreepsInTowerRange(splash, [flier({ position: { x: 6, y: 5 } })])).toEqual([]);
    expect(selectTowerTarget(splash, [flier({ position: { x: 6, y: 5 } })])).toBeNull();
  });

  it('a both-scope tower shoots air and ground alike', () => {
    const archer = createTower();
    const result = getCreepsInTowerRange(archer, [
      flier({ position: { x: 6, y: 5 } }),
      createCreep({ id: 'creep:ground', position: { x: 7, y: 5 } }),
    ]);
    expect(result.map((creep) => creep.id)).toEqual(['creep:air', 'creep:ground']);
  });

  it('an authored scope on the tower entity overrides the archetype', () => {
    expect(canTowerTargetCreep(createTower({ allowedTargets: 'ground' }), flier())).toBe(false);
    expect(canTowerTargetCreep(createTower({ allowedTargets: 'air' }), createCreep())).toBe(false);
    expect(canTowerTargetCreep(createTower({ allowedTargets: 'air' }), flier())).toBe(true);
  });

  it('prefers the creep closest to its exit, air first on a tie, then the nearest', () => {
    const archer = createTower();
    const ground = createCreep({
      id: 'creep:ground',
      position: { x: 6, y: 5 },
      remainingRouteDistance: 9,
    });
    const air = flier({ position: { x: 8, y: 5 }, remainingRouteDistance: 9 });
    const groundAhead = createCreep({
      id: 'creep:ahead',
      position: { x: 9, y: 5 },
      remainingRouteDistance: 4,
    });

    expect(selectTowerTarget(archer, [ground, air])?.id).toBe('creep:air');
    expect(selectTowerTarget(archer, [air, ground, groundAhead])?.id).toBe('creep:ahead');
  });
});
