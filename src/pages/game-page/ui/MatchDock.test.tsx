// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import {
  onGameCommand,
  publishGameEvent,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { MATCH_DOCK_LABEL, MatchDock } from './MatchDock';
import { resolveDockTabForKey } from './matchDockTabs';

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.UNDEAD,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
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
    creatureXpByTier: { 1: 25 },
    creatureBranchChoices: {},
    creatureGrades: {},
    ...overrides,
  };
}

const tab = (name: RegExp) => screen.getByRole('tab', { name });
const towerCards = () => document.querySelectorAll('[data-tower-card]');
const sendCards = () => document.querySelectorAll('[data-send-card], [data-develop-card]');
const developToggle = () => screen.queryByRole('button', { name: /^Develop creatures/ });
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

/** Never both card rows, and exactly one tab panel. */
function expectOneRow(): void {
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(towerCards().length === 0 || sendCards().length === 0).toBe(true);
}

beforeEach(() => {
  publishGameHudSnapshot(createSnapshot());
});

afterEach(() => {
  cleanup();
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('MatchDock tabs', () => {
  it('opens on the tower cards with the towers tab selected', () => {
    render(<MatchDock setup={SETUP} />);

    const dock = screen.getByRole('region', { name: MATCH_DOCK_LABEL });
    const tabs = within(dock).getAllByRole('tab');
    expect(tabs.map((element) => element.textContent)).toEqual(['Towers', 'Send']);
    expect(tab(/^Towers/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/^Send/).getAttribute('aria-selected')).toBe('false');
    expect(towerCards()).toHaveLength(4);
    expect(sendCards()).toHaveLength(0);
    expect(developToggle()).toBeNull();
    expectOneRow();
  });

  it('switches the single card row with the tab and never renders both', () => {
    render(<MatchDock setup={SETUP} />);

    fireEvent.click(tab(/^Send/));
    expect(tab(/^Send/).getAttribute('aria-selected')).toBe('true');
    expect(towerCards()).toHaveLength(0);
    expect(sendCards()).toHaveLength(8);
    expectOneRow();

    fireEvent.click(tab(/^Towers/));
    expect(towerCards()).toHaveLength(4);
    expect(sendCards()).toHaveLength(0);
    expectOneRow();
  });

  it('wires the tabs to the panel for assistive technology', () => {
    render(<MatchDock setup={SETUP} />);
    const panel = screen.getByRole('tabpanel');

    for (const element of screen.getAllByRole('tab')) {
      expect(element.getAttribute('aria-controls')).toBe(panel.id);
    }
    expect(panel.getAttribute('aria-labelledby')).toBe(tab(/^Towers/).id);
    fireEvent.click(tab(/^Send/));
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tab(/^Send/).id);
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Dock tabs');
  });

  it('moves between tabs with the arrow keys, Home and End (roving focus)', () => {
    render(<MatchDock setup={SETUP} />);
    const towers = tab(/^Towers/);
    towers.focus();
    expect(towers.tabIndex).toBe(0);
    expect(tab(/^Send/).tabIndex).toBe(-1);

    fireEvent.keyDown(towers, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab(/^Send/));
    expect(tab(/^Send/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/^Send/).tabIndex).toBe(0);
    expect(sendCards()).toHaveLength(8);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab(/^Towers/));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(tab(/^Send/));
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(tab(/^Towers/));
    expect(towerCards()).toHaveLength(4);
  });

  it('counts the sends left this wave on the SEND tab', () => {
    render(<MatchDock setup={SETUP} />);

    act(() =>
      publishGameEvent('send-limits-updated', {
        owner: 'player',
        waveSendCap: 12,
        waveSendsRemaining: 9,
        units: [],
      }),
    );

    expect(tab(/^Send/).textContent).toBe('Send 9/12');
  });

  it('drops a picked tower when the player leaves the towers tab', () => {
    publishGameHudSnapshot(createSnapshot({ selectedTowerType: TowerTypeId.SINGLE }));
    const selectTower = vi.fn();
    const unsubscribe = onGameCommand('select-tower', selectTower);
    render(<MatchDock setup={SETUP} />);

    fireEvent.click(tab(/^Send/));
    expect(selectTower).toHaveBeenCalledWith({ towerType: null });

    selectTower.mockClear();
    fireEvent.click(tab(/^Towers/));
    expect(selectTower).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('MatchDock develop mode', () => {
  it('puts DEVELOP in the rail on the send tab and switches the cards to develop actions', () => {
    render(<MatchDock setup={SETUP} />);
    fireEvent.click(tab(/^Send/));
    const toggle = developToggle()!;
    expect(screen.getByRole('tablist').parentElement?.contains(toggle)).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    const panel = screen.getByRole('region', { name: 'Creep sending panel' });
    expect(panel.getAttribute('data-mode')).toBe('develop');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('[data-develop-card]')).toHaveLength(8);
    expect(document.querySelectorAll('[data-send-card]')).toHaveLength(0);
    expect(screen.getByRole('list', { name: 'Creature experience by tier' })).toBeDefined();

    fireEvent.click(toggle);
    expect(panel.getAttribute('data-mode')).toBe('send');
  });

  it('keeps develop mode while the player visits the towers tab', () => {
    render(<MatchDock setup={SETUP} />);
    fireEvent.click(tab(/^Send/));
    fireEvent.click(developToggle()!);

    fireEvent.click(tab(/^Towers/));
    expect(developToggle()).toBeNull();
    fireEvent.click(tab(/^Send/));

    expect(
      screen.getByRole('region', { name: 'Creep sending panel' }).getAttribute('data-mode'),
    ).toBe('develop');
  });

  it('leaves develop mode on Escape inside the send cards', () => {
    render(<MatchDock setup={SETUP} />);
    fireEvent.click(tab(/^Send/));
    fireEvent.click(developToggle()!);
    const panel = screen.getByRole('region', { name: 'Creep sending panel' });

    fireEvent.keyDown(within(panel).getAllByRole('button')[0], { key: 'Escape' });

    expect(panel.getAttribute('data-mode')).toBe('send');
    expect(developToggle()?.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('resolveDockTabForKey', () => {
  it('wraps the arrows, jumps with Home and End, and ignores other keys', () => {
    expect(resolveDockTabForKey('towers', 'ArrowRight')).toBe('send');
    expect(resolveDockTabForKey('send', 'ArrowRight')).toBe('towers');
    expect(resolveDockTabForKey('towers', 'ArrowLeft')).toBe('send');
    expect(resolveDockTabForKey('send', 'Home')).toBe('towers');
    expect(resolveDockTabForKey('towers', 'End')).toBe('send');
    expect(resolveDockTabForKey('towers', 'Enter')).toBeNull();
  });
});
