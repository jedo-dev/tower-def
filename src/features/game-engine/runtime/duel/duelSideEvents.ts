import type { DuelMatchState } from '../../../../entities/duel-match';
import type { UnitId } from '../../../../entities/unit';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { CreepSendQueueItem } from '../../../../shared/lib/game-bridge/types';

/** Pure: a side's send queue as the bridge payload lists it. */
export function toSendQueueItems(sendQueue: readonly UnitId[]): CreepSendQueueItem[] {
  return sendQueue.map((creepTypeId, index) => ({ creepTypeId, index }));
}

function areSendQueuesEqual(left: readonly UnitId[], right: readonly UnitId[]): boolean {
  return left.length === right.length && left.every((unitId, index) => unitId === right[index]);
}

/**
 * Tells the UI what the computer's build phase changed on its side: its send
 * queue and its income. Publishes on change only, once per build phase.
 */
export function publishOpponentSendChanges(previous: DuelMatchState, next: DuelMatchState): void {
  if (!areSendQueuesEqual(previous.opponent.sendQueue, next.opponent.sendQueue)) {
    publishGameEvent('send-queue-updated', {
      owner: 'opponent',
      queue: toSendQueueItems(next.opponent.sendQueue),
    });
  }

  const incomeDelta = next.opponent.income - previous.opponent.income;
  if (incomeDelta !== 0) {
    publishGameEvent('income-updated', {
      owner: 'opponent',
      income: next.opponent.income,
      delta: incomeDelta,
    });
  }
}
