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
import type {
  GameHudSnapshot,
  GamePhase,
  SelectedTowerSnapshot,
} from '../../shared/lib/game-bridge/types';
import { RaceId, TowerTypeId } from '../../shared/types/content-ids';
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
  builderFaction: RaceId.HUMAN,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};
/** Three cards in: the row as the player left it, mid-roster. */
const SCROLLED_LEFT = 276;

function hudSnapshot(phase: GamePhase, waveNumber = 1): GameHudSnapshot {
  const isBuild = phase === 'build';
  return {
    gold: 1000,
    income: 50,
    lives: 20,
    opponentGold: 100,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Human',
    waveNumber,
    phase,
    canStartWave: isBuild,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: isBuild ? 30 : null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: isBuild ? 0 : 6,
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
    name: 'Guard Archer Tower',
    level: 1,
    position: { x: 4, y: 4 },
    cost: 50,
    combatStats: { ...getTowerStatsForLevel(TowerTypeId.SINGLE, 1)! },
    availableBranches: [],
    chosenBranchId: null,
  };
}

function setPhase(phase: GamePhase, waveNumber?: number): void {
  act(() => publishGameHudSnapshot(hudSnapshot(phase, waveNumber)));
}

const tab = (name: RegExp) => screen.getByRole('tab', { name, hidden: true });
const sendRow = () => document.querySelector<HTMLElement>('[data-send-row]');

/** The player swipes the row: the browser moves it and fires `scroll`. */
function swipeRowTo(scrollLeft: number): HTMLElement {
  const row = sendRow()!;
  act(() => {
    row.scrollLeft = scrollLeft;
    fireEvent.scroll(row);
  });
  return row;
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('GamePage SEND row scroll position (tower-def-qpb)', () => {
  beforeEach(() => {
    publishGameHudSnapshot(hudSnapshot('build'));
  });

  afterEach(() => {
    cleanup();
    resetGameBridgeState();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockClear();
  });

  it('shows every creature of the race in one row', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(tab(/^Send/));

    expect(sendRow()?.querySelectorAll('[data-send-card]')).toHaveLength(8);
  });

  it('keeps the row where it was through a whole wave', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(tab(/^Send/));
    const row = swipeRowTo(SCROLLED_LEFT);

    setPhase('wave');
    expect(sendRow()).toBe(row);
    setPhase('build', 2);

    expect(sendRow()).toBe(row);
    expect(row.scrollLeft).toBe(SCROLLED_LEFT);
    expect(row.getAttribute('data-fade-start')).toBe('true');
  });

  it('keeps the row under the tower sheet', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(tab(/^Send/));
    const row = swipeRowTo(SCROLLED_LEFT);

    act(() => publishGameEvent('selected-tower', { tower: archerTower() }));
    expect(screen.getByRole('region', { name: 'Tower actions' })).toBeDefined();
    act(() => publishGameEvent('selected-tower', { tower: null }));

    expect(sendRow()).toBe(row);
    expect(row.scrollLeft).toBe(SCROLLED_LEFT);
  });

  it('restores the row after a trip to the TOWERS tab', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(tab(/^Send/));
    swipeRowTo(SCROLLED_LEFT);

    fireEvent.click(tab(/^Towers/));
    expect(sendRow()).toBeNull();
    fireEvent.click(tab(/^Send/));

    expect(sendRow()?.scrollLeft).toBe(SCROLLED_LEFT);
  });
});
