import { THREAT_BUDGET_TUNING_BY_DIFFICULTY } from './constants';
import { computeAirThreatShare } from './splitThreatBudget';
import type { DecisionContext } from '../types';

/**
 * The air share of a decision context's next defence spend, against the
 * difficulty's comfortable margin (see `computeAirThreatShare`). 0 when the
 * context carries no defence assessment or no air lane.
 */
export function resolveAirThreatShare(context: DecisionContext): number {
  if (!context.defence) {
    return 0;
  }
  const { comfortableMargin } = THREAT_BUDGET_TUNING_BY_DIFFICULTY[context.difficulty];
  return computeAirThreatShare(context.defence, comfortableMargin);
}
