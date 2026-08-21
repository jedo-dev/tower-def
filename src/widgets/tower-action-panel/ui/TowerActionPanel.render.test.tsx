// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { publishGameEvent, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot, SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { getTowerStatsForLevel } from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { TowerActionPanel } from './TowerActionPanel';

function createHudSnapshot(): GameHudSnapshot {
  return {
    gold: 1000,
    income: 40,
    lives: 20,
    opponentGold: 400,
    opponentIncome: 40,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null },
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
  };
}

function selectTower(type: TowerTypeId, level = 1): SelectedTowerSnapshot {
  const stats = getTowerStatsForLevel(type, level)!;

  return {
    id: `tower:${type}`,
    type,
    level,
    position: { x: 4, y: 4 },
    cost: 60,
    combatStats: { ...stats },
  };
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  publishGameEvent('selected-tower', { tower: null });
  consoleError.mockClear();
});

describe('TowerActionPanel effects', () => {
  it('lists what a frost tower does beyond damage', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.FROST) });
    });

    const effects = screen.getByRole('list', { name: 'Tower effects' });

    expect(within(effects).getByText('SLOW')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows no effect list for a plain single target tower', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SINGLE) });
    });

    expect(screen.queryByRole('list', { name: 'Tower effects' })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('previews what the next level changes about the effect', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.POISON) });
    });

    const nextLevel = screen.getByRole('list', { name: 'Next level effects' });

    expect(within(nextLevel).getByText(/POISON/)).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('drops the upgrade preview at max level', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.POISON, 3) });
    });

    expect(screen.queryByRole('list', { name: 'Next level effects' })).toBeNull();
    expect(screen.getByText('MAX LEVEL')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
