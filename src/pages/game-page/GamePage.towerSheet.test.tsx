// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Difficulty } from '../../entities/difficulty';
import { getTowerStatsForLevel } from '../../entities/tower';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import {
  publishGameEvent,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot, SelectedTowerSnapshot } from '../../shared/lib/game-bridge/types';
import { RaceId, TowerTypeId } from '../../shared/types/content-ids';
import { MATCH_STATUS_LABEL } from '../../widgets/hud';
import { QUIT_DIALOG_TITLE } from '../../widgets/match-controls';
import { GamePage } from './GamePage';

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

/*
 * jsdom has no layout, so the page's grid is modelled here with the numbers
 * measured in Chrome at 390x844: the board is the viewport minus the control
 * strip (minus the plate, the event row and the gaps). The strip's natural
 * height differs with the sheet open (status bar + sheet 174) from the
 * dock's (status bar + dock 193); only the lock keeps the board still.
 */
const VIEWPORT_HEIGHT = 832;
const PLATE_FEED_ROW_AND_GAPS = 122;
const DOCK_STRIP_HEIGHT = 257;
const SHEET_STRIP_HEIGHT = 238;

function stripHeight(strip: HTMLElement): number {
  const lockedHeight = Number.parseFloat(strip.style.height);
  if (!Number.isNaN(lockedHeight)) {
    return lockedHeight;
  }
  return strip.classList.contains('game-panels--sheet-open')
    ? SHEET_STRIP_HEIGHT
    : DOCK_STRIP_HEIGHT;
}

function modelledHeight(element: HTMLElement): number {
  if (element.classList.contains('game-panels')) {
    return stripHeight(element);
  }
  if (element.classList.contains('game-canvas-area')) {
    const strip = document.querySelector<HTMLElement>('.game-panels');
    return VIEWPORT_HEIGHT - PLATE_FEED_ROW_AND_GAPS - (strip ? stripHeight(strip) : 0);
  }
  return 0;
}

function boardHeight(): number {
  return document.querySelector<HTMLElement>('.game-canvas-area')!.getBoundingClientRect().height;
}

function hudSnapshot(): GameHudSnapshot {
  return {
    gold: 1000,
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

function archerTower(): SelectedTowerSnapshot {
  return {
    id: 'tower:4:4',
    type: TowerTypeId.SINGLE,
    level: 1,
    position: { x: 4, y: 4 },
    cost: 50,
    combatStats: { ...getTowerStatsForLevel(TowerTypeId.SINGLE, 1)! },
    availableBranches: [],
    chosenBranchId: null,
  };
}

function selectTower(tower: SelectedTowerSnapshot | null): void {
  act(() => publishGameEvent('selected-tower', { tower }));
}

const sheet = () => screen.queryByRole('region', { name: 'Tower actions' });
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('GamePage tower sheet', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return DOMRect.fromRect({ width: 390, height: modelledHeight(this) });
    });
    publishGameHudSnapshot(hudSnapshot());
  });

  afterEach(() => {
    cleanup();
    resetGameBridgeState();
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockRestore();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockClear();
  });

  it('opens in the dock slot under the board and keeps the board height', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    const board = document.querySelector<HTMLElement>('.game-canvas-area')!;
    const closedHeight = boardHeight();

    selectTower(archerTower());

    const towerSheet = sheet()!;
    expect(board.contains(towerSheet)).toBe(false);
    expect(towerSheet.closest('.game-dock-slot')).not.toBeNull();
    expect(boardHeight()).toBe(closedHeight);
    expect(document.querySelector<HTMLElement>('.game-panels')!.style.height).toBe(
      `${DOCK_STRIP_HEIGHT}px`,
    );
    // The status bar stays; the dock steps aside but stays mounted.
    expect(screen.getByRole('region', { name: MATCH_STATUS_LABEL })).toBeDefined();
    expect(document.querySelector('.game-dock')?.hasAttribute('inert')).toBe(true);

    selectTower(null);
    expect(sheet()).toBeNull();
    expect(document.querySelector<HTMLElement>('.game-panels')!.style.height).toBe('');
    expect(boardHeight()).toBe(closedHeight);
  });

  it('closes on Escape without asking to quit, and Escape asks again once closed', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    selectTower(archerTower());

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(sheet()).toBeNull();
    expect(screen.queryByRole('dialog', { name: QUIT_DIALOG_TITLE })).toBeNull();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: QUIT_DIALOG_TITLE })).toBeDefined();
  });

  it('closes from its close button and brings the dock back as it was', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Send/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Develop creatures/ }));
    const sendPanel = screen.getByRole('region', { name: 'Creep sending panel' });
    expect(sendPanel.getAttribute('data-mode')).toBe('develop');

    selectTower(archerTower());
    fireEvent.click(screen.getByRole('button', { name: 'Close tower panel' }));

    expect(sheet()).toBeNull();
    expect(document.querySelector('.game-dock')?.hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('tab', { name: /^Send/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('region', { name: 'Creep sending panel' })).toBe(sendPanel);
    expect(sendPanel.getAttribute('data-mode')).toBe('develop');
  });

  it('stands in for the tower cards while open and gives them back on close', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    const towerCards = screen.getByRole('group', { name: 'Buildable towers' });

    selectTower(archerTower());
    // Kept mounted under the sheet, but out of reach: the dock is inert.
    expect(towerCards.closest('.game-dock')?.hasAttribute('inert')).toBe(true);
    expect(towerCards.closest('.game-dock-slot')?.contains(sheet())).toBe(true);

    selectTower(null);
    expect(screen.getByRole('group', { name: 'Buildable towers' })).toBe(towerCards);
    expect(towerCards.closest('.game-dock')?.hasAttribute('inert')).toBe(false);
  });
});
