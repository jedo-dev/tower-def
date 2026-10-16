import { describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { BuildRejectionReason } from '../../../shared/lib/game-bridge/types';
import {
  DUEL_EVENT_FEED_PREVIEW_LINES,
  appendFeedEntry,
  selectPreviewEntries,
  DUEL_EVENT_FEED_LIMIT,
  formatBuildRejected,
  formatIncomeUpdated,
  formatLivesStolen,
  formatOpponentHpUpdated,
  formatRoundSettled,
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
      formatSendQueueUpdated({
        owner: 'player',
        queue: [{ creepTypeId: 'undead_skeleton', index: 0 }],
      }),
    ).toBe('You queued a send (1 total)');
    expect(
      formatSendQueueUpdated({
        owner: 'opponent',
        queue: [
          { creepTypeId: 'undead_skeleton', index: 0 },
          { creepTypeId: 'undead_ghoul', index: 1 },
        ],
      }),
    ).toBe('Enemy sends 2 this wave');
    expect(formatSendQueueUpdated({ owner: 'opponent', queue: [] })).toBeNull();
  });

  it('formats income deltas and skips zero deltas', () => {
    expect(formatIncomeUpdated({ owner: 'player', income: 60, delta: 10 })).toBe(
      'Your income +10 → 60',
    );
    expect(formatIncomeUpdated({ owner: 'opponent', income: 60, delta: 0 })).toBeNull();
  });

  it('formats opponent damage and ignores non-damage updates', () => {
    expect(formatOpponentHpUpdated({ hp: 18, previousHp: 20, delta: -2 })).toBe('Enemy -2 HP → 18');
    expect(formatOpponentHpUpdated({ hp: 20, previousHp: 20, delta: 0 })).toBeNull();
  });

  it('formats stolen lives so the thief and whose total follows are unambiguous', () => {
    expect(formatLivesStolen({ thief: 'player', lives: 1, hp: 14 })).toBe(
      'You stole 1 HP (you now 14)',
    );
    expect(formatLivesStolen({ thief: 'opponent', lives: 1, hp: 14 })).toBe(
      'Enemy stole 1 HP (enemy now 14)',
    );
  });

  it('formats the player round summary with lives, bounty and income', () => {
    expect(formatRoundSettled({ round: 7, livesLost: 3, bountyEarned: 40, incomePaid: 120 })).toBe(
      'Wave 7 settled: -3 lives, +40 bounty, +120 income',
    );
    expect(formatRoundSettled({ round: 1, livesLost: 0, bountyEarned: 0, incomePaid: 0 })).toBe(
      'Wave 1 settled: -0 lives, +0 bounty, +0 income',
    );
  });

  it('formats every build rejection reason as a "Build failed" line', () => {
    const anchor = { x: 4, y: 6 };
    const towerType = TowerTypeId.SINGLE;
    const lines: Record<BuildRejectionReason, string> = {
      cells_occupied: 'Build failed: cells occupied',
      insufficient_gold: 'Build failed: not enough gold',
      path_blocked_small: 'Build failed: blocks the path',
      path_blocked_large: 'Build failed: blocks the path for large creeps',
      not_build_phase: 'Build failed: wave in progress',
      match_over: 'Build failed: match is over',
      opponent_view: 'Build failed: switch to your field',
    };

    for (const [reason, line] of Object.entries(lines) as [BuildRejectionReason, string][]) {
      expect(formatBuildRejected({ reason, towerType, anchor })).toBe(line);
    }
  });

  it('formats rejection reasons', () => {
    expect(
      formatSendRejected({
        creepTypeId: 'x',
        reason: 'insufficient_gold',
        gold: 10,
        requiredGold: 50,
      }),
    ).toBe('Send failed: need 50 gold');
    expect(formatSendRejected({ creepTypeId: 'x', reason: 'match_over', gold: 10 })).toBe(
      'Send failed: match is over',
    );
    expect(
      formatSendRejected({ creepTypeId: 'x', reason: 'wave_send_cap', gold: 10, sendLimit: 12 }),
    ).toBe('Send failed: 12 sends per wave');
    expect(
      formatSendRejected({
        creepTypeId: 'x',
        reason: 'unit_type_send_cap',
        gold: 10,
        sendLimit: 2,
      }),
    ).toBe('Send failed: 2 of this creep per wave');
  });
});

describe('selectPreviewEntries', () => {
  it('returns the newest lines, oldest first, and a copy when everything fits', () => {
    const entries = [entry(1), entry(2), entry(3), entry(4), entry(5)];
    expect(selectPreviewEntries(entries).map((item) => item.id)).toEqual(
      [3, 4, 5].slice(3 - DUEL_EVENT_FEED_PREVIEW_LINES),
    );
    const short = [entry(1), entry(2)];
    const preview = selectPreviewEntries(short);
    expect(preview).toEqual(short);
    expect(preview).not.toBe(short);
  });
});
