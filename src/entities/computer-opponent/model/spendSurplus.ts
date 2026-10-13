import type { GridPosition } from '../../../shared/types/pathfinding';
import { buildCoverageTowers, investInPlan, type BuildRoundState } from './buildRoundActions';
import { SPEND_BUDGET_BY_DIFFICULTY } from './buildSpendBudget';
import type { DecisionContext } from './types';

/**
 * Gold above the opponent's reserve (a share of one round of income, see
 * `surplusReserveIncomeShare`) that this build phase has not committed yet.
 */
export function computeSurplusGold(context: DecisionContext, committedGold: number): number {
  const { surplusReserveIncomeShare } = SPEND_BUDGET_BY_DIFFICULTY[context.difficulty];
  const reserve = Math.floor(Math.max(0, context.income) * surplusReserveIncomeShare);
  return Math.max(0, context.gold - committedGold - reserve);
}

/**
 * Spends what is left once the maze plan is finished. Nothing else would: the
 * threat split eases the build budget while defence is comfortable (to leave
 * gold for sends that the send cap then never takes), defending caps the
 * upgrades a round, and a finished plan has no blocks left to wall, so late in
 * a match gold piled up round after round. The surplus goes, by value per
 * gold, to any plan blocks still unbuilt, their damage types and upgrades
 * (`investInPlan`); what upgrades cannot absorb buys new towers off the route
 * where they cover the most of it.
 */
export function spendSurplus(
  round: BuildRoundState,
  context: DecisionContext,
  unbuilt: readonly GridPosition[],
  committedGold: number,
  maxBuilds: number,
): void {
  const surplus = computeSurplusGold(context, committedGold);
  if (surplus <= 0) {
    return;
  }

  round.remainingBudget = surplus;
  round.reasoning.push(`Maze plan finished: spending ${surplus} surplus gold`);
  investInPlan(round, context, unbuilt, { maxBuilds });
  buildCoverageTowers(round, context, round.buildCount + maxBuilds);
}
