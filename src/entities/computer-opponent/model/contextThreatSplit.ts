import { DUEL_MATCH_BALANCE } from '../../duel-match/model/balance';
import { getSendCostByTier } from '../../duel-match/model/sendEconomy';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { resolveUnitConfigById } from '../../unit/model/registry';
import { computeSpendBudget } from './buildSpendBudget';
import { SEND_TUNING_BY_DIFFICULTY } from './sendTuning';
import { THREAT_BUDGET_TUNING_BY_DIFFICULTY } from './threat-budget/constants';
import { splitThreatBudget, type ThreatBudgetSplit } from './threat-budget/splitThreatBudget';
import type { DecisionContext } from './types';

function findCheapestSendCost(context: DecisionContext): number {
  const costs = getRaceRegistry(context.raceId).sendableCreepIds.map((unitId) =>
    getSendCostByTier(resolveUnitConfigById(unitId).tier),
  );
  return costs.length > 0 ? Math.min(...costs) : 0;
}

/**
 * The threat split of a decision context, with the difficulty presets as its
 * parameters: the send share of `SEND_TUNING_BY_DIFFICULTY`, the spend cap of
 * `SPEND_BUDGET_BY_DIFFICULTY` and the margins of the threat tuning. Null
 * when the context carries no defence assessment. Both planners read the
 * same split, so sends and builds never claim the same gold twice.
 */
export function computeContextThreatSplit(context: DecisionContext): ThreatBudgetSplit | null {
  if (!context.defence) {
    return null;
  }
  return splitThreatBudget({
    gold: context.gold,
    assessment: context.defence,
    tuning: THREAT_BUDGET_TUNING_BY_DIFFICULTY[context.difficulty],
    maxSendShare: SEND_TUNING_BY_DIFFICULTY[context.difficulty].maxSendRatioPerRound,
    maxBuildBudget: computeSpendBudget(context.gold, context.difficulty),
    livesShare: context.hp / DUEL_MATCH_BALANCE.startingHp,
    cheapestSendCost: findCheapestSendCost(context),
  });
}
