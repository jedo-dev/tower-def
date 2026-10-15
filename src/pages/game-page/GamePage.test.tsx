// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Difficulty } from '../../entities/difficulty';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import { publishGameHudSnapshot, resetGameBridgeState } from '../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../shared/lib/game-bridge/types';
import { RaceId } from '../../shared/types/content-ids';
import { QUIT_DIALOG_TITLE } from '../../widgets/match-controls';
import { GamePage } from './GamePage';

const { createdGames, destroyGame } = vi.hoisted(() => ({
  createdGames: [] as object[],
  destroyGame: vi.fn(),
}));

vi.mock('phaser', () => ({
  default: {
    Game: class FakePhaserGame {
      public readonly canvas: HTMLCanvasElement | null = null;
      public readonly destroy = vi.fn();

      public constructor() {
        createdGames.push(this);
      }
    },
  },
}));

vi.mock('../../features/game-engine', () => ({
  createGameConfig: () => ({}),
  destroyGame: (game: unknown) => destroyGame(game),
}));

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.UNDEAD,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};

function createActiveSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 100,
    income: 50,
    lives: 20,
    opponentGold: 100,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: 30,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    isPaused: false,
    gameSpeed: 1,
    ...overrides,
  };
}

/** The app shell in miniature: the game page until it exits, then the menu. */
function AppShell() {
  const [route, setRoute] = useState<'game' | 'start'>('game');
  if (route === 'start') {
    return <p>Main menu</p>;
  }
  return <GamePage setup={SETUP} onExit={() => setRoute('start')} />;
}

describe('GamePage', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    resetGameBridgeState();
    createdGames.length = 0;
    destroyGame.mockClear();
    consoleError.mockClear();
  });

  it('quits to the menu after confirmation and destroys the game', () => {
    publishGameHudSnapshot(createActiveSnapshot());
    render(<AppShell />);
    expect(createdGames).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Quit to menu' }));
    expect(screen.getByRole('dialog', { name: QUIT_DIALOG_TITLE })).toBeDefined();
    expect(destroyGame).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Leave match' }));

    expect(screen.getByText('Main menu')).toBeDefined();
    expect(destroyGame).toHaveBeenCalledOnce();
    expect(destroyGame).toHaveBeenCalledWith(createdGames[0]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('asks before the page unloads only while a match is active', () => {
    publishGameHudSnapshot(createActiveSnapshot());
    render(<AppShell />);

    const activeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(activeUnload);
    expect(activeUnload.defaultPrevented).toBe(true);

    publishGameHudSnapshot(
      createActiveSnapshot({
        matchOutcome: { status: 'player-won', winner: 'undead', reason: 'knockout' },
        phase: 'game-over',
      }),
    );
    const finishedUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(finishedUnload);
    expect(finishedUnload.defaultPrevented).toBe(false);
  });
});
