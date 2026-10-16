import { getCreepFootprintCenter } from '../../../../entities/creep';
import {
  getTowerCenter,
  getTowerCreepDistanceInCells,
  isCreepTargetableByTower,
  isPointOnPierceLine,
  type TowerAbilities,
} from '../../../../entities/tower';
import { TOWER_ABILITY_BALANCE } from '../../../../shared/constants/towerAbilities';
import type { DamageType } from '../../../../shared/types/content-ids';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';
import { strikeAndReport } from './towerStrike';

// Abilities that widen a single-target shot (extra targets, piercing line)
// and the periodic volley. None allocates: selection walks the field in place.

/** Orders creeps by distance to the tower, then by id, so selection is deterministic. */
function isCloserThan(
  distance: number,
  id: string,
  otherDistance: number,
  otherId: string,
): boolean {
  return distance === otherDistance ? id < otherId : distance < otherDistance;
}

/**
 * Hits up to `extraTargets` other targetable creeps, nearest the tower first
 * (ties by id), for `extraTargetDamageShare` of the shot. Walks the field once
 * per pick instead of sorting a copy.
 */
export function applyExtraTargets<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  primary: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
  abilities: TowerAbilities,
): void {
  const count = abilities.extraTargets ?? 0;
  const share =
    abilities.extraTargetDamageShare ?? TOWER_ABILITY_BALANCE.defaultExtraTargetDamageShare;
  let previousDistance = Number.NEGATIVE_INFINITY;
  let previousId = '';

  for (let pick = 0; pick < count; pick += 1) {
    let best: C | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const creep of field.creeps) {
      if (creep === primary || !isCreepTargetableByTower(tower.entity, creep.entity)) {
        continue;
      }
      const distance = getTowerCreepDistanceInCells(tower.entity, creep.entity);
      const id = creep.entity.id;
      const isAfterPrevious = isCloserThan(previousDistance, previousId, distance, id);
      if (isAfterPrevious && (!best || isCloserThan(distance, id, bestDistance, best.entity.id))) {
        best = creep;
        bestDistance = distance;
      }
    }

    if (!best) {
      return;
    }

    previousDistance = bestDistance;
    previousId = best.entity.id;
    strikeAndReport(tower, best, shotDamage * share, damageType, hooks);
  }
}

/**
 * Hits every other valid creep whose centre lies on the line from the tower
 * to the primary target (within `pierceLineHalfWidthCells`), for `pierceLine`
 * of the shot.
 */
export function applyPierceLine<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  primary: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
  share: number,
): void {
  const from = getTowerCenter(tower.entity);
  const to = getCreepFootprintCenter(primary.entity);

  for (const creep of field.creeps) {
    if (creep === primary || !isCreepTargetableByTower(tower.entity, creep.entity)) {
      continue;
    }
    if (isPointOnPierceLine(from, to, getCreepFootprintCenter(creep.entity))) {
      strikeAndReport(tower, creep, shotDamage * share, damageType, hooks);
    }
  }
}

function hasTargetInRange<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
): boolean {
  for (const creep of field.creeps) {
    if (isCreepTargetableByTower(tower.entity, creep.entity)) {
      return true;
    }
  }
  return false;
}

/**
 * The periodic volley: every `volleyEveryMs` the tower hits every valid creep
 * in range once, for `volleyDamageShare` of its damage. A ready volley waits
 * for a target rather than firing at nothing; a fresh tower starts ready.
 */
export function resolveTowerVolley<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  hooks: TowerCombatHooks<C, T>,
  deltaMs: number,
  damageType: DamageType,
): void {
  const abilities = tower.entity.combatStats.abilities;
  const volleyEveryMs = abilities?.volleyEveryMs;

  if (volleyEveryMs === undefined) {
    return;
  }

  const remainingMs = Math.max(0, (tower.runtime.volleyCooldownRemainingMs ?? 0) - deltaMs);

  if (remainingMs > 0 || !hasTargetInRange(field, tower)) {
    if (remainingMs !== tower.runtime.volleyCooldownRemainingMs) {
      tower.runtime = { ...tower.runtime, volleyCooldownRemainingMs: remainingMs };
    }
    return;
  }

  const share = abilities?.volleyDamageShare ?? TOWER_ABILITY_BALANCE.defaultVolleyDamageShare;
  const volleyDamage = tower.entity.combatStats.damage * share;

  for (const creep of field.creeps) {
    if (isCreepTargetableByTower(tower.entity, creep.entity)) {
      strikeAndReport(tower, creep, volleyDamage, damageType, hooks);
    }
  }

  hooks.onTargetStruck(tower);
  tower.runtime = { ...tower.runtime, volleyCooldownRemainingMs: volleyEveryMs };
}
