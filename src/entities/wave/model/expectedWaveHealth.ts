import { UnitMoveType } from '../../../shared/types/content-ids';
import type { UnitConfig } from '../../unit';
import {
  getTierBiasWeights,
  getWaveBudget,
  getWaveFallbackUnit,
  getWaveUnitCap,
  getWaveUnitValue,
  isTierUnlocked,
} from './generateWaveUnits';
import { WAVE_UNIT_COUNT_BOUNDS } from './waveBalance';

/** Authored hit points a baseline wave is expected to field, over every roll. */
export type ExpectedWaveHealth = {
  totalHealth: number;
  /** The part of `totalHealth` that flies. */
  airHealth: number;
};

const NO_WAVE: ExpectedWaveHealth = { totalHealth: 0, airHealth: 0 };

/** Probability mass of the draws that reach each remaining budget after a number of picks. */
type BudgetLayer = Map<number, number>;

/**
 * The exact expectation of what `generateWaveUnits` fields in wave
 * `waveNumber` from `factionUnits`, over the random draws: a walk over
 * (remaining budget, units picked) carrying the probability of each state,
 * every draw split by the tier-bias weights of the units still affordable,
 * and the fallback padding to the minimum count where a draw ends short.
 * Fliers cost `WAVE_AIR_UNIT_BUDGET_MULTIPLIER` times their tier, so they
 * are rarer than walkers of their tier, which this counts as the wave does.
 * Health is authored (before the wave's growth, which scales every creature
 * alike). Pure and deterministic; a few thousand states at most.
 */
export function computeExpectedWaveHealth(
  waveNumber: number,
  factionUnits: readonly UnitConfig[],
): ExpectedWaveHealth {
  if (factionUnits.length === 0) {
    return NO_WAVE;
  }
  const unitCap = getWaveUnitCap(waveNumber);
  const unlocked = factionUnits.filter((unit) => isTierUnlocked(unit, waveNumber));
  const fallback = getWaveFallbackUnit(factionUnits);
  const fallbackFlies = fallback.moveType === UnitMoveType.AIR;
  let totalHealth = 0;
  let airHealth = 0;
  let layer: BudgetLayer = new Map([[getWaveBudget(waveNumber), 1]]);

  for (let picked = 0; layer.size > 0; picked += 1) {
    const next: BudgetLayer = new Map();
    for (const [budget, probability] of layer) {
      const affordable =
        budget > 0 && picked < unitCap
          ? unlocked.filter((unit) => getWaveUnitValue(unit) <= budget)
          : [];
      if (affordable.length === 0) {
        const padding = Math.max(0, WAVE_UNIT_COUNT_BOUNDS.min - picked) * fallback.health;
        totalHealth += probability * padding;
        airHealth += fallbackFlies ? probability * padding : 0;
        continue;
      }
      const weighted = getTierBiasWeights(affordable);
      const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
      for (const { unit, weight } of weighted) {
        const share = (probability * weight) / totalWeight;
        totalHealth += share * unit.health;
        airHealth += unit.moveType === UnitMoveType.AIR ? share * unit.health : 0;
        const remaining = budget - getWaveUnitValue(unit);
        next.set(remaining, (next.get(remaining) ?? 0) + share);
      }
    }
    layer = next;
  }

  return { totalHealth, airHealth };
}
