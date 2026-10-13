import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { UNIT_TIERS, UnitTier, type UnitId } from '../../unit/model/types';
import { resolveUnitConfigById } from '../../unit/model/registry';
import { DUEL_MATCH_BALANCE, SEND_UNIT_TYPE_CAP_BY_TIER } from './balance';
import { clearSendQueue, sendCreep } from './lifecycle';
import {
  checkSendLimits,
  countRemainingSendsOfUnit,
  getSendCapPerWave,
  getUnitTypeSendCapByTier,
} from './sendLimits';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

const SKELETON: UnitId = 'undead_skeleton';
const GARGOYLE: UnitId = 'undead_gargoyle';

function richState(): DuelMatchState {
  const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
  return {
    ...state,
    player: { ...state.player, gold: 100_000 },
    opponent: { ...state.opponent, gold: 100_000 },
  };
}

function sendRepeatedly(
  state: DuelMatchState,
  isPlayer: boolean,
  unitIds: readonly UnitId[],
): DuelMatchState {
  let next = state;
  for (const unitId of unitIds) {
    next = sendCreep(next, isPlayer, unitId, resolveUnitConfigById(unitId).tier).state;
  }
  return next;
}

/** A wave's worth of sends that respects every per-type cap but fills the total. */
function fillWaveWithoutTypeCap(): UnitId[] {
  const ids: UnitId[] = ['undead_skeleton', 'undead_ghoul', 'undead_crypt_fiend', GARGOYLE];
  const queue: UnitId[] = [];
  for (const id of ids) {
    const cap = getUnitTypeSendCapByTier(resolveUnitConfigById(id).tier);
    for (let index = 0; index < cap && queue.length < getSendCapPerWave(); index += 1) {
      queue.push(id);
    }
  }
  return queue;
}

describe('entities/duel-match/sendLimits', () => {
  it('declares a per-type cap for every tier that never exceeds the wave cap', () => {
    for (const tier of UNIT_TIERS) {
      expect(SEND_UNIT_TYPE_CAP_BY_TIER[tier]).toBeGreaterThan(0);
      expect(SEND_UNIT_TYPE_CAP_BY_TIER[tier]).toBeLessThanOrEqual(getSendCapPerWave());
    }
    expect(getSendCapPerWave()).toBe(DUEL_MATCH_BALANCE.sendCapPerWave);
  });

  it('allows sends below both caps', () => {
    expect(checkSendLimits([], SKELETON, UnitTier.TIER_1)).toEqual({ allowed: true });
  });

  it('rejects a unit type once its tier cap is queued', () => {
    const cap = getUnitTypeSendCapByTier(UnitTier.TIER_6);
    const queue = Array.from({ length: cap }, () => GARGOYLE);

    expect(checkSendLimits(queue, GARGOYLE, UnitTier.TIER_6)).toEqual({
      allowed: false,
      reason: 'unit_type_send_cap',
      limit: cap,
    });
    expect(countRemainingSendsOfUnit(queue, GARGOYLE, UnitTier.TIER_6)).toBe(0);
    expect(checkSendLimits(queue, SKELETON, UnitTier.TIER_1)).toEqual({ allowed: true });
  });

  it('rejects any unit once the wave cap is queued', () => {
    const queue = fillWaveWithoutTypeCap();
    expect(queue).toHaveLength(getSendCapPerWave());

    expect(checkSendLimits(queue, 'undead_abomination', UnitTier.TIER_1)).toEqual({
      allowed: false,
      reason: 'wave_send_cap',
      limit: getSendCapPerWave(),
    });
  });

  for (const isPlayer of [true, false]) {
    const side = isPlayer ? 'player' : 'opponent';

    describe(`enforced on the ${side} send`, () => {
      it('stops at the per-type cap without charging gold', () => {
        const cap = getUnitTypeSendCapByTier(resolveUnitConfigById(GARGOYLE).tier);
        const filled = sendRepeatedly(
          richState(),
          isPlayer,
          Array.from({ length: cap }, () => GARGOYLE),
        );
        const result = sendCreep(filled, isPlayer, GARGOYLE, UnitTier.TIER_6);

        expect(result.sent).toBe(false);
        expect(result.rejectionReason).toBe('unit_type_send_cap');
        expect(result.state).toBe(filled);
        expect(filled[side].sendQueue).toHaveLength(cap);
      });

      it('stops at the wave cap', () => {
        const filled = sendRepeatedly(richState(), isPlayer, fillWaveWithoutTypeCap());
        const result = sendCreep(filled, isPlayer, SKELETON, UnitTier.TIER_1);

        expect(filled[side].sendQueue).toHaveLength(getSendCapPerWave());
        expect(result.sent).toBe(false);
        expect(result.rejectionReason).toBe('wave_send_cap');
      });

      it('resets when the wave takes the queue', () => {
        const filled = sendRepeatedly(richState(), isPlayer, fillWaveWithoutTypeCap());
        const nextWave = clearSendQueue(filled);
        const result = sendCreep(nextWave, isPlayer, GARGOYLE, UnitTier.TIER_6);

        expect(result.sent).toBe(true);
        expect(result.rejectionReason).toBeNull();
      });
    });
  }
});
