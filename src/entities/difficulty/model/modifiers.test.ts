import { describe, expect, it } from 'vitest';
import { difficulties } from './config/difficulties';
import { Difficulty } from './types';
import { getDifficultyConfig, scaleCreepStats, scaleReward, scaleStartingGold } from './modifiers';

describe('difficulty modifiers', () => {
  it('resolves every declared difficulty', () => {
    for (const config of difficulties) {
      expect(getDifficultyConfig(config.id).id).toBe(config.id);
    }
  });

  it('falls back to the default config for an unknown difficulty', () => {
    expect(getDifficultyConfig('LUDICROUS' as Difficulty).id).toBe(Difficulty.NORMAL);
  });

  it('scales starting gold per preset', () => {
    expect(scaleStartingGold(500, Difficulty.EASY)).toBe(750);
    expect(scaleStartingGold(500, Difficulty.NORMAL)).toBe(500);
    expect(scaleStartingGold(500, Difficulty.HARD)).toBe(400);
    expect(scaleStartingGold(500, Difficulty.NIGHTMARE)).toBe(300);
  });

  it('scales rewards per preset', () => {
    expect(scaleReward(20, Difficulty.EASY)).toBe(25);
    expect(scaleReward(20, Difficulty.NORMAL)).toBe(20);
    expect(scaleReward(20, Difficulty.NIGHTMARE)).toBe(14);
  });

  it('makes creeps tougher and faster on higher presets', () => {
    const base = { health: 100, speed: 1.5 };

    const easy = scaleCreepStats(base, Difficulty.EASY);
    const normal = scaleCreepStats(base, Difficulty.NORMAL);
    const nightmare = scaleCreepStats(base, Difficulty.NIGHTMARE);

    expect(easy.health).toBeLessThan(normal.health);
    expect(nightmare.health).toBeGreaterThan(normal.health);
    expect(easy.speed).toBeLessThan(normal.speed);
    expect(nightmare.speed).toBeGreaterThan(normal.speed);
    expect(normal).toEqual(base);
  });

  it('keeps creep speed fractional instead of rounding it away', () => {
    // Unit speeds live around 1.0-1.5, so integer rounding would flatten every
    // preset onto the same value.
    const scaled = scaleCreepStats({ health: 40, speed: 1.2 }, Difficulty.EASY);

    expect(scaled.speed).toBeCloseTo(0.96, 2);
    expect(Number.isInteger(scaled.speed)).toBe(false);
  });

  it('never produces a stalled or zero-health creep', () => {
    const scaled = scaleCreepStats({ health: 1, speed: 0.05 }, Difficulty.EASY);

    expect(scaled.health).toBeGreaterThanOrEqual(1);
    expect(scaled.speed).toBeGreaterThanOrEqual(0.1);
  });
});
