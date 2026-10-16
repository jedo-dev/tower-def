import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { UnitTier } from '../../unit/model/types';
import { SEND_CREEP_COST_BY_TIER } from './balance';
import { sendCreep } from './lifecycle';
import { isFreeSend, resolveSendCost } from './sendEconomy';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

const TIER_1_COST = SEND_CREEP_COST_BY_TIER[UnitTier.TIER_1];

describe('freeNthSend helpers', () => {
  it('makes every Nth send free, counting the sends so far', () => {
    expect([0, 1, 2, 3, 4, 5].map((sentSoFar) => isFreeSend(3, sentSoFar))).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(isFreeSend(undefined, 2)).toBe(false);
    expect(resolveSendCost(50, 2, 1)).toBe(0);
    expect(resolveSendCost(50, 2, 0)).toBe(50);
    expect(resolveSendCost(50, undefined, 1)).toBe(50);
  });
});

describe('sendCreep with freeNthSend', () => {
  function sendTimes(
    state: DuelMatchState,
    isPlayer: boolean,
    times: number,
    freeNthSend?: number,
  ) {
    let next = state;
    const costs: number[] = [];
    for (let send = 0; send < times; send += 1) {
      const result = sendCreep(next, isPlayer, 'undead_skeleton', UnitTier.TIER_1, {
        freeNthSend,
      });
      next = result.state;
      costs.push(result.cost);
    }
    return { state: next, costs };
  }

  it('charges nothing for every Nth send of the unit, per side', () => {
    const start = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
    const player = sendTimes(start, true, 4, 2);

    expect(player.costs).toEqual([TIER_1_COST, 0, TIER_1_COST, 0]);
    expect(player.state.player.gold).toBe(start.player.gold - 2 * TIER_1_COST);
    expect(player.state.player.sendCountByUnit).toEqual({ undead_skeleton: 4 });

    // The computer's count is its own.
    const computer = sendTimes(player.state, false, 1, 2);
    expect(computer.costs).toEqual([TIER_1_COST]);
    expect(computer.state.opponent.sendCountByUnit).toEqual({ undead_skeleton: 1 });
  });

  it('keeps the duel state shape unchanged without the ability', () => {
    const start = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
    const { state, costs } = sendTimes(start, true, 2);

    expect(costs).toEqual([TIER_1_COST, TIER_1_COST]);
    expect(state.player).not.toHaveProperty('sendCountByUnit');
  });

  it('lets a free send through on an empty purse', () => {
    const start = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
    const broke: DuelMatchState = {
      ...start,
      player: { ...start.player, gold: 0, sendCountByUnit: { undead_skeleton: 1 } },
    };
    const result = sendCreep(broke, true, 'undead_skeleton', UnitTier.TIER_1, { freeNthSend: 2 });

    expect(result.sent).toBe(true);
    expect(result.cost).toBe(0);
    expect(result.state.player.gold).toBe(0);
  });
});
