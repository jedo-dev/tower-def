import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from '../../../entities/creep';
import {
  createInitialTowerCombatRuntime,
  type TowerAbilities,
  type TowerCombatStats,
  type TowerEntity,
} from '../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import { CreepTypeId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type {
  CombatCreep,
  CombatField,
  CombatTower,
  TowerCombatHooks,
} from '../runtime/combat/towerCombatTypes';

/**
 * Renderer-free fixtures for combat-core integration tests: plain towers and
 * creeps on a field, and hooks that record what combat reported. The core is
 * what both the game scene and the headless duel run, so these tests cover
 * both.
 */

export type FixtureTowerOptions = {
  id?: string;
  type?: TowerTypeId;
  position?: GridPosition;
  stats?: Partial<TowerCombatStats>;
  abilities?: TowerAbilities;
  auraBonus?: TowerEntity['auraBonus'];
};

/** A tower whose stats are given outright (no archetype on-hit effects unless authored). */
export function createFixtureTower(options: FixtureTowerOptions = {}): CombatTower {
  const combatStats: TowerCombatStats = {
    damage: 100,
    range: 6,
    attackCooldownMs: 1_000,
    onHitEffects: [],
    ...options.stats,
    ...(options.abilities === undefined ? {} : { abilities: options.abilities }),
  };

  return {
    entity: {
      id: options.id ?? 'tower:fixture',
      position: options.position ?? { x: 0, y: 0 },
      cost: 50,
      type: options.type ?? TowerTypeId.SINGLE,
      level: 1,
      combatStats,
      ...(options.auraBonus === undefined ? {} : { auraBonus: options.auraBonus }),
    },
    runtime: createInitialTowerCombatRuntime(),
  };
}

/**
 * A medium ground creep with no armor at `position`. `remainingRouteDistance`
 * decides target priority: the lowest is shot first.
 */
export function createFixtureCreep(
  id: string,
  position: GridPosition,
  overrides: Partial<CreepEntity> = {},
): CombatCreep {
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id,
      type: CreepTypeId.BASIC,
      hp: 10_000,
      maxHp: 10_000,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position,
      pathIndex: 0,
      remainingRouteDistance: 10,
      ...overrides,
    },
  };
}

export type RecordedKill = { creepId: string; killerId: string | undefined };

export type RecordingHooks = TowerCombatHooks<CombatCreep, CombatTower> & {
  kills: RecordedKill[];
  /** Damage numbers in report order, rounded as the hooks receive them. */
  damageNumbers: number[];
  hitCreepIds: string[];
  struckTowerIds: string[];
  firedTowerIds: string[];
};

export function createRecordingHooks(): RecordingHooks {
  const hooks: RecordingHooks = {
    kills: [],
    damageNumbers: [],
    hitCreepIds: [],
    struckTowerIds: [],
    firedTowerIds: [],
    writeCellCenter: (position, out) => {
      out.x = position.x * GRID_DIMENSIONS.cellSize;
      out.y = position.y * GRID_DIMENSIONS.cellSize;
    },
    onCreepHit: (creep) => hooks.hitCreepIds.push(creep.entity.id),
    onTargetStruck: (tower) => hooks.struckTowerIds.push(tower.entity.id),
    onDamageDealt: (_position, damage) => hooks.damageNumbers.push(damage),
    onEffectApplied: () => undefined,
    onEffectsTicked: () => undefined,
    onCreepKilled: (creep, killer) =>
      hooks.kills.push({ creepId: creep.entity.id, killerId: killer?.entity.id }),
    onTowerFired: (tower) => hooks.firedTowerIds.push(tower.entity.id),
  };
  return hooks;
}

export function createFixtureField(
  towers: CombatTower[],
  creeps: CombatCreep[],
): CombatField<CombatCreep, CombatTower> {
  return { towers, creeps };
}

/** Health a fixture creep has lost so far. */
export function damageTaken(creep: CombatCreep): number {
  return (creep.entity.maxHp ?? creep.entity.hp) - creep.entity.hp;
}
