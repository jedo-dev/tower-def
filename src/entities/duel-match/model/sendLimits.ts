import type { UnitId, UnitTier } from '../../unit/model/types';
import { DUEL_MATCH_BALANCE } from './balance';
import { lookupTierValue } from './sendEconomy';
import type { DuelSendLimitRejectionReason } from './types';

/**
 * Send limits shared by both duel sides. The queue a side builds during the
 * build phase is exactly what it sends next wave and is cleared when the wave
 * starts, so counting the queue is counting this wave's sends: the limits reset
 * every wave without any extra bookkeeping.
 */
export type SendLimitCheck =
  | { allowed: true }
  | { allowed: false; reason: DuelSendLimitRejectionReason; limit: number };

export function getSendCapPerWave(): number {
  return DUEL_MATCH_BALANCE.sendCapPerWave;
}

export function getUnitTypeSendCapByTier(tier: UnitTier): number {
  return lookupTierValue(DUEL_MATCH_BALANCE.sendUnitTypeCapByTier, tier);
}

export function countQueuedSendsOfUnit(queue: readonly UnitId[], unitId: UnitId): number {
  let count = 0;
  for (const queuedUnitId of queue) {
    if (queuedUnitId === unitId) {
      count += 1;
    }
  }
  return count;
}

export function countRemainingWaveSends(queue: readonly UnitId[]): number {
  return Math.max(0, getSendCapPerWave() - queue.length);
}

/** How many more of this unit fit this wave under both the total and the type cap. */
export function countRemainingSendsOfUnit(
  queue: readonly UnitId[],
  unitId: UnitId,
  tier: UnitTier,
): number {
  const remainingOfType = Math.max(
    0,
    getUnitTypeSendCapByTier(tier) - countQueuedSendsOfUnit(queue, unitId),
  );
  return Math.min(countRemainingWaveSends(queue), remainingOfType);
}

export function checkSendLimits(
  queue: readonly UnitId[],
  unitId: UnitId,
  tier: UnitTier,
): SendLimitCheck {
  if (countRemainingWaveSends(queue) <= 0) {
    return { allowed: false, reason: 'wave_send_cap', limit: getSendCapPerWave() };
  }

  const unitTypeCap = getUnitTypeSendCapByTier(tier);
  if (countQueuedSendsOfUnit(queue, unitId) >= unitTypeCap) {
    return { allowed: false, reason: 'unit_type_send_cap', limit: unitTypeCap };
  }

  return { allowed: true };
}
