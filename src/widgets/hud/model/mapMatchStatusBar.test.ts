import { describe, expect, it } from 'vitest';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import {
  formatAutoStartCountdown,
  mapMatchStartWave,
  mapMatchStatusBar,
} from './mapMatchStatusBar';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 335,
    income: 50,
    lives: 20,
    opponentGold: 120,
    opponentIncome: 60,
    opponentLives: 18,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 6,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: 28,
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

describe('formatAutoStartCountdown', () => {
  it('prints minutes bare and seconds padded, never below zero', () => {
    expect(formatAutoStartCountdown(28)).toBe('0:28');
    expect(formatAutoStartCountdown(65)).toBe('1:05');
    expect(formatAutoStartCountdown(0)).toBe('0:00');
    expect(formatAutoStartCountdown(-3)).toBe('0:00');
  });
});

describe('mapMatchStartWave', () => {
  it('names the next wave and carries the countdown in the second line', () => {
    expect(mapMatchStartWave(createSnapshot())).toEqual({
      label: 'Start wave 6',
      countdownLabel: 'auto in 0:28',
      isDisabled: false,
    });
    expect(mapMatchStartWave(createSnapshot({ autoStartSecondsLeft: null })).countdownLabel).toBe(
      null,
    );
  });

  it('is disabled during the wave and whenever the engine refuses a start', () => {
    expect(mapMatchStartWave(createSnapshot({ phase: 'wave' })).isDisabled).toBe(true);
    expect(mapMatchStartWave(createSnapshot({ canStartWave: false })).isDisabled).toBe(true);
  });
});

describe('mapMatchStatusBar', () => {
  it('maps gold, income per wave and both sides of lives', () => {
    const viewModel = mapMatchStatusBar(createSnapshot());

    expect(viewModel.gold).toBe(335);
    expect(viewModel.incomeLabel).toBe('+50/wave');
    expect(viewModel.lives).toBe(20);
    expect(viewModel.opponentLives).toBe(18);
    expect(viewModel.duelAriaLabel).toBe(
      'Your lives 20, enemy lives 18. Your income 50, enemy income 60',
    );
    expect(viewModel.duelTooltip).toBe('Enemy: 18 lives, 120 gold, +60/wave');
  });
});
