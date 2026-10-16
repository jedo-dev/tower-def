import { describe, expect, it } from 'vitest';
import {
  getTowerArchetype,
  getTowerStatsForTowerLevel,
  resolveTowerPlacementStats,
  tryResolveBuildableTowerById,
  type TowerChainDefinition,
  type TowerLevelStats,
} from '../../../../entities/tower';
import { TowerTypeId } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';
import type { CombatCreep, CombatTower } from './towerCombatTypes';

// A talent grade's own `chain` drives the fight (tower-def-bge.7): the tower
// fights with the shape its current level authors, the archetype's otherwise.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };
const ARCHETYPE_CHAIN = getTowerArchetype(TowerTypeId.CHAIN).chain!;

/** Grade 3 authors no chain; grade 4 raises the bounces from 3 to 5. */
const GRADE_THREE: TowerLevelStats = { damage: 100, range: 6, attackCooldownMs: 1_000 };
const GRADE_FOUR: TowerLevelStats = {
  damage: 100,
  range: 6,
  attackCooldownMs: 1_000,
  chain: { bounces: 5, bounceRangeCells: ARCHETYPE_CHAIN.bounceRangeCells, damageFalloff: 0.25 },
};

function chainTower(stats: TowerLevelStats): CombatTower {
  return createFixtureTower({
    type: TowerTypeId.CHAIN,
    position: TOWER_AT_ORIGIN,
    stats: { ...stats, onHitEffects: [] },
  });
}

/** The target first on the route at x = 1, then a creep every `spacing` cells. */
function creepLine(count: number, spacing = 1): CombatCreep[] {
  const creeps = [createFixtureCreep('a-target', { x: 1, y: 0 }, { remainingRouteDistance: 1 })];
  for (let index = 1; index < count; index += 1) {
    creeps.push(createFixtureCreep(`b-${index}`, { x: 1 + index * spacing, y: 0 }));
  }
  return creeps;
}

function fireOnce(tower: CombatTower, creeps: CombatCreep[]): number {
  resolveTowerAttacks(createFixtureField([tower], creeps), createRecordingHooks(), 1_000);
  return creeps.filter((creep) => damageTaken(creep) > 0).length;
}

/** Mirrors the upgrade command: the next level's stats replace the entity's. */
function upgradeTo(tower: CombatTower, level: number, stats: TowerLevelStats): void {
  tower.entity.level = level;
  tower.entity.combatStats = { ...stats, onHitEffects: [] };
  tower.entity.baseCombatStats = { ...tower.entity.combatStats };
}

describe('per-grade chain shape in combat', () => {
  it('jumps 3 times before the grade 4 upgrade and 5 times after it', () => {
    const tower = chainTower(GRADE_THREE);

    expect(ARCHETYPE_CHAIN.bounces).toBe(3);
    expect(fireOnce(tower, creepLine(8))).toBe(1 + 3);

    upgradeTo(tower, 4, GRADE_FOUR);

    expect(fireOnce(tower, creepLine(8))).toBe(1 + 5);
  });

  it('applies the grade falloff to every jump', () => {
    const chain: TowerChainDefinition = { bounces: 2, bounceRangeCells: 4, damageFalloff: 0.5 };
    const creeps = creepLine(3);
    fireOnce(chainTower({ ...GRADE_THREE, chain }), creeps);

    expect(damageTaken(creeps[0])).toBeCloseTo(100, 5);
    expect(damageTaken(creeps[1])).toBeCloseTo(50, 5);
    expect(damageTaken(creeps[2])).toBeCloseTo(25, 5);
  });

  it('honours the grade bounce range instead of the archetype one', () => {
    const shortReach: TowerChainDefinition = {
      bounces: 3,
      bounceRangeCells: 1.5,
      damageFalloff: 0.25,
    };

    expect(ARCHETYPE_CHAIN.bounceRangeCells).toBeGreaterThan(2);
    expect(fireOnce(chainTower(GRADE_THREE), creepLine(3, 2))).toBe(3);
    expect(fireOnce(chainTower({ ...GRADE_THREE, chain: shortReach }), creepLine(3, 2))).toBe(1);
  });

  it('fights the authored Thunderstorm grade 4 chain of the orc Lightning Totem', () => {
    const totem = tryResolveBuildableTowerById('orc_lightning_totem')!;
    const curveRef = { type: TowerTypeId.CHAIN, buildableTowerId: totem.id };
    const choices = { [totem.id]: 'orc_lightning_totem_storm' };
    const gradeFour = getTowerStatsForTowerLevel(curveRef, 4, choices)!;
    const tower = chainTower(resolveTowerPlacementStats(TowerTypeId.CHAIN, totem));

    expect(gradeFour.chain?.bounces).toBeGreaterThan(ARCHETYPE_CHAIN.bounces);
    upgradeTo(tower, 4, gradeFour);

    expect(fireOnce(tower, creepLine(9))).toBe(1 + gradeFour.chain!.bounces);
  });
});
