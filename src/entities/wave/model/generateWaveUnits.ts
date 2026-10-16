import { UnitMoveType } from '../../../shared/types/content-ids';
import { UnitTier, type UnitConfig } from '../../unit';
import {
  WAVE_AIR_UNIT_BUDGET_MULTIPLIER,
  WAVE_BUDGET_CURVE,
  WAVE_TIER_UNLOCK_WAVE,
  WAVE_TIER_VALUE_BY_TIER,
  WAVE_UNIT_COUNT_BOUNDS,
} from './waveBalance';

export type GenerateWaveUnitsInput = {
  waveNumber: number;
  factionUnits: UnitConfig[];
  random?: () => number;
};

/** Tier points the wave may spend. */
export function getWaveBudget(waveNumber: number): number {
  const { base, perWave, perWaveSquared } = WAVE_BUDGET_CURVE;
  return Math.floor(base + perWave * waveNumber + perWaveSquared * waveNumber * waveNumber);
}

/** Most creatures the wave may field. */
export function getWaveUnitCap(waveNumber: number): number {
  const { capBase, capPerWave, max } = WAVE_UNIT_COUNT_BOUNDS;
  return Math.min(max, Math.floor(capBase + capPerWave * waveNumber));
}

/** Tier points a creature consumes; fliers cost more (`WAVE_AIR_UNIT_BUDGET_MULTIPLIER`). */
export function getWaveUnitValue(unit: Pick<UnitConfig, 'tier' | 'moveType'>): number {
  const tierValue = WAVE_TIER_VALUE_BY_TIER[unit.tier];
  return unit.moveType === UnitMoveType.AIR
    ? tierValue * WAVE_AIR_UNIT_BUDGET_MULTIPLIER
    : tierValue;
}

export function isTierUnlocked(unit: UnitConfig, waveNumber: number): boolean {
  return WAVE_TIER_UNLOCK_WAVE[unit.tier] <= waveNumber;
}

export type WeightedWaveUnit = { unit: UnitConfig; weight: number };

/**
 * The pick weights of one draw among `candidates`: highest tier first, the
 * first gets `candidates.length`, the last 1. A draw picks a unit with
 * probability weight over the total weight.
 */
export function getTierBiasWeights(candidates: readonly UnitConfig[]): WeightedWaveUnit[] {
  const sorted = [...candidates].sort((left, right) => right.tier - left.tier);
  return sorted.map((unit, index) => ({
    unit,
    weight: sorted.length - index,
  }));
}

function pickUnitWithTierBias(candidates: UnitConfig[], random: () => number): UnitConfig {
  const weighted = getTierBiasWeights(candidates);
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const roll = random() * totalWeight;
  let cumulative = 0;

  for (const item of weighted) {
    cumulative += item.weight;
    if (roll <= cumulative) {
      return item.unit;
    }
  }

  return weighted[weighted.length - 1].unit;
}

/** The creature that pads a wave up to its minimum count: the first tier 1, else the first unit. */
export function getWaveFallbackUnit(factionUnits: readonly UnitConfig[]): UnitConfig {
  return factionUnits.find((unit) => unit.tier === UnitTier.TIER_1) ?? factionUnits[0];
}

export function generateWaveUnits(input: GenerateWaveUnitsInput): UnitConfig[] {
  if (input.factionUnits.length === 0) {
    return [];
  }

  const random = input.random ?? Math.random;
  const unitCap = getWaveUnitCap(input.waveNumber);
  const unlocked = input.factionUnits.filter((unit) => isTierUnlocked(unit, input.waveNumber));
  let remainingBudget = getWaveBudget(input.waveNumber);
  const units: UnitConfig[] = [];

  while (remainingBudget > 0 && units.length < unitCap) {
    const affordable = unlocked.filter((unit) => getWaveUnitValue(unit) <= remainingBudget);
    if (affordable.length === 0) {
      break;
    }

    const picked = pickUnitWithTierBias(affordable, random);
    units.push(picked);
    remainingBudget -= getWaveUnitValue(picked);
  }

  const fallbackUnit = getWaveFallbackUnit(input.factionUnits);

  while (units.length < WAVE_UNIT_COUNT_BOUNDS.min) {
    units.push(fallbackUnit);
  }

  return units;
}
