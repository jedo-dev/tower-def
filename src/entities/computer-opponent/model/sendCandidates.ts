import type { RaceId } from '../../../shared/types/content-ids';
import { getIncomeBonusByTier, getSendCostByTier } from '../../duel-match/model/sendEconomy';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { resolveUnitConfigById } from '../../unit/model/registry';
import {
  applyCreatureGrade,
  getCreatureGrade,
  type CreatureTalentLedger,
} from '../../unit/model/talents';
import type { UnitConfig, UnitId, UnitTier } from '../../unit/model/types';
import { EVEN_DAMAGE_MIX, type DamageTypeMix } from './damage-profile';
import { computeEffectiveHealth } from './threat-budget/effectiveHealth';

export type SendCandidate = {
  id: UnitId;
  tier: UnitTier;
  cost: number;
  incomeBonus: number;
  /** Income per gold spent: what an economy buy maximises. */
  incomeEfficiency: number;
  /**
   * Health per gold spent, against the defender's damage mix: what a pressure
   * buy maximises. A creep whose armor meets what the defender's towers deal
   * is worth more than one their damage type goes straight through.
   */
  pressureEfficiency: number;
};

export type SendValuation = {
  /** Damage types the defender's towers deal; even when unknown. */
  defenderDamageMix: DamageTypeMix;
  /** Health multiplier of the wave the sends spawn in, for percent damage. */
  healthMultiplier: number;
  /** The sender's creature picks and grades: a creature is valued as it would spawn now. */
  creatureTalents?: Pick<CreatureTalentLedger, 'creatureBranchChoices' | 'creatureGrades'>;
};

const NEUTRAL_VALUATION: SendValuation = {
  defenderDamageMix: EVEN_DAMAGE_MIX,
  healthMultiplier: 1,
};

/**
 * Pressure value of sending `unit` for `cost`: the raw damage of the
 * defender's mix it takes to kill it (each share through its armor, percent
 * through its grown maximum health), per gold.
 */
export function computeSendPressureEfficiency(
  unit: Pick<UnitConfig, 'health' | 'physicalArmor' | 'magicalArmor'>,
  cost: number,
  valuation: SendValuation = NEUTRAL_VALUATION,
): number {
  if (cost <= 0) {
    return 0;
  }
  return (
    computeEffectiveHealth(unit, valuation.defenderDamageMix, valuation.healthMultiplier) / cost
  );
}

export function createSendCandidates(
  raceId: RaceId,
  valuation: SendValuation = NEUTRAL_VALUATION,
): SendCandidate[] {
  return getRaceRegistry(raceId).sendableCreepIds.map((id) => {
    const talents = valuation.creatureTalents;
    const config =
      talents === undefined
        ? resolveUnitConfigById(id)
        : applyCreatureGrade(
            resolveUnitConfigById(id),
            talents.creatureBranchChoices,
            getCreatureGrade(id, talents.creatureGrades),
          );
    const cost = getSendCostByTier(config.tier);
    const incomeBonus = getIncomeBonusByTier(config.tier);

    return {
      id,
      tier: config.tier,
      cost,
      incomeBonus,
      incomeEfficiency: incomeBonus / cost,
      pressureEfficiency: computeSendPressureEfficiency(config, cost, valuation),
    };
  });
}
