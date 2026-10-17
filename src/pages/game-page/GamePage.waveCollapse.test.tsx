// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Difficulty } from '../../entities/difficulty';
import { getTowerStatsForLevel } from '../../entities/tower';
import { registerCanvasResolution } from '../../features/game-engine/runtime/camera/canvasResolutionRuntime';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import { LANDSCAPE_LAYOUT_CLASS_NAME } from '../../shared/constants/layout';
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
 * jsdom has no layout: the flex column is modelled with the numbers measured
 * in headless Chrome at 390x844 (832px inside the page padding). The board is
 * what the strip leaves; the strip is the dock + HUD in the build phase and
 * the HUD status rows alone during the wave. Landscape (844x390) keeps the
 * board at the full 378px column height in both phases.
 */
const PORTRAIT_VIEWPORT_HEIGHT = 832;
const LANDSCAPE_BOARD_HEIGHT = 378;
const FEED_ROW_AND_GAPS = 56;
const DOCK_STRIP_HEIGHT = 334.6;
const SHEET_STRIP_HEIGHT = 338;
const WAVE_STRIP_HEIGHT = 134.8;
const BOARD_WIDTH = 378;

function stripHeight(strip: HTMLElement): number {
  const lockedHeight = Number.parseFloat(strip.style.height);
  if (!Number.isNaN(lockedHeight)) {
    return lockedHeight;
  }
  if (strip.classList.contains('game-panels--wave')) {
    return WAVE_STRIP_HEIGHT;
  }
  return strip.classList.contains('game-panels--sheet-open')
    ? SHEET_STRIP_HEIGHT
    : DOCK_STRIP_HEIGHT;
}

function modelledBoardHeight(): number {
  if (document.querySelector(`.${LANDSCAPE_LAYOUT_CLASS_NAME}`)) {
    return LANDSCAPE_BOARD_HEIGHT;
  }
  const strip = document.querySelector<HTMLElement>('.game-panels');
  return PORTRAIT_VIEWPORT_HEIGHT - FEED_ROW_AND_GAPS - (strip ? stripHeight(strip) : 0);
}

function modelledHeight(element: HTMLElement): number {
  if (element.classList.contains('game-panels')) {
    return stripHeight(element);
  }
  if (
    element.classList.contains('game-canvas-area') ||
    element.classList.contains('game-canvas-container')
  ) {
    return modelledBoardHeight();
  }
  return 0;
}

/** Delivers resize callbacks the way the browser does: only for changed boxes. */
const resizeObservers = new Set<FakeResizeObserver>();

class FakeResizeObserver {
  private readonly targets = new Map<Element, string>();

  public constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.add(this);
  }

  public observe(target: Element): void {
    this.targets.set(target, describeBox(target));
  }

  public unobserve(target: Element): void {
    this.targets.delete(target);
  }

  public disconnect(): void {
    this.targets.clear();
    resizeObservers.delete(this);
  }

  public flush(): void {
    for (const [target, previous] of this.targets) {
      const next = describeBox(target);
      if (next !== previous) {
        this.targets.set(target, next);
        this.callback([], this as unknown as ResizeObserver);
      }
    }
  }
}

function describeBox(target: Element): string {
  const box = target.getBoundingClientRect();
  return `${box.width}x${box.height}`;
}

function flushResizeObservers(): void {
  act(() => {
    for (const observer of [...resizeObservers]) {
      observer.flush();
    }
  });
}

function stubViewport(isLandscape: boolean): void {
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

function hudSnapshot(phase: GamePhase, gold = 1000): GameHudSnapshot {
  const isBuild = phase === 'build';
  return {
    gold,
    income: 50,
    lives: 20,
    opponentGold: 100,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 1,
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

function setPhase(phase: GamePhase, gold?: number): void {
  act(() => publishGameHudSnapshot(hudSnapshot(phase, gold)));
}

function archerTower(): SelectedTowerSnapshot {
  return {
    id: 'tower:4:4',
    type: TowerTypeId.SINGLE,
    name: 'Bone Archer Tower',
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

const strip = () => document.querySelector<HTMLElement>('.game-panels')!;
const dockSlot = () => document.querySelector<HTMLElement>('.game-dock-slot')!;
const boardHeight = () =>
  document.querySelector<HTMLElement>('.game-canvas-area')!.getBoundingClientRect().height;
const sheet = () => screen.queryByRole('region', { name: 'Tower actions' });
const waveTowerLine = () => screen.queryByRole('region', { name: 'Selected tower' });
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

/** The engine's canvas sizing on the real host, with a mocked Phaser scale. */
function bindCameraRefit(): ReturnType<typeof vi.fn> {
  const resize = vi.fn();
  const game = { canvas: document.createElement('canvas'), scale: { resize } };
  const host = document.querySelector<HTMLElement>('.game-canvas-container')!;
  registerCanvasResolution(game as unknown as Parameters<typeof registerCanvasResolution>[0], host);
  return resize;
}

describe('GamePage wave phase', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    stubViewport(false);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return DOMRect.fromRect({ width: BOARD_WIDTH, height: modelledHeight(this) });
    });
    publishGameHudSnapshot(hudSnapshot('build'));
  });

  afterEach(() => {
    cleanup();
    resetGameBridgeState();
    resizeObservers.clear();
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockRestore();
    vi.unstubAllGlobals();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockClear();
  });

  it('gives the dock height to the board during the wave and keeps the status rows', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    const buildBoardHeight = boardHeight();
    const sendPanel = screen.getByRole('region', { name: 'Creep sending panel' });

    setPhase('wave');

    expect(strip().classList.contains('game-panels--wave')).toBe(true);
    expect(strip().style.height).toBe('');
    expect(boardHeight()).toBe(buildBoardHeight + DOCK_STRIP_HEIGHT - WAVE_STRIP_HEIGHT);
    // Send panel folded away but mounted; the drawer tab and Start Wave gone.
    expect(dockSlot().hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('region', { name: 'Creep sending panel', hidden: true })).toBe(
      sendPanel,
    );
    expect(screen.queryByRole('button', { name: 'Expand HUD' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start Wave' })).toBeNull();
    const hud = screen.getByRole('region', { name: 'Game HUD' });
    expect(within(hud).getByText('1000')).toBeDefined();
    expect(within(hud).getByRole('status', { name: /^Incoming 6/ })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Duel events' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pause game' })).toBeDefined();

    setPhase('build');

    expect(strip().classList.contains('game-panels--wave')).toBe(false);
    expect(dockSlot().hasAttribute('inert')).toBe(false);
    expect(boardHeight()).toBe(buildBoardHeight);
    expect(screen.getByRole('button', { name: 'Start Wave' })).toBeDefined();
  });

  it('brings the dock back after the wave in the state it had', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    const sendPanel = screen.getByRole('region', { name: 'Creep sending panel' });
    fireEvent.click(within(sendPanel).getByRole('button', { name: /^Develop creatures/ }));
    expect(sendPanel.getAttribute('data-mode')).toBe('develop');

    setPhase('wave');
    setPhase('build');

    expect(screen.getByRole('region', { name: 'Creep sending panel' })).toBe(sendPanel);
    expect(sendPanel.getAttribute('data-mode')).toBe('develop');
  });

  it('folds an open build drawer for the wave and reopens it after', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));
    expect(screen.getByRole('group', { name: 'Buildable towers' })).toBeDefined();

    setPhase('wave');
    expect(screen.queryByRole('group', { name: 'Buildable towers' })).toBeNull();

    setPhase('build');
    expect(screen.getByRole('group', { name: 'Buildable towers' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse HUD' })).toBeDefined();
  });

  it('re-fits the camera once per phase change, never on mid-wave HUD updates', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    const resize = bindCameraRefit();
    expect(resize).toHaveBeenCalledTimes(1);

    setPhase('wave');
    flushResizeObservers();
    expect(resize).toHaveBeenCalledTimes(2);

    setPhase('wave', 980);
    setPhase('wave', 960);
    selectTower(archerTower());
    flushResizeObservers();
    expect(resize).toHaveBeenCalledTimes(2);

    selectTower(null);
    setPhase('build');
    flushResizeObservers();
    expect(resize).toHaveBeenCalledTimes(3);
  });

  it('shows a read-only tower line mid-wave instead of the sheet, without moving the board', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    setPhase('wave');
    const waveBoardHeight = boardHeight();

    selectTower(archerTower());

    expect(sheet()).toBeNull();
    const line = waveTowerLine()!;
    expect(line.closest('.game-feed-slot')).not.toBeNull();
    expect(within(line).getByText('Bone Archer Tower')).toBeDefined();
    expect(document.querySelector('.game-feed-slot__feed')?.hasAttribute('inert')).toBe(true);
    expect(strip().classList.contains('game-panels--wave')).toBe(true);
    expect(boardHeight()).toBe(waveBoardHeight);
    expect(screen.queryByRole('button', { name: /^Sell tower/ })).toBeNull();

    fireEvent.click(within(line).getByRole('button', { name: 'Close tower info' }));
    expect(waveTowerLine()).toBeNull();
    expect(document.querySelector('.game-feed-slot__feed')?.hasAttribute('inert')).toBe(false);
  });

  it('closes the tower line on Escape without asking to quit', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    setPhase('wave');
    selectTower(archerTower());

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(waveTowerLine()).toBeNull();
    expect(screen.queryByRole('dialog', { name: QUIT_DIALOG_TITLE })).toBeNull();
  });

  it('turns an open sheet into the line when the wave starts and back after it', () => {
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    selectTower(archerTower());
    expect(sheet()).not.toBeNull();
    expect(strip().style.height).toBe(`${DOCK_STRIP_HEIGHT}px`);

    setPhase('wave');
    expect(sheet()).toBeNull();
    expect(waveTowerLine()).not.toBeNull();
    expect(strip().style.height).toBe('');

    setPhase('build');
    expect(waveTowerLine()).toBeNull();
    expect(sheet()).not.toBeNull();
    expect(strip().style.height).toBe(`${DOCK_STRIP_HEIGHT}px`);
  });

  it('folds the dock inside the landscape column and keeps the board at full height', () => {
    stubViewport(true);
    render(<GamePage setup={SETUP} onExit={vi.fn()} />);
    expect(screen.getByRole('main').classList.contains(LANDSCAPE_LAYOUT_CLASS_NAME)).toBe(true);
    const resize = bindCameraRefit();
    const buildBoardHeight = boardHeight();

    setPhase('wave');
    flushResizeObservers();

    expect(strip().classList.contains('game-panels--wave')).toBe(true);
    expect(dockSlot().hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('region', { name: 'Game HUD' })).toBeDefined();
    expect(boardHeight()).toBe(buildBoardHeight);
    expect(resize).toHaveBeenCalledTimes(1);

    setPhase('build');
    expect(dockSlot().hasAttribute('inert')).toBe(false);
    expect(strip().style.height).toBe('');
  });
});
