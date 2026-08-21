import { TowerAuraStacking } from '../../../shared/types/content-ids';
import type { TowerAuraDefinition } from './content/loadTowerContent';
import { getTowerArchetype } from './types';
import type { TowerCombatStats, TowerEntity } from './types';

/**
 * Support towers buff their neighbours instead of shooting. Buffs are derived,
 * never accumulated: every recalculation starts from the tower base stats, so
 * selling a support tower cannot leave a stale bonus behind.
 */

export type TowerAuraBonus = {
  attackSpeedBonus: number;
  rangeBonus: number;
};

const NO_BONUS: TowerAuraBonus = { attackSpeedBonus: 0, rangeBonus: 0 };

function getBaseCombatStats(tower: TowerEntity): TowerCombatStats {
  return tower.baseCombatStats ?? tower.combatStats;
}

function distanceInCells(left: TowerEntity, right: TowerEntity): number {
  return Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y);
}

function combineBonus(
  current: TowerAuraBonus,
  aura: TowerAuraDefinition,
): TowerAuraBonus {
  if (aura.stacking === TowerAuraStacking.STACK) {
    return {
      attackSpeedBonus: current.attackSpeedBonus + aura.attackSpeedBonus,
      rangeBonus: current.rangeBonus + aura.rangeBonus,
    };
  }

  return {
    attackSpeedBonus: Math.max(current.attackSpeedBonus, aura.attackSpeedBonus),
    rangeBonus: Math.max(current.rangeBonus, aura.rangeBonus),
  };
}

export function resolveTowerAuraBonus(
  tower: TowerEntity,
  towers: readonly TowerEntity[],
): TowerAuraBonus {
  let bonus = NO_BONUS;

  for (const candidate of towers) {
    if (candidate.id === tower.id) {
      continue;
    }

    const aura = getTowerArchetype(candidate.type).aura;

    if (!aura || distanceInCells(tower, candidate) > aura.radiusCells) {
      continue;
    }

    bonus = combineBonus(bonus, aura);
  }

  return bonus;
}

export function applyAuraBonusToStats(
  baseStats: TowerCombatStats,
  bonus: TowerAuraBonus,
): TowerCombatStats {
  if (bonus.attackSpeedBonus === 0 && bonus.rangeBonus === 0) {
    return baseStats;
  }

  return {
    ...baseStats,
    range: baseStats.range + bonus.rangeBonus,
    attackCooldownMs: Math.round(baseStats.attackCooldownMs / (1 + bonus.attackSpeedBonus)),
  };
}

/**
 * Recomputes the effective stats of every tower. Called when the battlefield
 * changes - build, sell, upgrade - never per frame.
 */
export function recalculateTowerAuras(towers: readonly TowerEntity[]): void {
  for (const tower of towers) {
    const baseStats = getBaseCombatStats(tower);
    tower.baseCombatStats = baseStats;

    // A support tower does not buff itself; it has nothing to buff.
    const bonus = getTowerArchetype(tower.type).aura
      ? NO_BONUS
      : resolveTowerAuraBonus(tower, towers);

    tower.auraBonus = bonus === NO_BONUS ? undefined : bonus;
    tower.combatStats = applyAuraBonusToStats(baseStats, bonus);
  }
}
