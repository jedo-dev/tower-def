import { describe, expect, it } from 'vitest';
import { UnitMoveType } from '../../../shared/types/content-ids';
import { UnitTier, undeadUnits, type UnitConfig } from '../../unit';
import { computeExpectedWaveHealth } from './expectedWaveHealth';
import { generateWaveUnits } from './generateWaveUnits';
import { WAVE_TIER_UNLOCK_WAVE, WAVE_UNIT_COUNT_BOUNDS } from './waveBalance';

const SAMPLE_WAVES = 4000;

function unit(
  id: UnitConfig['id'],
  tier: UnitTier,
  moveType: UnitMoveType,
  health: number,
): UnitConfig {
  return { ...undeadUnits[0], id, tier, moveType, health };
}

const WALKER = unit('undead_skeleton', UnitTier.TIER_1, UnitMoveType.GROUND, 100);
const BRUTE = unit('undead_ghoul', UnitTier.TIER_2, UnitMoveType.GROUND, 220);
const FLIER = unit('undead_gargoyle', UnitTier.TIER_2, UnitMoveType.AIR, 300);
const ROSTER = [WALKER, BRUTE, FLIER];

/** A deterministic uniform stream for the sampled reference. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleWaveHealth(waveNumber: number, roster: UnitConfig[]) {
  const random = seededRandom(waveNumber * 31 + 7);
  let totalHealth = 0;
  let airHealth = 0;
  for (let wave = 0; wave < SAMPLE_WAVES; wave += 1) {
    for (const drawn of generateWaveUnits({ waveNumber, factionUnits: roster, random })) {
      totalHealth += drawn.health;
      airHealth += drawn.moveType === UnitMoveType.AIR ? drawn.health : 0;
    }
  }
  return { totalHealth: totalHealth / SAMPLE_WAVES, airHealth: airHealth / SAMPLE_WAVES };
}

describe('entities/wave computeExpectedWaveHealth', () => {
  it('matches the mean of many rolled waves', () => {
    for (const waveNumber of [3, 6, 12, 20]) {
      const exact = computeExpectedWaveHealth(waveNumber, ROSTER);
      const sampled = sampleWaveHealth(waveNumber, ROSTER);
      expect(exact.totalHealth / sampled.totalHealth, `wave ${waveNumber}`).toBeCloseTo(1, 1);
      expect(exact.airHealth / exact.totalHealth, `wave ${waveNumber}`).toBeCloseTo(
        sampled.airHealth / sampled.totalHealth,
        1,
      );
    }
  });

  it('expects no fliers before their tier unlocks', () => {
    const early = computeExpectedWaveHealth(WAVE_TIER_UNLOCK_WAVE[UnitTier.TIER_2] - 1, ROSTER);
    expect(early.airHealth).toBe(0);
    expect(early.totalHealth).toBeGreaterThan(0);
  });

  it('charges a flier its budget multiplier, so it fields fewer hit points than a walker of its tier', () => {
    const waveNumber = 12;
    // A weightless filler, so the totals are the tier 2 creature's hit points alone.
    const filler = { ...WALKER, health: 0 };
    const asFlier = computeExpectedWaveHealth(waveNumber, [filler, FLIER]);
    const asWalker = computeExpectedWaveHealth(waveNumber, [
      filler,
      { ...FLIER, moveType: UnitMoveType.GROUND },
    ]);
    expect(asFlier.airHealth).toBe(asFlier.totalHealth);
    expect(asWalker.airHealth).toBe(0);
    expect(asFlier.airHealth).toBeLessThan(asWalker.totalHealth);
  });

  it('pads a short wave with the fallback creature, by its move type', () => {
    const lone = unit('undead_banshee', UnitTier.TIER_1, UnitMoveType.AIR, 50);
    const expected = computeExpectedWaveHealth(1, [lone]);
    expect(expected.totalHealth).toBe(WAVE_UNIT_COUNT_BOUNDS.min * lone.health);
    expect(expected.airHealth).toBe(expected.totalHealth);
  });

  it('expects nothing from an empty roster and repeats itself', () => {
    expect(computeExpectedWaveHealth(10, [])).toEqual({ totalHealth: 0, airHealth: 0 });
    expect(computeExpectedWaveHealth(18, undeadUnits)).toEqual(
      computeExpectedWaveHealth(18, undeadUnits),
    );
  });
});
