// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { onGameCommand, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { MatchOutcomeOverlay } from './MatchOutcomeOverlay';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 300,
    income: 90,
    lives: 4,
    opponentGold: 250,
    opponentIncome: 70,
    opponentLives: 0,
    matchOutcome: { status: 'player-won', winner: 'undead', reason: 'knockout' },
    builderFactionName: 'Undead',
    waveNumber: 12,
    phase: 'game-over',
    canStartWave: false,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

describe('MatchOutcomeOverlay', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
  });

  it('stays hidden while the match is active', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'active', winner: null, reason: null },
        phase: 'wave',
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows victory with the final stats when the player wins', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Victory')).toBeDefined();
    expect(screen.getByText('Undead broke through on wave 12')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('90')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows defeat when the opponent wins', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'player-lost', winner: 'orc', reason: 'knockout' },
        lives: 0,
        opponentLives: 6,
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByText('Defeat')).toBeDefined();
    expect(screen.getByText('Orc broke through on wave 12')).toBeDefined();
  });

  it('shows a draw when both keeps fall', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'draw', winner: null, reason: 'even' },
        lives: 0,
        opponentLives: 0,
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByText('Draw')).toBeDefined();
    expect(screen.getByText('Both keeps fell on wave 12 — dead even')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a tie-break victory when both fell and the player leaked fewer', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'player-won', winner: 'undead', reason: 'fewer-leaks' },
        lives: 0,
        opponentLives: 0,
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByText('Victory')).toBeDefined();
    expect(screen.getByText('Both fell on wave 12 — you leaked fewer')).toBeDefined();
    expect(
      screen.getByRole('dialog', { name: 'Victory. Both fell on wave 12 — you leaked fewer.' }),
    ).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a tie-break defeat when both fell and the enemy leaked fewer', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'player-lost', winner: 'orc', reason: 'fewer-leaks' },
        lives: 0,
        opponentLives: 0,
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByText('Defeat')).toBeDefined();
    expect(screen.getByText('Both fell on wave 12 — the enemy leaked fewer')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('explains a tie-break settled by lives before the wave', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'player-lost', winner: 'orc', reason: 'more-lives' },
        lives: 0,
        opponentLives: 0,
      }),
    );

    render(<MatchOutcomeOverlay onExit={() => undefined} />);

    expect(screen.getByText('Defeat')).toBeDefined();
    expect(
      screen.getByText('Both fell on wave 12 with equal leaks — the enemy had more lives'),
    ).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('sends restart-match on rematch and calls onExit on back to menu', () => {
    publishGameHudSnapshot(createSnapshot());
    const restart = vi.fn();
    const unsubscribe = onGameCommand('restart-match', restart);
    const onExit = vi.fn();

    render(<MatchOutcomeOverlay onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }));
    expect(restart).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(onExit).toHaveBeenCalledOnce();

    unsubscribe();
  });
});
