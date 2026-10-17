// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  onGameCommand,
  publishGameEvent,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot, SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { getTowerStatsForCurveLevel, resolveBuildableTowerById } from '../../../entities/tower';
import { TowerTalentPricing } from '../../../shared/constants/towerTalents';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { TowerActionPanel } from './TowerActionPanel';
import { formatBranchLockWarning } from '../model/mapTowerBranchState';
import { NEXT_LEVEL_PREVIEW_LABEL } from './NextLevelPreview';

const ARCHER = resolveBuildableTowerById('undead_bone_archer_tower');
const [BRANCH_A, BRANCH_B] = ARCHER.talentBranches;
const DEVELOP_LABEL = /^Develop tower/;

function hud(gold: number, towerBranchChoices: Record<string, string> = {}): GameHudSnapshot {
  return {
    gold,
    income: 40,
    lives: 20,
    opponentGold: 400,
    opponentIncome: 40,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 3,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices,
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
  };
}

function archer(level: number, chosenBranchId: string | null = null): SelectedTowerSnapshot {
  const choices = chosenBranchId ? { [ARCHER.id]: chosenBranchId } : {};
  const stats = getTowerStatsForCurveLevel(TowerTypeId.SINGLE, ARCHER.id, level, choices)!;
  return {
    id: 'tower:archer',
    type: TowerTypeId.SINGLE,
    name: ARCHER.name,
    buildableTowerId: ARCHER.id,
    level,
    position: { x: 8, y: 14 },
    cost: ARCHER.costGold,
    combatStats: {
      damage: stats.damage,
      range: stats.range,
      attackCooldownMs: stats.attackCooldownMs,
    },
    availableBranches: ARCHER.talentBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      isChosen: branch.id === chosenBranchId,
    })),
    chosenBranchId,
  };
}

function show(tower: SelectedTowerSnapshot, snapshot: GameHudSnapshot): void {
  publishGameHudSnapshot(snapshot);
  render(<TowerActionPanel />);
  act(() => {
    publishGameEvent('selected-tower', { tower });
  });
}

function openChooser(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: DEVELOP_LABEL }));
  return screen.getByRole('dialog', { name: `Develop ${ARCHER.name}` });
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('TowerActionPanel develop states', () => {
  it('has no Develop button below grade 3 and counts the level to 7', () => {
    show(archer(2), hud(1000));

    expect(screen.queryByRole('button', { name: DEVELOP_LABEL })).toBeNull();
    expect(screen.getByText('Lv 2/7')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Upgrade tower to level 3' })).toBeDefined();
  });

  it('offers Develop for its price at grade 3 instead of a dead end', () => {
    show(archer(3), hud(1000));

    const develop = screen.getByRole('button', { name: DEVELOP_LABEL });
    expect(develop.textContent).toContain(`$${TowerTalentPricing.BRANCH_COST}`);
    expect(develop.getAttribute('aria-disabled')).toBeNull();
    expect(develop.getAttribute('data-sound')).toBe('ui.open');
    expect(screen.queryByText('MAX LEVEL')).toBeNull();
  });

  it('disables Develop with a reason when the gold is short', () => {
    show(archer(3), hud(TowerTalentPricing.BRANCH_COST - 1));

    const develop = screen.getByRole('button', { name: DEVELOP_LABEL });
    expect(develop.getAttribute('aria-disabled')).toBe('true');
    expect(develop.getAttribute('data-sound')).toBe('ui.error');
    const reasonId = develop.getAttribute('aria-describedby')!;
    expect(document.getElementById(reasonId)?.textContent).toBe('Not enough gold');

    fireEvent.click(develop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the branch badge and upgrades along the branch once the type has one', () => {
    show(archer(3, BRANCH_A.id), hud(1000, { [ARCHER.id]: BRANCH_A.id }));

    expect(screen.queryByRole('button', { name: DEVELOP_LABEL })).toBeNull();
    expect(screen.getByRole('note', { name: `Branch: ${BRANCH_A.name}` })).toBeDefined();
    expect(screen.getByText('Lv 3/7')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Upgrade tower to level 4' }).textContent).toContain(
      `$${TowerTalentPricing.GRADE_COSTS[4]}`,
    );
    const next = screen.getByRole('group', { name: `${NEXT_LEVEL_PREVIEW_LABEL} 4` });
    const gradeFour = BRANCH_A.grades[0].stats;
    expect(next.textContent).toContain(`Damage ${gradeFour.damage}`);
  });
});

describe('TowerActionPanel branch chooser', () => {
  it('renders both branches with their grade 4-7 tables, price and the lock warning', () => {
    show(archer(3), hud(1000));
    const dialog = openChooser();

    for (const branch of [BRANCH_A, BRANCH_B]) {
      const card = within(dialog).getByRole('article', { name: branch.name });
      expect(within(card).getAllByText(branch.description).length).toBeGreaterThan(0);
      const table = within(card).getByRole('table', { name: `${branch.name} grades 4 to 7` });
      const gradeHeaders = within(table).getAllByRole('columnheader');
      expect(gradeHeaders.map((cell) => cell.textContent)).toEqual(['Grade', '4', '5', '6', '7']);
      expect(
        within(card).getByRole('button', {
          name: `Choose ${branch.name} for ${TowerTalentPricing.BRANCH_COST} gold`,
        }),
      ).toBeDefined();
    }
    expect(within(dialog).getByText(formatBranchLockWarning(ARCHER.name))).toBeDefined();
  });

  it('sends choose-tower-branch for the confirmed branch and closes', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('choose-tower-branch', handler);
    show(archer(3), hud(1000));
    const dialog = openChooser();

    const confirm = within(dialog).getByRole('button', { name: 'Confirm branch' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(`^Choose ${BRANCH_B.name} for`) }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(`^Confirm ${BRANCH_B.name} for`) }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ towerId: 'tower:archer', branchId: BRANCH_B.id });
    expect(screen.queryByRole('dialog')).toBeNull();
    unsubscribe();
  });

  it('is driven by the keyboard: focus moves in, Tab cycles, Escape cancels', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('choose-tower-branch', handler);
    show(archer(3), hud(1000));
    const develop = screen.getByRole('button', { name: DEVELOP_LABEL });
    develop.focus();
    const dialog = openChooser();

    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
    const firstChoose = within(dialog).getByRole('button', {
      name: new RegExp(`^Choose ${BRANCH_A.name} for`),
    });
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));

    // Enter on a focused native button activates it.
    firstChoose.focus();
    fireEvent.click(document.activeElement!);
    expect(firstChoose.getAttribute('aria-pressed')).toBe('true');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handler).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(develop);
    unsubscribe();
  });
});
