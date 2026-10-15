import type { GameSpeed } from '../../../../shared/lib/game-bridge/types';

/**
 * The simulation's own clock. Phaser's `time.now` keeps counting real
 * milliseconds while the match is paused or sped up, so everything that
 * schedules against "now" (spawn timers, the auto-start countdown) reads this
 * clock instead, and every per-frame step receives the scaled delta it returns.
 *
 * Pure state plus functions: the headless simulation never touches it, and the
 * scene tests drive it exactly as the frame loop does.
 */
export type GameClockState = {
  /** Simulated milliseconds since the scene was created. */
  nowMs: number;
  isPaused: boolean;
  speed: GameSpeed;
};

export const DEFAULT_GAME_SPEED: GameSpeed = 1;

export function createGameClockState(): GameClockState {
  return { nowMs: 0, isPaused: false, speed: DEFAULT_GAME_SPEED };
}

/**
 * Moves the clock by one real frame and returns the simulated delta for it:
 * `0` while paused, `realDeltaMs * speed` otherwise.
 */
export function advanceGameClock(state: GameClockState, realDeltaMs: number): number {
  if (state.isPaused) {
    return 0;
  }
  const scaledDeltaMs = realDeltaMs * state.speed;
  state.nowMs += scaledDeltaMs;
  return scaledDeltaMs;
}

export function isGameSpeed(value: unknown): value is GameSpeed {
  return value === 1 || value === 2;
}
