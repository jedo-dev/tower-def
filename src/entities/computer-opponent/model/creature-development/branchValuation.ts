import { CREATURE_TALENT_GRADE_LEVELS } from '../../../../shared/constants/creatureTalents';
import { getSendCostByTier } from '../../../duel-match/model/sendEconomy';
import type { CreatureTalentBranchDefinition } from '../../../unit/model/content/creatureTalentContent';
import { getCreatureBranchCost, getNextCreatureGradeCost } from '../../../unit/model/talents';
import type { UnitConfig } from '../../../unit/model/types';
import type { CreatureValuation } from './constants';
import { computeCreatureValue } from './creatureValue';
import type { DefenceProfile } from './defenceProfile';

/** What valuing a creature needs besides the creature: the defence and the wave. */
export type CreatureValuationContext = {
  profile: DefenceProfile;
  healthMultiplier: number;
  valuation: CreatureValuation;
};

export type CreatureBranchValue = {
  branchId: string;
  /** Pressure value per gold gained at grades 1-4 over the base creature. */
  gains: readonly number[];
  /** Experience the whole path costs: the branch and grades 1-4. */
  pathXpCost: number;
  /** Mean gain per experience point: what picks the branch. */
  score: number;
};

/** Experience the branch and all four grades of a tier cost. */
export function computeCreaturePathXpCost(unit: Pick<UnitConfig, 'tier'>): number {
  let total = getCreatureBranchCost(unit.tier);
  for (let grade = 0; grade < CREATURE_TALENT_GRADE_LEVELS.length; grade += 1) {
    total += getNextCreatureGradeCost(unit.tier, grade as 0 | 1 | 2 | 3) ?? 0;
  }
  return total;
}

/** Values one branch of `unit`: each grade against the base creature, per experience. */
export function valueCreatureBranch(
  unit: UnitConfig,
  branch: CreatureTalentBranchDefinition,
  context: CreatureValuationContext,
): CreatureBranchValue {
  const sendCost = getSendCostByTier(unit.tier);
  const valueOf = (stats: UnitConfig | CreatureTalentBranchDefinition['grades'][number]) =>
    computeCreatureValue({ ...context, stats, sendCost });
  const baseValue = valueOf(unit);
  const gains = branch.grades.map((grade) => valueOf(grade) - baseValue);
  const pathXpCost = computeCreaturePathXpCost(unit);
  const meanGain = gains.reduce((sum, gain) => sum + gain, 0) / Math.max(1, gains.length);
  return { branchId: branch.id, gains, pathXpCost, score: meanGain / pathXpCost };
}

/** The better branch of `unit` (authored order breaks ties), or undefined when it has none. */
export function selectBestCreatureBranch(
  unit: UnitConfig,
  context: CreatureValuationContext,
): CreatureBranchValue | undefined {
  let best: CreatureBranchValue | undefined;
  for (const branch of unit.talentBranches) {
    const value = valueCreatureBranch(unit, branch, context);
    if (best === undefined || value.score > best.score) {
      best = value;
    }
  }
  return best;
}
