import { UnitMoveType, type RaceId } from '../../../shared/types/content-ids';
import { getIncomeBonusByTier, getSendCostByTier } from '../../duel-match/model/sendEconomy';
import { isSendTierUnlocked } from '../../duel-match/model/sendUnlock';
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
  /**
   * Damage types each lane of the defender deals, when read lane by lane
   * (tower-def-4qe): a flier meets only the towers that can shoot air, so its
   * armor is valued against theirs. `defenderDamageMix` for a lane left out.
   */
  laneDamageMix?: Partial<Readonly<Record<UnitMoveType, DamageTypeMix>>>;
  /**
   * Expected survival of a flier relative to a walker against the defender's
   * air coverage (`computeAirSurvivalFactor`); 1 when omitted.
   */
  airSurvivalFactor?: number;
};

const NEUTRAL_VALUATION: SendValuation = {
  defenderDamageMix: EVEN_DAMAGE_MIX,
  healthMultiplier: 1,
};

/**
 * Pressure value of sending `unit` for `cost`: the raw damage of the
 * defender's mix it takes to kill it (each share through its armor, percent
 * through its grown maximum health), per gold. A flier's is scaled by its
 * expected survival against the defender's air coverage.
 */
export function computeSendPressureEfficiency(
  unit: Pick<UnitConfig, 'health' | 'physicalArmor' | 'magicalArmor'> &
    Partial<Pick<UnitConfig, 'moveType'>>,
  cost: number,
  valuation: SendValuation = NEUTRAL_VALUATION,
): number {
  if (cost <= 0) {
    return 0;
  }
  const moveType = unit.moveType ?? UnitMoveType.GROUND;
  const mix = valuation.laneDamageMix?.[moveType] ?? valuation.defenderDamageMix;
  const survival = moveType === UnitMoveType.AIR ? (valuation.airSurvivalFactor ?? 1) : 1;
  return (computeEffectiveHealth(unit, mix, valuation.healthMultiplier) * survival) / cost;
}

/**
 * What the race can send in the build phase after `round` waves: a tier the
 * send unlock schedule still locks (`CREATURE_SEND_UNLOCK_WAVE_BY_TIER`) is no
 * candidate, so the computer plays by the player's rule.
 */
export function listUnlockedSendableIds(raceId: RaceId, round: number): UnitId[] {
  return getRaceRegistry(raceId).sendableCreepIds.filter((id) =>
    isSendTierUnlocked(resolveUnitConfigById(id).tier, round),
  );
}

export function createSendCandidates(
  raceId: RaceId,
  round: number,
  valuation: SendValuation = NEUTRAL_VALUATION,
): SendCandidate[] {
  return listUnlockedSendableIds(raceId, round).map((id) => {
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
