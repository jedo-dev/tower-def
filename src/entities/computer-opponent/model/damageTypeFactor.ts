import type { TowerTypeId } from '../../../shared/types/content-ids';
import { resolveBuildableTowerDamageType } from '../../tower/model/damageType';
import { resolveTowerPlacementStats } from '../../tower/model/placementStats';
import { getRaceTowerConfig } from './buildSpendBudget';
import { computeArmorCounterFactor } from './damage-placement';
import { NEUTRAL_DAMAGE_EFFICIENCY } from './damage-profile';
import type { DecisionContext } from './types';

/**
 * How well the race's `towerType` answers the expected wave's armor (see
 * `computeArmorCounterFactor`), each lane's reading weighted by its share of
 * the wave (`airThreatShare`). 1 whenever the context carries no defence
 * assessment. Single-tower scoring multiplies a placement's value by it, so
 * the damage type that goes through the wave's weaker armor wins the block.
 */
export function resolveDamageTypeFactor(
  context: DecisionContext,
  towerType: TowerTypeId,
  airThreatShare: number,
): number {
  if (!context.defence) {
    return 1;
  }
  const authored = getRaceTowerConfig(towerType, context.raceId);
  const tower = {
    towerType,
    stats: resolveTowerPlacementStats(towerType, authored),
    ...(authored ? { damageType: resolveBuildableTowerDamageType(authored) } : {}),
  };
  const ground = computeArmorCounterFactor(
    tower,
    context.defence.damageEfficiency ?? NEUTRAL_DAMAGE_EFFICIENCY,
  );
  if (airThreatShare <= 0) {
    return ground;
  }
  const air = computeArmorCounterFactor(
    tower,
    context.defence.air?.damageEfficiency ?? NEUTRAL_DAMAGE_EFFICIENCY,
  );
  return (1 - airThreatShare) * ground + airThreatShare * air;
}
