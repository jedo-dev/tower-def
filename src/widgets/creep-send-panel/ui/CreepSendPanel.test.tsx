// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import type { CreepSendLimitsSnapshot } from '../../../shared/lib/game-bridge/types';
import { CreepSendPanel } from './CreepSendPanel';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { UNIT_SPRITE_ASSETS, UNIT_SPRITE_KEYS } from '../../../shared/constants/sprites';

const snapshot: GameHudSnapshot = {
  gold: 1000,
  income: 50,
  lives: 20,
  opponentGold: 500,
  opponentIncome: 50,
  opponentLives: 20,
  matchOutcome: { status: 'active', winner: null, reason: null },
  builderFactionName: 'Orc',
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
  isPaused: false,
  gameSpeed: 1,
  towerBranchChoices: {},
  creatureXpByTier: {},
  creatureBranchChoices: {},
  creatureGrades: {},
};

vi.mock('../../../shared/lib/game-bridge/useGameHudSnapshot', () => ({
  useGameHudSnapshot: () => snapshot,
}));

function createSetup(builderFaction: RaceId): GameSetupConfig {
  return {
    builderFaction,
    enemyFaction: RaceId.ORC,
    difficulty: Difficulty.NORMAL,
  };
}

const consoleErrorSpy = vi.spyOn(console, 'error');

afterEach(() => {
  cleanup();
  expect(consoleErrorSpy).not.toHaveBeenCalled();
  consoleErrorSpy.mockClear();
});

function publishOrcSendLimits(
  waveSendsRemaining: number,
  units: CreepSendLimitsSnapshot['units'],
): void {
  act(() => {
    publishGameEvent('send-limits-updated', {
      owner: 'player',
      waveSendCap: 12,
      waveSendsRemaining,
      units,
    });
  });
}

describe('CreepSendPanel send limits', () => {
  it('shows remaining wave capacity and per-type counters from the bridge event', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.ORC)} />);
    publishOrcSendLimits(9, [
      {
        creepTypeId: 'orc_grunt',
        cap: 6,
        remaining: 3,
        availableBranches: [],
        branchCostXp: 4,
        grade: 0,
        nextUpgradeCostXp: 6,
      },
      {
        creepTypeId: 'orc_wolf_rider',
        cap: 5,
        remaining: 5,
        availableBranches: [],
        branchCostXp: 4,
        grade: 0,
        nextUpgradeCostXp: 6,
      },
    ]);

    expect(screen.getByLabelText('9 of 12 sends left this wave').textContent).toBe('9/12 left');
    const grunt = screen.getByRole('button', { name: /Send Grunt/ });
    expect(grunt.getAttribute('aria-label')).toContain('3 of 6 left');
    expect(grunt.querySelector('[data-send-remaining]')?.textContent).toBe('3/6');
    expect((grunt as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables a creep whose type cap is reached', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.ORC)} />);
    publishOrcSendLimits(6, [
      {
        creepTypeId: 'orc_grunt',
        cap: 6,
        remaining: 0,
        availableBranches: [],
        branchCostXp: 4,
        grade: 0,
        nextUpgradeCostXp: 6,
      },
    ]);

    const grunt = screen.getByRole('button', { name: 'Cannot send Grunt: send limit reached' });
    expect((grunt as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables every creep once the wave cap is reached', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.ORC)} />);
    publishOrcSendLimits(0, [
      {
        creepTypeId: 'orc_grunt',
        cap: 6,
        remaining: 0,
        availableBranches: [],
        branchCostXp: 4,
        grade: 0,
        nextUpgradeCostXp: 6,
      },
    ]);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByLabelText('0 of 12 sends left this wave')).toBeDefined();
  });
});

describe('CreepSendPanel', () => {
  it('shows the creep portrait on a send chip that has art', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.ORC)} />);

    const icon = screen.getByRole('img', { name: 'Grunt' });

    expect(icon.style.backgroundImage).toContain(UNIT_SPRITE_ASSETS[UNIT_SPRITE_KEYS.ORC_GRUNT]);
  });

  it('keeps the question chip for a race whose art is not drawn yet', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.HUMAN)} />);

    expect(screen.getByRole('img', { name: 'Militia: artwork pending' })).toBeDefined();
    expect(screen.queryByRole('img', { name: 'Militia' })).toBeNull();
  });
});

describe('CreepSendPanel compact mode', () => {
  it('folds to its header while the build drawer owns the strip', () => {
    render(<CreepSendPanel setup={createSetup(RaceId.ORC)} isCompact />);

    expect(screen.getByText('Send Orc')).toBeDefined();
    expect(screen.getByLabelText('Gold 1000, income 50')).toBeDefined();
    expect(screen.queryByText('No sends queued')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the send cards again once the drawer closes', () => {
    const { rerender } = render(<CreepSendPanel setup={createSetup(RaceId.ORC)} isCompact />);
    rerender(<CreepSendPanel setup={createSetup(RaceId.ORC)} isCompact={false} />);

    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
