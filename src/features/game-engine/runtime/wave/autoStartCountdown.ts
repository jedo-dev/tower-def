/**
 * Whole seconds until the wave auto-starts, as the HUD shows them. The clock
 * runs on fractional frame deltas, so the raw difference carries sub-millisecond
 * noise; rounding to whole milliseconds first keeps a freshly armed 30 s timer
 * from reading 31. Never negative: a timer in the past reads 0.
 */
export function resolveAutoStartSecondsLeft(
  nextWaveStartsAtMs: number | null,
  nowMs: number,
): number | null {
  if (nextWaveStartsAtMs === null) {
    return null;
  }

  return Math.max(0, Math.ceil(Math.round(nextWaveStartsAtMs - nowMs) / 1000));
}
