import { UnitTier, type UnitConfig } from '../../unit';
import {
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

function getUnitValue(unit: UnitConfig): number {
  return WAVE_TIER_VALUE_BY_TIER[unit.tier];
}

function isTierUnlocked(unit: UnitConfig, waveNumber: number): boolean {
  return WAVE_TIER_UNLOCK_WAVE[unit.tier] <= waveNumber;
}

function pickUnitWithTierBias(candidates: UnitConfig[], random: () => number): UnitConfig {
  const sorted = [...candidates].sort((left, right) => right.tier - left.tier);
  const weighted = sorted.map((unit, index) => ({
    unit,
    weight: sorted.length - index,
  }));
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
    const affordable = unlocked.filter((unit) => getUnitValue(unit) <= remainingBudget);
    if (affordable.length === 0) {
      break;
    }

    const picked = pickUnitWithTierBias(affordable, random);
    units.push(picked);
    remainingBudget -= getUnitValue(picked);
  }

  const fallbackPool = input.factionUnits.filter((unit) => unit.tier === UnitTier.TIER_1);
  const fallbackUnit = fallbackPool[0] ?? input.factionUnits[0];

  while (units.length < WAVE_UNIT_COUNT_BOUNDS.min) {
    units.push(fallbackUnit);
  }

  return units;
}
