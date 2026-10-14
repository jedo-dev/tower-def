import { describe, expect, it } from 'vitest';
import { UnitMoveType } from '../../../shared/types/content-ids';
import { UnitTier, undeadUnits } from '../../unit';
import {
  generateWaveUnits,
  getWaveBudget,
  getWaveUnitCap,
  getWaveUnitValue,
} from './generateWaveUnits';
import {
  WAVE_AIR_UNIT_BUDGET_MULTIPLIER,
  WAVE_TIER_UNLOCK_WAVE,
  WAVE_UNIT_COUNT_BOUNDS,
} from './waveBalance';

describe('generateWaveUnits', () => {
  it('returns at least five units for early waves', () => {
    const units = generateWaveUnits({
      waveNumber: 1,
      factionUnits: undeadUnits,
      random: () => 0.5,
    });

    expect(units.length).toBeGreaterThanOrEqual(5);
  });

  it('prefers higher tiers when random allows', () => {
    const units = generateWaveUnits({
      waveNumber: 8,
      factionUnits: undeadUnits,
      random: () => 0,
    });

    const hasHigherTier = units.some((unit) => unit.tier >= 3);
    expect(hasHigherTier).toBe(true);
  });
});

describe('generateWaveUnits curve', () => {
  it('keeps a tier out of the waves before it unlocks', () => {
    for (let waveNumber = 1; waveNumber <= 20; waveNumber += 1) {
      const units = generateWaveUnits({ waveNumber, factionUnits: undeadUnits, random: () => 0 });

      for (const unit of units) {
        expect(
          WAVE_TIER_UNLOCK_WAVE[unit.tier],
          `${unit.id} in wave ${waveNumber}`,
        ).toBeLessThanOrEqual(waveNumber);
      }
    }
  });

  it('opens on tier 1 fodder and brings the top tier once it unlocks', () => {
    const opening = generateWaveUnits({
      waveNumber: 1,
      factionUnits: undeadUnits,
      random: () => 0,
    });
    const late = generateWaveUnits({
      waveNumber: WAVE_TIER_UNLOCK_WAVE[UnitTier.TIER_6],
      factionUnits: undeadUnits,
      random: () => 0,
    });

    expect(opening.every((unit) => unit.tier === UnitTier.TIER_1)).toBe(true);
    expect(late.some((unit) => unit.tier === UnitTier.TIER_6)).toBe(true);
  });

  it('grows the budget faster than linearly and the creature cap up to its ceiling', () => {
    const steps = [1, 10, 20, 30].map(getWaveBudget);

    expect(steps[1] - steps[0]).toBeLessThan(steps[2] - steps[1]);
    expect(steps[2] - steps[1]).toBeLessThan(steps[3] - steps[2]);
    expect(getWaveUnitCap(1)).toBeLessThan(getWaveUnitCap(20));
    expect(getWaveUnitCap(1_000)).toBe(WAVE_UNIT_COUNT_BOUNDS.max);
  });

  it('never exceeds the creature cap of its wave', () => {
    for (let waveNumber = 1; waveNumber <= 40; waveNumber += 1) {
      const units = generateWaveUnits({
        waveNumber,
        factionUnits: undeadUnits,
        random: () => 0.99,
      });

      expect(units.length).toBeLessThanOrEqual(getWaveUnitCap(waveNumber));
    }
  });

  it('charges a flier more of the budget than a ground creature of its tier', () => {
    const gargoyle = undeadUnits.find((unit) => unit.id === 'undead_gargoyle');
    expect(gargoyle?.moveType).toBe(UnitMoveType.AIR);
    if (!gargoyle) return;

    const grounded = { ...gargoyle, moveType: UnitMoveType.GROUND };
    expect(getWaveUnitValue(gargoyle)).toBe(
      getWaveUnitValue(grounded) * WAVE_AIR_UNIT_BUDGET_MULTIPLIER,
    );

    // A wave rich enough to exceed the five-creature floor fields fewer fliers than walkers.
    const roll = () => 0;
    const waveNumber = WAVE_TIER_UNLOCK_WAVE[gargoyle.tier] + 7;
    const fliers = generateWaveUnits({ waveNumber, factionUnits: [gargoyle], random: roll });
    const walkers = generateWaveUnits({ waveNumber, factionUnits: [grounded], random: roll });
    expect(fliers.length).toBeLessThan(walkers.length);
  });
});
