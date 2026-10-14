import { describe, expect, it } from 'vitest';
import { undeadUnits, type UnitConfig } from '../../../../entities/unit';
import { createSharedBaselineWaveSource, resolveBaselineWaveSeed } from './sharedBaselineWave';

const ROUNDS = 6;

function rollRounds(seed: number): string[][] {
  const source = createSharedBaselineWaveSource(seed);
  return Array.from({ length: ROUNDS }, (_, index) =>
    source.rollNextWave(index + 1, undeadUnits).map((unit: UnitConfig) => unit.id),
  );
}

describe('shared baseline wave source', () => {
  it('replays the same baselines, round by round, for the same seed', () => {
    expect(rollRounds(42)).toEqual(rollRounds(42));
  });

  it('rolls different baselines for a different seed', () => {
    expect(rollRounds(42)).not.toEqual(rollRounds(43));
  });
});

describe('resolveBaselineWaveSeed', () => {
  it('uses a generated map seed, so the match replays like sim:duel with that seed', () => {
    expect(resolveBaselineWaveSeed({ mode: 'dynamic', seed: 1234 }, () => 0.5)).toBe(1234);
  });

  it('rolls a fresh seed on the fixed map', () => {
    expect(resolveBaselineWaveSeed({ mode: 'fixed' }, () => 0.25)).toBe(
      Math.floor(0.25 * 0x7fffffff),
    );
    expect(resolveBaselineWaveSeed(undefined, () => 0)).toBe(0);
  });
});
