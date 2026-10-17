// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { publishGameEvent, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { RaceId } from '../../../shared/types/content-ids';
import { toFactionEmblemSource } from '../../../shared/ui/faction-emblem';
import { WaveQueue } from './WaveQueue';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 500,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
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
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices: {},
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
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
          { creepTypeId: 'undead_ghoul', index: 0 },
          { creepTypeId: 'undead_ghoul', index: 1 },
          { creepTypeId: 'undead_skeleton', index: 2 },
          { creepTypeId: 'undead_ghoul', index: 3 },
          { creepTypeId: 'undead_gargoyle', index: 4 },
        ],
      }),
    );

    render(<WaveQueue />);

    expect(screen.getByText('Wave 4')).toBeDefined();
    expect(screen.getByText('6 creeps')).toBeDefined();
    const portraitSources = screen
      .getAllByRole('img')
      .map((icon) => icon.querySelector('img')?.getAttribute('src'));
    // One portrait per creature type, in order of first appearance, with its count.
    expect(portraitSources).toEqual([
      '/assets/ui/portraits/undead_ghoul.webp',
      '/assets/ui/portraits/undead_skeleton.webp',
      '/assets/ui/portraits/undead_gargoyle.webp',
    ]);
    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      '3 Ghoul',
      '1 Skeleton',
      '1 Gargoyle',
    ]);
    expect(screen.getByText('×3')).toBeDefined();
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
          { creepTypeId: 'undead_ghoul', index: 4 },
          { creepTypeId: 'undead_ghoul', index: 4 },
          { creepTypeId: 'undead_skeleton', index: 0 },
          { creepTypeId: 'undead_skeleton', index: 0 },
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
          { creepTypeId: 'undead_ghoul', index: 0 },
          { creepTypeId: 'undead_gargoyle', index: 1 },
        ],
      }),
    );

    render(<WaveQueue />);

    expect(screen.getByRole('heading', { name: 'Next: Wave 4' })).toBeDefined();
    expect(screen.getByText('baseline + 2 enemy sends')).toBeDefined();
    expect(screen.getByRole('listitem', { name: '1 Ghoul' })).toBeDefined();
    expect(screen.getByRole('listitem', { name: '1 Gargoyle' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('leads the plate with the player race emblem and names a quiet build phase', () => {
    publishGameHudSnapshot(createSnapshot({ phase: 'build' }));

    const { container } = render(<WaveQueue race={RaceId.ELF} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      toFactionEmblemSource(RaceId.ELF),
    );
    expect(screen.getByText('Baseline wave')).toBeDefined();
    expect(screen.queryByRole('list')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('folds creature types past the fourth into a "+N" tile', () => {
    publishGameHudSnapshot(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 5,
        waveQueue: [
          'undead_skeleton',
          'undead_ghoul',
          'undead_crypt_fiend',
          'undead_gargoyle',
          'orc_grunt',
        ].map((creepTypeId, index) => ({ creepTypeId, index })),
      }),
    );

    render(<WaveQueue />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('listitem', { name: '1 more creature types' }).textContent).toBe('+1');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the enemy field still fighting instead of "No enemies"', () => {
    publishGameHudSnapshot(createSnapshot({ phase: 'wave', waveQueue: [], pendingCreepCount: 0 }));
    publishGameEvent('opponent-field-creeps-updated', { remaining: 3 });

    render(<WaveQueue />);

    expect(screen.getByRole('status').textContent).toBe('Enemy field: 3 left');
    expect(screen.queryByText('No enemies')).toBeNull();

    act(() => publishGameEvent('opponent-field-creeps-updated', { remaining: 0 }));

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('No enemies')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
