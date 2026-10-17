import { MAX_SLOW_TIME_GAIN } from './constants';

/** Extra time a slowed creep spends in reach, capped at `MAX_SLOW_TIME_GAIN`. */
export function slowTimeGain(slow: number): number {
  return slow > 0 ? Math.min(MAX_SLOW_TIME_GAIN, 1 / (1 - slow) - 1) : 0;
}

/**
 * Expected extra time in reach one tower's two slows add on a sample, each
 * reaching its own share of the wave: the shot's chill (`shotShare`, worth
 * `shotGain` there) and its ground zone's (`zoneShare`, `zoneGain`). A creep
 * both reach counts only the stronger slow, so they are never summed: the
 * stronger one on its share, the weaker one on the rest of the wave it reaches.
 */
export function combineOwnSlowGains(
  shotShare: number,
  shotGain: number,
  zoneShare: number,
  zoneGain: number,
): number {
  const [strongShare, strongGain, weakShare, weakGain] =
    zoneGain > shotGain
      ? [zoneShare, zoneGain, shotShare, shotGain]
      : [shotShare, shotGain, zoneShare, zoneGain];
  return strongShare * strongGain + (1 - strongShare) * weakShare * weakGain;
}
