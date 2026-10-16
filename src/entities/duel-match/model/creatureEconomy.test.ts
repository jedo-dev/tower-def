import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import type { CreatureAbilities } from '../../../shared/types/creatureAbilities';
import type { CreepEntity } from '../../creep/model/types';
import {
  chargeGold,
  chargeSideGold,
  countLeakedLives,
  countLeakedSentLives,
  getKillGoldPenalty,
  sumLeakGoldToSender,
} from './creatureEconomy';
import { settleRound } from './lifecycle';
import { createInitialDuelMatchState } from './state';

type LeakedCreep = Pick<CreepEntity, 'status' | 'sender' | 'abilities'>;

function leaked(abilities?: CreatureAbilities, sender?: 'player' | 'opponent'): LeakedCreep {
  return {
    status: 'escaped',
    ...(sender === undefined ? {} : { sender }),
    ...(abilities === undefined ? {} : { abilities }),
  };
}

describe('leak lives', () => {
  it('counts one life per leak without abilities, leakLivesTaken otherwise', () => {
    const creeps: LeakedCreep[] = [
      leaked(),
      leaked({ leakLivesTaken: 3 }, 'player'),
      leaked({ leakLivesTaken: 2 }),
      { status: 'alive', abilities: { leakLivesTaken: 5 } },
      { status: 'dead', sender: 'player' },
    ];

    expect(countLeakedLives(creeps)).toBe(6);
    expect(countLeakedSentLives(creeps)).toBe(3);
  });

  it('charges the defender and feeds the sender life steal through settleRound', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    // Two player sends, two lives each, leak on the opponent's field.
    const onOpponentField = [
      leaked({ leakLivesTaken: 2 }, 'player'),
      leaked({ leakLivesTaken: 2 }, 'player'),
    ];
    const settlement = settleRound(state, 0, countLeakedLives(onOpponentField), {
      onPlayerField: 0,
      onOpponentField: countLeakedSentLives(onOpponentField),
    });

    expect(settlement.opponentHpLost).toBe(4);
    expect(settlement.state.opponent.hp).toBe(state.opponent.hp - 4);
    expect(settlement.playerLivesStolen).toBe(2);
    expect(settlement.state.player.hp).toBe(state.player.hp + 2);
  });
});

describe('leak gold and kill penalty', () => {
  it('pays leak gold only for sent creeps that leaked', () => {
    expect(
      sumLeakGoldToSender([
        leaked({ leakGoldToSender: 4 }, 'opponent'),
        leaked({ leakGoldToSender: 6 }),
        { status: 'dead', sender: 'opponent', abilities: { leakGoldToSender: 9 } },
        leaked(undefined, 'opponent'),
      ]),
    ).toBe(4);
  });

  it('reads the kill penalty, 0 without one', () => {
    expect(getKillGoldPenalty({ abilities: { killGoldPenaltyToDefender: 7 } })).toBe(7);
    expect(getKillGoldPenalty({})).toBe(0);
  });

  it('never charges a purse below 0', () => {
    expect(chargeGold(10, 4)).toBe(6);
    expect(chargeGold(3, 4)).toBe(0);
    expect(chargeGold(3, 0)).toBe(3);

    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const charged = chargeSideGold(state, 'opponent', state.opponent.gold + 50);
    expect(charged.opponent.gold).toBe(0);
    expect(charged.player).toBe(state.player);
    expect(chargeSideGold(state, 'player', 0)).toBe(state);
  });
});
