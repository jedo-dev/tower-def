import { describe, expect, it } from 'vitest';
import { advanceGameClock, createGameClockState, isGameSpeed } from './gameClock';

describe('gameClock', () => {
  it('advances by the real delta at 1x', () => {
    const clock = createGameClockState();
    expect(advanceGameClock(clock, 16)).toBe(16);
    expect(clock.nowMs).toBe(16);
  });

  it('doubles the simulated delta at 2x', () => {
    const clock = createGameClockState();
    clock.speed = 2;
    expect(advanceGameClock(clock, 16)).toBe(32);
    expect(clock.nowMs).toBe(32);
  });

  it('does not move while paused', () => {
    const clock = createGameClockState();
    clock.nowMs = 100;
    clock.isPaused = true;
    expect(advanceGameClock(clock, 16)).toBe(0);
    expect(clock.nowMs).toBe(100);
  });

  it('accepts only the supported speeds', () => {
    expect(isGameSpeed(1)).toBe(true);
    expect(isGameSpeed(2)).toBe(true);
    expect(isGameSpeed(3)).toBe(false);
    expect(isGameSpeed('2')).toBe(false);
  });
});
