import { describe, expect, it } from 'vitest';
import { WAVE_HEALTH_GROWTH } from './waveBalance';
import { getWaveHealthMultiplier, scaleHealthForWave } from './waveHealth';

describe('entities/wave/waveHealth', () => {
  it('leaves the first wave at authored health', () => {
    expect(getWaveHealthMultiplier(1)).toBe(1);
    expect(scaleHealthForWave(55, 1)).toBe(55);
  });

  it('compounds the growth once per wave after the first', () => {
    const growth = 1 + WAVE_HEALTH_GROWTH.growthPerWave;

    expect(getWaveHealthMultiplier(2)).toBeCloseTo(growth);
    expect(getWaveHealthMultiplier(11)).toBeCloseTo(growth ** 10);
    expect(getWaveHealthMultiplier(21)).toBeGreaterThan(getWaveHealthMultiplier(20));
  });

  it('rounds scaled health to whole points', () => {
    expect(Number.isInteger(scaleHealthForWave(55, 7))).toBe(true);
    expect(scaleHealthForWave(100, 3)).toBe(Math.round(100 * getWaveHealthMultiplier(3)));
  });
});
