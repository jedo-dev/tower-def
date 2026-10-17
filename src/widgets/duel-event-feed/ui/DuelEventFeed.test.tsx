// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { injectCssModule } from '../../../shared/test/injectCssModule';
import { DUEL_EVENT_FEED_LIMIT, DUEL_EVENT_FEED_PREVIEW_LINES } from '../model/duelEventFeed';
import { DUEL_EVENT_FEED_EMPTY_TEXT, DUEL_EVENT_FEED_LABEL, DuelEventFeed } from './DuelEventFeed';
import styles from './DuelEventFeed.module.css';
import duelEventFeedCss from './DuelEventFeed.module.css?raw';

function publishIncomeBurst(count: number): void {
  act(() => {
    for (let index = 0; index < count; index += 1) {
      publishGameEvent('income-updated', { owner: 'player', income: 60 + index, delta: 10 });
    }
  });
}

describe('DuelEventFeed render', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  it('keeps the strip in the layout with a placeholder until a duel event arrives', () => {
    render(<DuelEventFeed />);
    // The strip holds its place so the board does not resize on the first event.
    expect(screen.getByRole('region', { name: DUEL_EVENT_FEED_LABEL })).toBeDefined();
    expect(screen.getByText(DUEL_EVENT_FEED_EMPTY_TEXT)).toBeDefined();
    expect(screen.queryByRole('log')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show all duel events' });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
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

  it('shows build rejections and the round summary from typed events', () => {
    render(<DuelEventFeed />);

    act(() => {
      publishGameEvent('build-rejected', {
        reason: 'path_blocked_small',
        towerType: TowerTypeId.SINGLE,
        anchor: { x: 8, y: 10 },
      });
      publishGameEvent('round-settled', {
        round: 7,
        livesLost: 3,
        bountyEarned: 40,
        incomePaid: 120,
      });
    });

    expect(screen.getByText('Build failed: blocks the path')).toBeDefined();
    expect(screen.getByText('Wave 7 settled: -3 lives, +40 bounty, +120 income')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('previews the newest lines and expands to the bounded history under a burst', () => {
    render(<DuelEventFeed />);

    publishIncomeBurst(DUEL_EVENT_FEED_LIMIT + 4);

    const log = screen.getByRole('log');
    expect(log.children).toHaveLength(DUEL_EVENT_FEED_PREVIEW_LINES);
    // Newest last, oldest preview line first.
    expect(log.lastElementChild?.textContent).toBe(
      `Your income +10 → ${60 + DUEL_EVENT_FEED_LIMIT + 3}`,
    );

    const toggle = screen.getByRole('button', { name: 'Show all duel events' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);

    expect(screen.getByRole('log').children).toHaveLength(DUEL_EVENT_FEED_LIMIT);
    const collapse = screen.getByRole('button', { name: 'Show latest duel events' });
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(collapse);
    expect(screen.getByRole('log').children).toHaveLength(DUEL_EVENT_FEED_PREVIEW_LINES);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the toggle idle while every entry already fits the preview', () => {
    render(<DuelEventFeed />);
    publishIncomeBurst(DUEL_EVENT_FEED_PREVIEW_LINES);

    const toggle = screen.getByRole('button', { name: 'Show all duel events' });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('draws the strip on an opaque backing in the flow, never over the board', () => {
    const injected = injectCssModule(duelEventFeedCss, styles);
    render(<DuelEventFeed />);

    const strip = screen.getByRole('region', { name: DUEL_EVENT_FEED_LABEL });
    const stripStyle = getComputedStyle(strip);
    expect(stripStyle.position).not.toBe('absolute');
    expect(stripStyle.background).toContain('var(--color-surface-feed)');
    expect(stripStyle.minHeight).toBe('var(--touch-target-min)');

    // The whole well is the toggle: at least one touch target tall, as wide as the strip.
    const toggle = screen.getByRole('button', { name: 'Show all duel events' });
    const toggleStyle = getComputedStyle(toggle);
    expect(toggleStyle.position).toBe('absolute');
    expect(toggleStyle.inset).toBe('0px');
    expect(toggleStyle.minHeight).toBe('var(--touch-target-min)');
    injected.remove();
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
    expect(screen.getByText(DUEL_EVENT_FEED_EMPTY_TEXT)).toBeDefined();

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
    expect(screen.queryByRole('region', { name: DUEL_EVENT_FEED_LABEL })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
