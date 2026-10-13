import { describe, expect, it } from 'vitest';
import { difficulties } from './config/difficulties';
import { Difficulty } from './types';
import { getDifficultyConfig } from './modifiers';

describe('difficulty modifiers', () => {
  it('resolves every declared difficulty', () => {
    for (const config of difficulties) {
      expect(getDifficultyConfig(config.id).id).toBe(config.id);
    }
  });

  it('falls back to the default config for an unknown difficulty', () => {
    expect(getDifficultyConfig('LUDICROUS' as Difficulty).id).toBe(Difficulty.NORMAL);
  });

  it('never tilts the starting purse', () => {
    for (const config of difficulties) {
      expect(config).not.toHaveProperty('startingGoldModifier');
    }
  });

  it('never scales creep stats or rewards: difficulty only changes AI decisions', () => {
    for (const config of difficulties) {
      expect(Object.keys(config).sort()).toEqual(['description', 'id', 'name']);
    }
  });
});
