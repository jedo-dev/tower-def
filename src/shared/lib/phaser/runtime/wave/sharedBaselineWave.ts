import type { UnitConfig } from '../../../../../entities/unit';
import { generateWaveUnits } from '../../../../../entities/wave';
import type { GameSetupEndpoints } from '../../../../config/game-setup';
import { createSeededRandom } from '../../../random/createSeededRandom';

// The neutral baseline wave is rolled once per round from one seeded stream
// and played on both battlefields, so neither duelist gets a luckier wave.
// The headless duel simulation draws its baselines from the same source: a
// generated map's seed replays the same baselines in the game and `sim:duel`.

/** Upper bound (exclusive) of a freshly rolled seed; the same range the setup page uses. */
const BASELINE_WAVE_SEED_RANGE = 0x7fffffff;

export type SharedBaselineWaveSource = {
  /** Rolls the next round's baseline. Call once per wave start, in round order. */
  rollNextWave: (waveNumber: number, factionUnits: readonly UnitConfig[]) => UnitConfig[];
};

export function createSharedBaselineWaveSource(seed: number): SharedBaselineWaveSource {
  const random = createSeededRandom(seed);
  return {
    rollNextWave: (waveNumber, factionUnits) =>
      generateWaveUnits({ waveNumber, factionUnits: [...factionUnits], random }),
  };
}

/**
 * The seed a match's baselines come from: a generated map's own seed, so the
 * match replays like `sim:duel` with that seed; a fresh roll on the fixed map,
 * so its matches do not all face the same waves.
 */
export function resolveBaselineWaveSeed(
  endpoints: GameSetupEndpoints | undefined,
  random: () => number,
): number {
  if (endpoints?.mode === 'dynamic') {
    return endpoints.seed;
  }
  return Math.floor(random() * BASELINE_WAVE_SEED_RANGE);
}
