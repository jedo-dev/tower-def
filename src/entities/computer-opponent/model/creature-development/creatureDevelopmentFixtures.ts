import { DamageType, TowerTypeId } from '../../../../shared/types/content-ids';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import type { DamageModelTower } from '../damage-placement/towerDamageModel';
import { CreatureValuation } from './constants';
import type { CreatureValuationContext } from './branchValuation';
import { computeDefenceProfile } from './defenceProfile';

/** A defender tower at its archetype's grade 1 stats, optionally with its own damage type. */
export function defenderTower(towerType: TowerTypeId, damageType?: DamageType): DamageModelTower {
  const stats = { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] };
  return damageType === undefined ? { towerType, stats } : { towerType, stats, damageType };
}

function repeat(tower: DamageModelTower, count: number): DamageModelTower[] {
  return Array.from({ length: count }, () => tower);
}

/** Archers: physical single-target shots only. */
export const PHYSICAL_SINGLE_FIELD = repeat(
  defenderTower(TowerTypeId.SINGLE, DamageType.PHYSICAL),
  4,
);

/** Mortars: magical splash. */
export const MAGICAL_SPLASH_FIELD = repeat(
  defenderTower(TowerTypeId.SPLASH, DamageType.MAGICAL),
  4,
);

/** Frost towers. */
export const FROST_FIELD = repeat(defenderTower(TowerTypeId.FROST), 4);

export function fullContext(towers: readonly DamageModelTower[]): CreatureValuationContext {
  return {
    profile: computeDefenceProfile(towers),
    healthMultiplier: 1,
    valuation: CreatureValuation.FULL,
  };
}
