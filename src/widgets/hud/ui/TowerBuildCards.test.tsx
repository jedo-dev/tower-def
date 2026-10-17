// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Difficulty } from '../../../entities/difficulty';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import {
  onGameCommand,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { RaceId } from '../../../shared/types/content-ids';
import { injectCssModule } from '../../../shared/test/injectCssModule';
import { toTalentIconSource } from '../../../shared/ui/branch-glyph';
import { toTowerIconSource } from '../../../shared/ui/tower-icon';
import {
  BUILD_PHASE_ONLY_HINT,
  BUILDABLE_TOWERS_LABEL,
  PICK_TOWER_HINT,
  TowerBuildCards,
} from './TowerBuildCards';
import styles from './TowerBuildCards.module.css';
import towerCardsCss from './TowerBuildCards.module.css?raw';

function createSetup(builderFaction: RaceId): GameSetupConfig {
  return { builderFaction, enemyFaction: RaceId.ORC, difficulty: Difficulty.NORMAL };
}

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
    waveNumber: 2,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
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

const cards = () =>
  within(screen.getByRole('group', { name: BUILDABLE_TOWERS_LABEL })).getAllByRole('button');
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
let injectedStyles: { remove: () => void } | null = null;

afterEach(() => {
  cleanup();
  injectedStyles?.remove();
  injectedStyles = null;
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('TowerBuildCards', () => {
  it('shows one card per tower the race builds, with its painted icon', () => {
    publishGameHudSnapshot(createSnapshot());
    render(<TowerBuildCards setup={createSetup(RaceId.ORC)} />);

    const towers = getBuildableTowersByFaction(RaceId.ORC);
    expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual(
      towers.map((tower) => expect.stringContaining(tower.name)),
    );
    expect(
      cards().map((card) =>
        within(card).getByRole('img').querySelector('img')?.getAttribute('src'),
      ),
    ).toEqual(towers.map((tower) => toTowerIconSource(tower.id)));
  });

  it('prints the price on every card and keeps the effect hint as a tooltip', () => {
    publishGameHudSnapshot(createSnapshot());
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    for (const tower of getBuildableTowersByFaction(RaceId.UNDEAD)) {
      const card = screen.getByRole('button', { name: new RegExp(`^${tower.name},`) });
      expect(card.textContent).toContain(`$${tower.costGold}`);
    }
    expect(screen.getByTitle(/Slows/)).toBeDefined();
    expect(screen.getByText(PICK_TOWER_HINT)).toBeDefined();
  });

  it('disables a card the player cannot afford and says how much gold is missing', () => {
    const towers = getBuildableTowersByFaction(RaceId.UNDEAD);
    const cheapest = Math.min(...towers.map((tower) => tower.costGold));
    const gold = cheapest;
    publishGameHudSnapshot(createSnapshot({ gold }));
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    for (const tower of towers) {
      const card = screen.getByRole('button', {
        name: new RegExp(`^${tower.name},`),
      }) as HTMLButtonElement;
      const reason = card.querySelector('[data-tower-card-reason]');
      if (tower.costGold > gold) {
        expect(card.disabled, tower.name).toBe(true);
        expect(reason?.textContent).toBe(`Need $${tower.costGold - gold}`);
        expect(card.textContent).not.toContain(`$${tower.costGold}`);
      } else {
        expect(card.disabled, tower.name).toBe(false);
        expect(reason).toBeNull();
      }
    }
  });

  it('picks a tower on tap and drops the pick on a second tap', () => {
    const [archer] = getBuildableTowersByFaction(RaceId.UNDEAD);
    publishGameHudSnapshot(createSnapshot());
    const selectTower = vi.fn();
    const unsubscribe = onGameCommand('select-tower', selectTower);
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    fireEvent.click(cards()[0]);
    expect(selectTower).toHaveBeenLastCalledWith({ towerType: archer.towerType });

    act(() => publishGameHudSnapshot(createSnapshot({ selectedTowerType: archer.towerType })));
    const [picked] = cards();
    expect(picked.getAttribute('aria-pressed')).toBe('true');
    expect(picked.classList.contains(styles.cardSelected)).toBe(true);
    expect(screen.getByText(`Tap the board to build ${archer.name}`)).toBeDefined();

    fireEvent.click(picked);
    expect(selectTower).toHaveBeenLastCalledWith({ towerType: null });
    unsubscribe();
  });

  it('marks a tower type with its chosen talent branch and names it in the tooltip', () => {
    const [archer, plague] = getBuildableTowersByFaction(RaceId.UNDEAD);
    const branch = archer.talentBranches[1];
    publishGameHudSnapshot(createSnapshot({ towerBranchChoices: { [archer.id]: branch.id } }));
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    const archerCard = screen.getByRole('button', { name: new RegExp(`^${archer.name},`) });
    const plagueCard = screen.getByRole('button', { name: new RegExp(`^${plague.name},`) });
    expect(
      within(archerCard).getByTestId('branch-glyph').querySelector('img')?.getAttribute('src'),
    ).toBe(toTalentIconSource(branch.id));
    expect(archerCard.getAttribute('title')).toBe(`${archer.name} — ${branch.name}`);
    expect(within(plagueCard).queryByTestId('branch-glyph')).toBeNull();
  });

  it('locks the cards with a build-phase-only note during a wave', () => {
    publishGameHudSnapshot(createSnapshot({ phase: 'wave', canStartWave: false }));
    const selectTower = vi.fn();
    const unsubscribe = onGameCommand('select-tower', selectTower);
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    for (const card of cards()) {
      expect(card.getAttribute('aria-disabled')).toBe('true');
      expect(card.getAttribute('title')).toBe(BUILD_PHASE_ONLY_HINT);
    }
    expect(screen.getByRole('note').textContent).toBe(BUILD_PHASE_ONLY_HINT);
    fireEvent.click(cards()[0]);
    expect(selectTower).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('lays the four cards out in one fixed-height row of 44px-plus targets', () => {
    injectedStyles = injectCssModule(towerCardsCss, styles);
    publishGameHudSnapshot(createSnapshot());
    render(<TowerBuildCards setup={createSetup(RaceId.UNDEAD)} />);

    const row = screen.getByRole('group', { name: BUILDABLE_TOWERS_LABEL });
    expect(getComputedStyle(row).display).toBe('grid');
    expect(getComputedStyle(row).gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(getComputedStyle(row).height).toBe('var(--match-card-height)');
    expect(getComputedStyle(cards()[0]).minHeight).toBe('var(--touch-target-min)');
  });
});
