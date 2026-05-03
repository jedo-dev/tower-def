import { describe, expect, it } from 'vitest';
import { undeadUnits } from '../../unit';
import { generateWaveUnits } from './generateWaveUnits';

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
