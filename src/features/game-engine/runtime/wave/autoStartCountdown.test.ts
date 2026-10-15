import { describe, expect, it } from 'vitest';
import { resolveAutoStartSecondsLeft } from './autoStartCountdown';

describe('resolveAutoStartSecondsLeft', () => {
  it('is null without an armed timer', () => {
    expect(resolveAutoStartSecondsLeft(null, 1_000)).toBeNull();
  });

  it('rounds a freshly armed timer to its full delay despite clock noise', () => {
    const nowMs = 1000 / 60 + 1000 / 60 + 1000 / 60;
    expect(resolveAutoStartSecondsLeft(nowMs + 30_000, nowMs)).toBe(30);
    expect(resolveAutoStartSecondsLeft(nowMs + 30_000 + 1e-9, nowMs)).toBe(30);
  });

  it('counts partial seconds up and never goes below zero', () => {
    expect(resolveAutoStartSecondsLeft(4_300, 1_000)).toBe(4);
    expect(resolveAutoStartSecondsLeft(1_001, 1_000)).toBe(1);
    expect(resolveAutoStartSecondsLeft(500, 1_000)).toBe(0);
  });
});
