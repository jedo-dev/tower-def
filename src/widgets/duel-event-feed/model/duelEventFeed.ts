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

/** A new match starts with an empty feed. */
export function clearFeedEntries(): DuelFeedEntry[] {
  return [];
}

export function formatSendQueueUpdated(payload: GameEventMap['send-queue-updated']): string | null {
  if (payload.queue.length === 0) {
    return null;
  }
  return payload.owner === 'player'
    ? `You queued a send (${payload.queue.length} total)`
    : `Enemy queued a send (${payload.queue.length} total)`;
}

export function formatIncomeUpdated(payload: GameEventMap['income-updated']): string | null {
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

export function formatLivesStolen(payload: GameEventMap['lives-stolen']): string {
  return payload.thief === 'player'
    ? `Your sends stole +${payload.lives} HP → ${payload.hp}`
    : `Enemy sends stole +${payload.lives} HP → ${payload.hp}`;
}

export function formatBuildRejected(payload: GameEventMap['build-rejected']): string {
  switch (payload.reason) {
    case 'cells_occupied':
      return 'Build failed: cells occupied';
    case 'insufficient_gold':
      return 'Build failed: not enough gold';
    case 'path_blocked_small':
      return 'Build failed: blocks the path';
    case 'path_blocked_large':
      return 'Build failed: blocks the path for large creeps';
    case 'not_build_phase':
      return 'Build failed: wave in progress';
    case 'match_over':
      return 'Build failed: match is over';
    case 'opponent_view':
      return 'Build failed: switch to your field';
    default:
      return 'Build failed';
  }
}

export function formatSendRejected(payload: GameEventMap['creep-send-rejected']): string {
  switch (payload.reason) {
    case 'insufficient_gold':
      return `Send failed: need ${payload.requiredGold ?? '?'} gold`;
    case 'not_build_phase':
      return 'Send failed: wave in progress';
    case 'match_over':
      return 'Send failed: match is over';
    case 'wave_send_cap':
      return `Send failed: ${payload.sendLimit ?? '?'} sends per wave`;
    case 'unit_type_send_cap':
      return `Send failed: ${payload.sendLimit ?? '?'} of this creep per wave`;
    default:
      return 'Send failed';
  }
}
