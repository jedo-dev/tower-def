import { UnitTier, type UnitConfig } from '../../unit';

const MIN_WAVE_UNITS = 5;
const MAX_WAVE_UNITS = 14;
const TIER_VALUE_BY_TIER: Record<UnitTier, number> = {
  [UnitTier.TIER_1]: 1,
  [UnitTier.TIER_2]: 2,
  [UnitTier.TIER_3]: 3,
  [UnitTier.TIER_4]: 5,
  [UnitTier.TIER_5]: 7,
  [UnitTier.TIER_6]: 10,
};

export type GenerateWaveUnitsInput = {
  waveNumber: number;
  factionUnits: UnitConfig[];
  random?: () => number;
};

function getWaveValueByNumber(waveNumber: number): number {
  return 8 + waveNumber * 3;
}

function getUnitValue(unit: UnitConfig): number {
  return TIER_VALUE_BY_TIER[unit.tier];
}

function pickUnitWithTierBias(
  candidates: UnitConfig[],
  random: () => number,
): UnitConfig {
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
  const budget = getWaveValueByNumber(input.waveNumber);
  let remainingBudget = budget;
  const units: UnitConfig[] = [];

  while (remainingBudget > 0 && units.length < MAX_WAVE_UNITS) {
    const affordable = input.factionUnits.filter((unit) => getUnitValue(unit) <= remainingBudget);
    if (affordable.length === 0) {
      break;
    }

    const picked = pickUnitWithTierBias(affordable, random);
    units.push(picked);
    remainingBudget -= getUnitValue(picked);
  }

  const fallbackPool = input.factionUnits.filter((unit) => unit.tier === UnitTier.TIER_1);
  const fallbackUnit = fallbackPool[0] ?? input.factionUnits[0];

  while (units.length < MIN_WAVE_UNITS && units.length < MAX_WAVE_UNITS) {
    units.push(fallbackUnit);
  }

  return units;
}
