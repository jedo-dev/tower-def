import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { DUEL_MATCH_BALANCE } from '../../../entities/duel-match';
import { RaceId } from '../../../shared/types/content-ids';
import { DEFAULT_DUEL_SIMULATION_CONFIG, type DuelSimulationConfig } from './duelSimulationConfig';
import { simulateDuel } from './simulateDuel';

const CONFIG: DuelSimulationConfig = {
  ...DEFAULT_DUEL_SIMULATION_CONFIG,
  seed: 11,
  maxRounds: 12,
};

describe('features/duel-simulation/simulateDuel', () => {
  it('replays the same duel for the same seed', () => {
    const first = simulateDuel(CONFIG);
    const second = simulateDuel(CONFIG);

    expect(second.rounds).toEqual(first.rounds);
    expect(second.winner).toBe(first.winner);
    expect(second.totalTicks).toBe(first.totalTicks);
  });

  it('resolves every wave inside the tick limit', () => {
    const result = simulateDuel(CONFIG);

    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.rounds.every((round) => !round.isWaveCutOff)).toBe(true);
    expect(result.totalTicks).toBeLessThanOrEqual(result.rounds.length * CONFIG.maxWaveTicks);
  });

  it('earns both computers creature experience from their sends, spending none yet', () => {
    const { finalState } = simulateDuel(CONFIG);

    for (const side of [finalState.player, finalState.opponent]) {
      const earned = Object.values(side.creatureXpByTier).reduce(
        (sum: number, xp) => sum + (xp ?? 0),
        0,
      );
      expect(earned).toBeGreaterThan(0);
      expect(side.creatureBranchChoices).toEqual({});
      expect(side.creatureGrades).toEqual({});
    }
  });

  it('accounts for every creep and every life', () => {
    const result = simulateDuel(CONFIG);

    for (const round of result.rounds) {
      for (const side of [round.a, round.b]) {
        expect(side.kills + side.leaks).toBe(side.spawned);
        expect(side.lives).toBeLessThanOrEqual(DUEL_MATCH_BALANCE.startingHp + round.round);
      }
    }
  });

  it('reports the gold each build phase left unspent, before bounties and income', () => {
    const result = simulateDuel(CONFIG);
    // The settlement pays no income on the round that ends the match.
    const paidRounds = result.endReason === 'lives' ? result.rounds.slice(0, -1) : result.rounds;

    expect(paidRounds.length).toBeGreaterThan(0);
    for (const round of paidRounds) {
      for (const side of [round.a, round.b]) {
        expect(side.unspentGold).toBeGreaterThanOrEqual(0);
        expect(side.unspentGold).toBeLessThanOrEqual(side.gold - side.income);
      }
    }
  });

  it('ends on lives or on the round limit, naming a winner by lives', () => {
    const result = simulateDuel(CONFIG);
    const { player, opponent } = result.finalState;

    if (result.endReason === 'lives') {
      expect(Math.min(player.hp, opponent.hp)).toBe(0);
    } else {
      expect(result.rounds).toHaveLength(CONFIG.maxRounds);
    }
    // A match on lives may end in a same-wave double knockout that the
    // settlement's tie-break decides; on the round cap only lives decide.
    const atLeast = result.endReason === 'lives' ? 'toBeGreaterThanOrEqual' : 'toBeGreaterThan';
    if (result.winner === 'A') {
      expect(player.hp)[atLeast](opponent.hp);
    }
    if (result.winner === 'B') {
      expect(opponent.hp)[atLeast](player.hp);
    }
  });

  it('plays the match on the configured baseline race, whatever the seats play', () => {
    const result = simulateDuel({
      ...CONFIG,
      maxRounds: 1,
      sideA: { difficulty: Difficulty.NORMAL, raceId: RaceId.ORC },
      sideB: { difficulty: Difficulty.NORMAL, raceId: RaceId.ELF },
      baselineRaceId: RaceId.HUMAN,
    });

    expect(result.finalState.baselineRaceId).toBe(RaceId.HUMAN);
  });

  it('plays both sides with the same planner, so a mirror match is symmetric', () => {
    const side = { difficulty: Difficulty.NORMAL, raceId: RaceId.HUMAN };
    const result = simulateDuel({ ...CONFIG, sideA: side, sideB: side, maxRounds: 3 });

    for (const round of result.rounds) {
      expect(round.a).toEqual(round.b);
    }
    expect(result.finalState.player.battlefield.towers).toEqual(
      result.finalState.opponent.battlefield.towers,
    );
  });
});
