import type { GameEventMap } from '../../../shared/lib/game-bridge/types';

export const DUEL_EVENT_FEED_LIMIT = 5;

export type DuelFeedEntryKind = 'send' | 'income' | 'damage' | 'rejected';

export type DuelFeedEntry = {
  id: number;
  kind: DuelFeedEntryKind;
  text: string;
};

export function appendFeedEntry(
  entries: readonly DuelFeedEntry[],
  entry: DuelFeedEntry,
  limit: number = DUEL_EVENT_FEED_LIMIT,
): DuelFeedEntry[] {
  const next = [...entries, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export function formatSendQueueUpdated(
  payload: GameEventMap['send-queue-updated'],
): string | null {
  if (payload.queue.length === 0) {
    return null;
  }
  return payload.owner === 'player'
    ? `You queued a send (${payload.queue.length} total)`
    : `Enemy queued a send (${payload.queue.length} total)`;
}

export function formatIncomeUpdated(
  payload: GameEventMap['income-updated'],
): string | null {
  if (payload.delta === 0) {
    return null;
  }
  const sign = payload.delta > 0 ? '+' : '';
  return payload.owner === 'player'
    ? `Your income ${sign}${payload.delta} → ${payload.income}`
    : `Enemy income ${sign}${payload.delta} → ${payload.income}`;
}

export function formatOpponentHpUpdated(
  payload: GameEventMap['opponent-hp-updated'],
): string | null {
  if (payload.delta >= 0) {
    return null;
  }
  return `Enemy ${payload.delta} HP → ${payload.hp}`;
}

export function formatSendRejected(
  payload: GameEventMap['creep-send-rejected'],
): string {
  switch (payload.reason) {
    case 'insufficient_gold':
      return `Send failed: need ${payload.requiredGold ?? '?'} gold`;
    case 'not_build_phase':
      return 'Send failed: wave in progress';
    case 'match_over':
      return 'Send failed: match is over';
    default:
      return 'Send failed';
  }
}
