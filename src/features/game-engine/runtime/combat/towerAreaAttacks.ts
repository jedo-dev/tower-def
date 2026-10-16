import { getCreepFootprintCenter, isCreepHidden } from '../../../../entities/creep';
import { canTowerTargetCreep, getTowerCenter, resolveTowerChain } from '../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { DamageType } from '../../../../shared/types/content-ids';
import {
  DEFAULT_SPLASH_RADIUS_CELLS,
  type CombatCreep,
  type CombatField,
  type CombatTower,
  type TowerCombatHooks,
} from './towerCombatTypes';
import { strikeAndReport, strikeCreep } from './towerStrike';

// Splash and chain attack shapes. `shotDamage` is the tower damage after
// shot-wide abilities (a critical hit); per-target abilities apply per strike.

export function applySingleTargetDamage<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  const result = strikeCreep(tower, target, shotDamage, damageType, hooks);
  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(result.damageApplied), 'hit');

  if (result.killed) {
    hooks.onCreepKilled(target, tower);
  }
}

export function applySplashDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  const splashRadius = tower.entity.combatStats.splashRadius ?? DEFAULT_SPLASH_RADIUS_CELLS;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;
  const towerCenterPx = hooks.toCellCenter(getTowerCenter(tower.entity));

  // A ground-only splash never touches a flier over its blast; a both-scope one does.
  const creepsInSplashRadius = field.creeps.filter((creep) => {
    if (
      creep.entity.status !== 'alive' ||
      isCreepHidden(creep.entity) ||
      !canTowerTargetCreep(tower.entity, creep.entity)
    ) {
      return false;
    }
    const creepCenter = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
    const distance = Math.hypot(creepCenter.x - towerCenterPx.x, creepCenter.y - towerCenterPx.y);
    return distance <= splashRadiusPx;
  });

  let totalDamageDealt = 0;
  for (const creep of creepsInSplashRadius) {
    const result = strikeCreep(tower, creep, shotDamage, damageType, hooks);
    totalDamageDealt += result.damageApplied;

    if (result.killed) {
      hooks.onCreepKilled(creep, tower);
    }
  }

  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(totalDamageDealt), 'hit');
}

/**
 * Picks the creeps an arc jumps to, among those the tower may hit. Selection
 * is by distance and then id, so a given battlefield state always produces
 * the same chain.
 */
function selectChainTargets<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  tower: T,
  from: C,
  bounces: number,
  bounceRangeCells: number,
): C[] {
  const visited = new Set<string>([from.entity.id]);
  const chain: C[] = [];
  let current = from;

  for (let bounce = 0; bounce < bounces; bounce += 1) {
    const currentCenter = hooks.toCellCenter(getCreepFootprintCenter(current.entity));
    const rangePx = bounceRangeCells * GRID_DIMENSIONS.cellSize;

    const next = field.creeps
      .filter(
        (creep) =>
          creep.entity.status === 'alive' &&
          !visited.has(creep.entity.id) &&
          !isCreepHidden(creep.entity) &&
          canTowerTargetCreep(tower.entity, creep.entity),
      )
      .map((creep) => {
        const center = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
        return {
          creep,
          distance: Math.hypot(center.x - currentCenter.x, center.y - currentCenter.y),
        };
      })
      .filter((candidate) => candidate.distance <= rangePx)
      .sort((left, right) =>
        left.distance === right.distance
          ? left.creep.entity.id.localeCompare(right.creep.entity.id)
          : left.distance - right.distance,
      )[0];

    if (!next) {
      break;
    }

    visited.add(next.creep.entity.id);
    chain.push(next.creep);
    current = next.creep;
  }

  return chain;
}

export function applyChainDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  const chainShape = resolveTowerChain(tower.entity.type, tower.entity.combatStats);

  applySingleTargetDamage(tower, target, shotDamage, damageType, hooks);

  if (!chainShape) {
    return;
  }

  const chainTargets = selectChainTargets(
    field,
    hooks,
    tower,
    target,
    chainShape.bounces,
    chainShape.bounceRangeCells,
  );

  let arcDamage = shotDamage;

  for (const creep of chainTargets) {
    arcDamage *= 1 - chainShape.damageFalloff;
    strikeAndReport(tower, creep, arcDamage, damageType, hooks);
  }
}
