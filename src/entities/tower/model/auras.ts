import {
  DamageScope,
  TowerAuraStacking,
  damageScopeCovers,
  type DamageType,
} from '../../../shared/types/content-ids';
import type { TowerAuraDefinition } from './content/loadTowerContent';
import { resolveTowerDamageType } from './damageType';
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
  /** Share of damage added; present only when an aura grants one. */
  damagePercentBonus?: number;
  /** Extra gold per kill by this tower; present only when an aura grants one. */
  goldPerKill?: number;
  /** Share added to this tower's sell refund ratio; present only when an aura grants one. */
  sellRefundBonus?: number;
};

type OptionalAuraBonusKey = 'damagePercentBonus' | 'goldPerKill' | 'sellRefundBonus';

const NO_BONUS: TowerAuraBonus = { attackSpeedBonus: 0, rangeBonus: 0 };

function getBaseCombatStats(tower: TowerEntity): TowerCombatStats {
  return tower.baseCombatStats ?? tower.combatStats;
}

/** The aura a tower projects right now: its level first, archetype otherwise. */
export function resolveTowerAura(tower: TowerEntity): TowerAuraDefinition | undefined {
  return (
    tower.combatStats.aura ?? tower.baseCombatStats?.aura ?? getTowerArchetype(tower.type).aura
  );
}

function distanceInCells(left: TowerEntity, right: TowerEntity): number {
  return Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y);
}

/** The aura's damage bonus as it applies to a tower dealing `damageType`. */
function resolveAuraDamageBonus(aura: TowerAuraDefinition, damageType: DamageType): number {
  const scope = aura.damageBonusType ?? DamageScope.ALL;
  return damageScopeCovers(scope, damageType) ? (aura.damagePercentBonus ?? 0) : 0;
}

function combineValue(isStacking: boolean, current: number, added: number): number {
  return isStacking ? current + added : Math.max(current, added);
}

/** Copies an optional bonus onto `bonus` only when it is non-zero, keeping the shape lean. */
function withOptionalBonus(
  bonus: TowerAuraBonus,
  key: OptionalAuraBonusKey,
  value: number,
): TowerAuraBonus {
  return value > 0 ? { ...bonus, [key]: value } : bonus;
}

function combineBonus(
  current: TowerAuraBonus,
  aura: TowerAuraDefinition,
  damageType: DamageType,
): TowerAuraBonus {
  const isStacking = aura.stacking === TowerAuraStacking.STACK;
  let bonus: TowerAuraBonus = {
    attackSpeedBonus: combineValue(isStacking, current.attackSpeedBonus, aura.attackSpeedBonus),
    rangeBonus: combineValue(isStacking, current.rangeBonus, aura.rangeBonus),
  };

  bonus = withOptionalBonus(
    bonus,
    'damagePercentBonus',
    combineValue(
      isStacking,
      current.damagePercentBonus ?? 0,
      resolveAuraDamageBonus(aura, damageType),
    ),
  );
  bonus = withOptionalBonus(
    bonus,
    'goldPerKill',
    combineValue(isStacking, current.goldPerKill ?? 0, aura.goldPerKill ?? 0),
  );
  return withOptionalBonus(
    bonus,
    'sellRefundBonus',
    combineValue(isStacking, current.sellRefundBonus ?? 0, aura.sellRefundBonus ?? 0),
  );
}

export function resolveTowerAuraBonus(
  tower: TowerEntity,
  towers: readonly TowerEntity[],
): TowerAuraBonus {
  let bonus = NO_BONUS;
  const damageType = resolveTowerDamageType(tower);

  for (const candidate of towers) {
    if (candidate.id === tower.id) {
      continue;
    }

    const aura = resolveTowerAura(candidate);

    if (!aura || distanceInCells(tower, candidate) > aura.radiusCells) {
      continue;
    }

    bonus = combineBonus(bonus, aura, damageType);
  }

  return bonus;
}

export function applyAuraBonusToStats(
  baseStats: TowerCombatStats,
  bonus: TowerAuraBonus,
): TowerCombatStats {
  const damageBonus = bonus.damagePercentBonus ?? 0;

  if (bonus.attackSpeedBonus === 0 && bonus.rangeBonus === 0 && damageBonus === 0) {
    return baseStats;
  }

  return {
    ...baseStats,
    range: baseStats.range + bonus.rangeBonus,
    attackCooldownMs: Math.round(baseStats.attackCooldownMs / (1 + bonus.attackSpeedBonus)),
    ...(damageBonus === 0 ? {} : { damage: baseStats.damage * (1 + damageBonus) }),
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
    const bonus = resolveTowerAura(tower) ? NO_BONUS : resolveTowerAuraBonus(tower, towers);

    tower.auraBonus = bonus === NO_BONUS ? undefined : bonus;
    tower.combatStats = applyAuraBonusToStats(baseStats, bonus);
  }
}

/**
 * Copies of the towers with their auras applied, for a field that is rebuilt
 * from stored state (the computer's battlefield, the headless duel). The
 * stored towers stay untouched, so auras never compound across rebuilds.
 */
export function createTowersWithAuras(towers: readonly TowerEntity[]): TowerEntity[] {
  const copies = towers.map((tower) => ({ ...tower, combatStats: { ...tower.combatStats } }));
  recalculateTowerAuras(copies);
  return copies;
}
