// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { DUEL_EVENT_FEED_LIMIT } from '../model/duelEventFeed';
import { DuelEventFeed } from './DuelEventFeed';

describe('DuelEventFeed render', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
  });

  it('renders nothing until a duel event arrives', () => {
    render(<DuelEventFeed />);
    expect(screen.queryByRole('log')).toBeNull();
  });

  it('appends entries from typed bridge events', () => {
    render(<DuelEventFeed />);

    act(() => {
      publishGameEvent('income-updated', { owner: 'player', income: 60, delta: 10 });
      publishGameEvent('opponent-hp-updated', { hp: 17, previousHp: 20, delta: -3 });
    });

    expect(screen.getByRole('log')).toBeDefined();
    expect(screen.getByText('Your income +10 → 60')).toBeDefined();
    expect(screen.getByText('Enemy -3 HP → 17')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows build rejections from typed events', () => {
    render(<DuelEventFeed />);

    act(() => {
      publishGameEvent('build-rejected', {
        reason: 'path_blocked_small',
        towerType: TowerTypeId.SINGLE,
        anchor: { x: 8, y: 10 },
      });
    });

    expect(screen.getByText('Build failed: blocks the path')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the feed bounded and free of duplicate keys under a burst', () => {
    render(<DuelEventFeed />);

    act(() => {
      for (let index = 0; index < DUEL_EVENT_FEED_LIMIT + 4; index += 1) {
        publishGameEvent('income-updated', { owner: 'player', income: 60, delta: 10 });
      }
    });

    expect(screen.getByRole('log').children).toHaveLength(DUEL_EVENT_FEED_LIMIT);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('clears the previous match on match-started (rematch regression)', () => {
    render(<DuelEventFeed />);

    act(() => {
      publishGameEvent('income-updated', { owner: 'player', income: 60, delta: 10 });
      publishGameEvent('lives-stolen', { thief: 'opponent', lives: 2, hp: 22 });
    });
    expect(screen.getByRole('log').children).toHaveLength(2);

    act(() => {
      publishGameEvent('match-started', { trigger: 'restart' });
    });
    expect(screen.queryByRole('log')).toBeNull();

    act(() => {
      publishGameEvent('income-updated', { owner: 'opponent', income: 55, delta: 5 });
    });
    expect(screen.getByRole('log').children).toHaveLength(1);
    expect(screen.getByText('Enemy income +5 → 55')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<DuelEventFeed />);
    unmount();

    act(() => {
      publishGameEvent('income-updated', { owner: 'player', income: 99, delta: 10 });
    });

    expect(screen.queryByRole('log')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
