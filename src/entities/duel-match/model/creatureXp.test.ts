import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { UnitTier } from '../../unit/model/types';
import {
  accrueSentCreepXp,
  collectSentDeathTiers,
  collectSentLeaks,
  getSentCreepTier,
  NO_SENT_CREEP_OUTCOMES,
  NO_SENT_CREEP_OUTCOMES_ON_FIELD,
} from './creatureXp';
import { settleRound } from './lifecycle';
import { createInitialDuelMatchState } from './state';

const STATE = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

describe('sent creep facts', () => {
  it('reads the tier of a sent creep only', () => {
    expect(getSentCreepTier({ status: 'dead', sender: 'player', sentTier: 3 })).toBe(3);
    expect(getSentCreepTier({ status: 'dead', sentTier: 3 })).toBeUndefined();
    expect(getSentCreepTier({ status: 'dead', sender: 'player' })).toBeUndefined();
    expect(getSentCreepTier({ status: 'dead', sender: 'player', sentTier: 9 })).toBeUndefined();
  });

  it('collects the tiers of sent deaths and leaks in field order', () => {
    const creeps = [
      { status: 'escaped' as const, sender: 'player' as const, sentTier: 2 },
      { status: 'dead' as const, sender: 'player' as const, sentTier: 1 },
      { status: 'escaped' as const },
      { status: 'alive' as const, sender: 'player' as const, sentTier: 4 },
      {
        status: 'escaped' as const,
        sender: 'player' as const,
        sentTier: 1,
        abilities: { leakLivesTaken: 2 },
      },
    ];

    expect(collectSentLeaks(creeps)).toEqual([
      { tier: 2, lives: 1 },
      { tier: 1, lives: 2 },
    ]);
    expect(collectSentDeathTiers(creeps)).toEqual([1]);
  });
});

describe('accrueSentCreepXp', () => {
  it('credits the sender of each field: deaths 1 x tier, leaks 3 x tier + 2 for a life', () => {
    const next = accrueSentCreepXp(
      STATE,
      {
        onPlayerField: { diedTiers: [UnitTier.TIER_1], leaks: [] },
        onOpponentField: {
          diedTiers: [UnitTier.TIER_2, UnitTier.TIER_2],
          leaks: [{ tier: UnitTier.TIER_3, lives: 1 }],
        },
      },
      { onPlayerField: 0, onOpponentField: 1 },
    );

    expect(next.opponent.creatureXpByTier).toEqual({ 1: 1 });
    expect(next.player.creatureXpByTier).toEqual({ 2: 4, 3: 11 });
  });

  it('gives the life bonus only to as many leaks as lives were taken', () => {
    const next = accrueSentCreepXp(
      STATE,
      {
        onPlayerField: NO_SENT_CREEP_OUTCOMES_ON_FIELD,
        onOpponentField: {
          diedTiers: [],
          leaks: [
            { tier: UnitTier.TIER_1, lives: 1 },
            { tier: UnitTier.TIER_1, lives: 1 },
          ],
        },
      },
      { onPlayerField: 0, onOpponentField: 1 },
    );

    expect(next.player.creatureXpByTier).toEqual({ 1: 3 + 2 + 3 });
  });

  it('weighs each leak by the lives it takes when handing out the bonus', () => {
    const next = accrueSentCreepXp(
      STATE,
      {
        onPlayerField: NO_SENT_CREEP_OUTCOMES_ON_FIELD,
        onOpponentField: {
          diedTiers: [],
          leaks: [
            { tier: UnitTier.TIER_3, lives: 2 },
            { tier: UnitTier.TIER_1, lives: 1 },
          ],
        },
      },
      { onPlayerField: 0, onOpponentField: 2 },
    );

    expect(next.player.creatureXpByTier).toEqual({ 3: 9 + 2, 1: 3 });
  });

  it('returns the same state when nothing was sent', () => {
    expect(
      accrueSentCreepXp(STATE, NO_SENT_CREEP_OUTCOMES, { onPlayerField: 0, onOpponentField: 0 }),
    ).toBe(STATE);
  });
});

describe('settleRound creature experience', () => {
  it('credits sends through the settle with the lives they took', () => {
    const settlement = settleRound(
      STATE,
      0,
      2,
      { onPlayerField: 0, onOpponentField: 2 },
      undefined,
      {
        onPlayerField: { diedTiers: [UnitTier.TIER_4], leaks: [] },
        onOpponentField: {
          diedTiers: [],
          leaks: [
            { tier: UnitTier.TIER_2, lives: 1 },
            { tier: UnitTier.TIER_2, lives: 1 },
          ],
        },
      },
    );

    expect(settlement.state.player.creatureXpByTier).toEqual({ 2: 2 * (6 + 2) });
    expect(settlement.state.opponent.creatureXpByTier).toEqual({ 4: 4 });
  });

  it('withholds the bonus from leaks past the defender last life', () => {
    const nearlyOut = { ...STATE, opponent: { ...STATE.opponent, hp: 1 } };
    const settlement = settleRound(
      nearlyOut,
      0,
      2,
      { onPlayerField: 0, onOpponentField: 2 },
      undefined,
      {
        onPlayerField: NO_SENT_CREEP_OUTCOMES_ON_FIELD,
        onOpponentField: {
          diedTiers: [],
          leaks: [
            { tier: UnitTier.TIER_1, lives: 1 },
            { tier: UnitTier.TIER_1, lives: 1 },
          ],
        },
      },
    );

    expect(settlement.isMatchOver).toBe(true);
    expect(settlement.state.player.creatureXpByTier).toEqual({ 1: 5 + 3 });
  });

  it('keeps the experience ledger across rounds', () => {
    const withXp = {
      ...STATE,
      player: { ...STATE.player, creatureXpByTier: { 1: 7 } },
    };

    expect(settleRound(withXp, 0, 0).state.player.creatureXpByTier).toEqual({ 1: 7 });
  });
});
