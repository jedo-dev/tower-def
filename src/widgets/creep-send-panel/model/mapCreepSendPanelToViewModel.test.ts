import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { Difficulty } from '../../../entities/difficulty';
import { mapCreepSendPanelToViewModel } from './mapCreepSendPanelToViewModel';

function createSnapshot(overrides: Partial<GameHudSnapshot> = {}): GameHudSnapshot {
  return {
    gold: 100,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: {
      status: 'active',
      winner: null,
    },
    builderFactionName: 'Undead',
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

function createSetup(builderFaction: RaceId): GameSetupConfig {
  return {
    builderFaction,
    enemyFaction: RaceId.ORC,
    difficulty: Difficulty.NORMAL,
  };
}

describe('mapCreepSendPanelToViewModel', () => {
  it('lists race-specific sendable creeps with cost and income gain', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot(),
      createSetup(RaceId.UNDEAD),
    );

    expect(viewModel.raceName).toBe('Undead');
    expect(viewModel.buttons.map((button) => button.creepTypeId)).toEqual([
      'undead_skeleton',
      'undead_ghoul',
      'undead_crypt_fiend',
      'undead_gargoyle',
    ]);
    expect(viewModel.buttons[0]).toMatchObject({
      name: 'Skeleton',
      tier: 1,
      cost: 50,
      incomeGain: 10,
      isAffordable: true,
      isDisabled: false,
      disabledReason: null,
      ariaLabel: 'Send Skeleton for 50 gold and gain 10 income',
    });
  });

  it('marks unaffordable creep sends disabled', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ gold: 40 }),
      createSetup(RaceId.UNDEAD),
    );

    expect(viewModel.buttons[0].isAffordable).toBe(false);
    expect(viewModel.buttons[0].isDisabled).toBe(true);
    expect(viewModel.buttons[0].disabledReason).toBe('requires 50 gold');
    expect(viewModel.buttons[0].ariaLabel).toBe('Cannot send Skeleton: requires 50 gold');
  });

  it('disables send buttons during active battle phase', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ phase: 'wave', gold: 500 }),
      createSetup(RaceId.ORC),
    );

    expect(viewModel.isBattleActive).toBe(true);
    expect(viewModel.buttons.every((button) => button.isDisabled)).toBe(true);
    expect(viewModel.buttons[0].disabledReason).toBe('sending is locked during battle');
    expect(viewModel.buttons[0].ariaLabel).toBe(
      'Cannot send Grunt: sending is locked during battle',
    );
  });

  it('summarizes queued player sends from the event-driven snapshot', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({
        playerSendQueue: [
          { type: 'skeleton', index: 0 },
          { type: 'ghoul', index: 1 },
        ],
      }),
      createSetup(RaceId.UNDEAD),
    );

    expect(viewModel.queueCount).toBe(2);
    expect(viewModel.queueSummary).toBe('2 queued');
  });

  it('uses undead registry as a safe fallback before setup is available', () => {
    const viewModel = mapCreepSendPanelToViewModel(createSnapshot(), null);

    expect(viewModel.raceName).toBe('Undead');
    expect(viewModel.buttons[0].creepTypeId).toBe('undead_skeleton');
  });
});
