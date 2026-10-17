// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Difficulty } from '../../entities/difficulty';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import { LANDSCAPE_LAYOUT_CLASS_NAME } from '../../shared/constants/layout';
import { publishGameHudSnapshot, resetGameBridgeState } from '../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../shared/lib/game-bridge/types';
import { RaceId } from '../../shared/types/content-ids';
import { injectCssModule } from '../../shared/test/injectCssModule';
import { GamePage } from './GamePage';
import gamePageCss from './GamePage.css?raw';

vi.mock('phaser', () => ({
  default: {
    Game: class FakePhaserGame {
      public readonly canvas: HTMLCanvasElement | null = null;
      public readonly destroy = vi.fn();
    },
  },
}));

vi.mock('../../features/game-engine', () => ({
  createGameConfig: () => ({}),
  destroyGame: vi.fn(),
}));

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.UNDEAD,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};

function hudSnapshot(): GameHudSnapshot {
  return {
    gold: 500,
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
    towerBranchChoices: {},
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
  };
}

function stubLandscape(isLandscape: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(
      (media: string) =>
        ({
          matches: isLandscape,
          media,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    ),
  );
}

function gridAreaOf(selector: string): string {
  return getComputedStyle(document.querySelector<HTMLElement>(selector)!).gridArea;
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
let injectedStyles: { remove: () => void } | null = null;

afterEach(() => {
  cleanup();
  injectedStyles?.remove();
  injectedStyles = null;
  resetGameBridgeState();
  vi.unstubAllGlobals();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

/*
 * The match screen is one grid; the landscape class only changes its areas,
 * so the canvas element (and its Phaser game) never moves in the DOM.
 */
describe('GamePage layout grid', () => {
  it('stacks plate, board, event row and strip in portrait', () => {
    stubLandscape(false);
    injectedStyles = injectCssModule(gamePageCss, {});
    publishGameHudSnapshot(hudSnapshot());
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);

    const viewport = getComputedStyle(document.querySelector<HTMLElement>('.game-viewport')!);
    expect(viewport.display).toBe('grid');
    expect(viewport.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(
      "'plate' 'board' 'events' 'panels'",
    );
    expect(gridAreaOf('.game-plate-slot')).toBe('plate');
    expect(gridAreaOf('.game-canvas-area')).toBe('board');
    expect(gridAreaOf('.game-feed-row')).toBe('events');
    expect(gridAreaOf('.game-panels')).toBe('panels');
  });

  it('puts the board at full height on the left and the rest in a right column in landscape', () => {
    stubLandscape(true);
    injectedStyles = injectCssModule(gamePageCss, {});
    publishGameHudSnapshot(hudSnapshot());
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);

    expect(screen.getByRole('main').classList.contains(LANDSCAPE_LAYOUT_CLASS_NAME)).toBe(true);
    const viewport = getComputedStyle(document.querySelector<HTMLElement>('.game-viewport')!);
    expect(viewport.gridTemplateColumns).toBe('minmax(0, 1fr) var(--match-landscape-column-width)');
    expect(viewport.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(
      "'board plate' 'board events' 'board panels' 'board .'",
    );
  });
});
