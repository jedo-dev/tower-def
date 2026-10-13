import { WAVE_HEALTH_GROWTH } from './waveBalance';

const FIRST_WAVE = 1;

/** Health multiplier of creatures spawned in `waveNumber`; 1 for the first wave. */
export function getWaveHealthMultiplier(waveNumber: number): number {
  const wavesGrown = Math.max(0, waveNumber - FIRST_WAVE);
  return (1 + WAVE_HEALTH_GROWTH.growthPerWave) ** wavesGrown;
}

/** Authored health scaled to the wave a creature spawns in, rounded to whole points. */
export function scaleHealthForWave(health: number, waveNumber: number): number {
  return Math.round(health * getWaveHealthMultiplier(waveNumber));
}
