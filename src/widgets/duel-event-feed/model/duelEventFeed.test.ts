import { describe, expect, it } from 'vitest';
import {
  appendFeedEntry,
  DUEL_EVENT_FEED_LIMIT,
  formatIncomeUpdated,
  formatOpponentHpUpdated,
  formatSendQueueUpdated,
  formatSendRejected,
  type DuelFeedEntry,
} from './duelEventFeed';

function entry(id: number): DuelFeedEntry {
  return { id, kind: 'send', text: `entry ${id}` };
}

describe('duel event feed model', () => {
  it('keeps the feed bounded to the newest entries', () => {
    let entries: DuelFeedEntry[] = [];
    for (let id = 1; id <= DUEL_EVENT_FEED_LIMIT + 3; id += 1) {
      entries = appendFeedEntry(entries, entry(id));
    }

    expect(entries).toHaveLength(DUEL_EVENT_FEED_LIMIT);
    expect(entries[0].id).toBe(4);
    expect(entries.at(-1)?.id).toBe(DUEL_EVENT_FEED_LIMIT + 3);
  });

  it('formats send queue updates per owner and skips empty queues', () => {
    expect(
      formatSendQueueUpdated({ owner: 'player', queue: [{ creepTypeId: 'undead_skeleton', index: 0 }] }),
    ).toBe('You queued a send (1 total)');
    expect(
      formatSendQueueUpdated({ owner: 'opponent', queue: [] }),
    ).toBeNull();
  });

  it('formats income deltas and skips zero deltas', () => {
    expect(formatIncomeUpdated({ owner: 'player', income: 60, delta: 10 })).toBe(
      'Your income +10 → 60',
    );
    expect(formatIncomeUpdated({ owner: 'opponent', income: 60, delta: 0 })).toBeNull();
  });

  it('formats opponent damage and ignores non-damage updates', () => {
    expect(formatOpponentHpUpdated({ hp: 18, previousHp: 20, delta: -2 })).toBe(
      'Enemy -2 HP → 18',
    );
    expect(formatOpponentHpUpdated({ hp: 20, previousHp: 20, delta: 0 })).toBeNull();
  });

  it('formats rejection reasons', () => {
    expect(
      formatSendRejected({ creepTypeId: 'x', reason: 'insufficient_gold', gold: 10, requiredGold: 50 }),
    ).toBe('Send failed: need 50 gold');
    expect(formatSendRejected({ creepTypeId: 'x', reason: 'match_over', gold: 10 })).toBe(
      'Send failed: match is over',
    );
  });
});
