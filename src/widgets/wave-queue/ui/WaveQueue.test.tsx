// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { WaveQueue } from './WaveQueue';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 500,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null },
    builderFactionName: 'Undead',
    waveNumber: 4,
    phase: 'wave',
    canStartWave: false,
    selectedTowerType: null,
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

describe('WaveQueue render', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
  });

  it('renders the live wave queue without React key warnings', () => {
    publishGameHudSnapshot(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 6,
        waveQueue: [
          { type: 'ghoul', index: 0 },
          { type: 'ghoul', index: 1 },
          { type: 'skeleton', index: 2 },
          { type: 'ghoul', index: 3 },
          { type: 'gargoyle', index: 4 },
        ],
      }),
    );

    render(<WaveQueue />);

    expect(screen.getByText('Wave 4')).toBeDefined();
    expect(screen.getByText('6 creeps')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not warn even when the snapshot carries repeated queue indexes', () => {
    // Guards tower-def-16v: colliding indexes must not surface as duplicate
    // React keys, since queue items are keyed by render position.
    publishGameHudSnapshot(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 4,
        waveQueue: [
          { type: 'ghoul', index: 4 },
          { type: 'ghoul', index: 4 },
          { type: 'skeleton', index: 0 },
          { type: 'skeleton', index: 0 },
        ],
      }),
    );

    render(<WaveQueue />);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('separates the baseline wave from enemy sends during the build phase', () => {
    publishGameHudSnapshot(
      createSnapshot({
        phase: 'build',
        opponentSendQueue: [
          { type: 'ghoul', index: 0 },
          { type: 'gargoyle', index: 1 },
        ],
      }),
    );

    render(<WaveQueue />);

    expect(screen.getByText('Next: Wave 4')).toBeDefined();
    expect(screen.getByText('Baseline wave')).toBeDefined();
    expect(screen.getByText('Enemy sends')).toBeDefined();
    expect(screen.getByText('+2 enemy sends')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
