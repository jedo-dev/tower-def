import { WAVE_AIR_UNIT_BUDGET_MULTIPLIER } from '../../../wave/model/waveBalance';
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

/**
 * The share of a wave's threat that flies, from the share of its hit points
 * that does: a flier's hit point counts `WAVE_AIR_UNIT_BUDGET_MULTIPLIER`
 * times a walker's, the rate the wave budget charges a flier for meeting a
 * fraction of the fire a walker takes through the maze.
 * `m * air / (ground + m * air)`; 0 and 1 stay put.
 */
export function toAirThreatShare(airHealthShare: number): number {
  const air = Math.min(1, Math.max(0, airHealthShare)) * WAVE_AIR_UNIT_BUDGET_MULTIPLIER;
  const total = 1 - Math.min(1, Math.max(0, airHealthShare)) + air;
  return total > 0 ? air / total : 0;
}

/**
 * What the air lane weighs when towers, upgrades and talent branches are
 * valued on both lanes (the dual route ledger): the larger of the air share
 * of the defence spend (`resolveAirThreatShare`, which drops to 0 while the
 * air lane holds and the maze does not) and the expected threat share of the
 * fliers (`toAirThreatShare` of `DefenceAssessment.expectedAirHealthShare`),
 * so a held air lane still counts for the fliers it has to keep holding.
 */
export function resolveAirLaneWeight(context: DecisionContext): number {
  const expected = toAirThreatShare(context.defence?.expectedAirHealthShare ?? 0);
  return Math.max(resolveAirThreatShare(context), expected);
}
