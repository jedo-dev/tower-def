// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import type { CreepSendLimitsSnapshot } from '../../../shared/lib/game-bridge/types';
import { CreepSendPanel } from './CreepSendPanel';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { UNIT_SPRITE_ASSETS, UNIT_SPRITE_KEYS } from '../../../shared/constants/sprites';
import { toUnitPortraitSource } from '../../../shared/ui/unit-icon';
import { toFactionEmblemSource } from '../../../shared/ui/faction-emblem';

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

function renderPanel(isDevelopMode = false): void {
  render(
    <CreepSendPanel
      setup={createSetup(RaceId.ORC)}
      isDevelopMode={isDevelopMode}
      onDevelopModeChange={() => undefined}
    />,
  );
}

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
    renderPanel();
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

    // The tab rail prints "SEND 9/12"; the panel keeps the sentence for screen readers.
    expect(document.querySelector('[data-send-capacity]')?.textContent).toBe(
      '9 of 12 sends left this wave',
    );
    const grunt = screen.getByRole('button', { name: /Send Grunt/ });
    expect(grunt.getAttribute('aria-label')).toContain('3 of 6 left');
    expect(grunt.querySelector('[data-send-remaining]')?.textContent).toBe('3/6');
    expect((grunt as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables a creep whose type cap is reached', () => {
    renderPanel();
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

    const grunt = screen.getByRole('button', { name: /^Cannot send Grunt: send limit reached/ });
    expect((grunt as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables every creep once the wave cap is reached', () => {
    renderPanel();
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

    const buttons = screen.getAllByRole('button', { name: /send/i });
    expect(buttons.length).toBe(4);
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByText('0 of 12 sends left this wave')).toBeDefined();
  });
});

describe('CreepSendPanel', () => {
  it('shows the painted creep portrait on a send chip', () => {
    renderPanel();

    const icon = screen.getByRole('img', { name: 'Grunt' });

    expect(icon.querySelector('img')?.getAttribute('src')).toBe(toUnitPortraitSource('orc_grunt'));
  });

  it('falls back to the battlefield sprite when the portrait fails to load', () => {
    renderPanel();

    const portrait = screen.getByRole('img', { name: 'Grunt' }).querySelector('img');
    if (!portrait) throw new Error('portrait not rendered');
    fireEvent.error(portrait);

    expect(screen.getByRole('img', { name: 'Grunt' }).style.backgroundImage).toContain(
      UNIT_SPRITE_ASSETS[UNIT_SPRITE_KEYS.ORC_GRUNT],
    );
  });
});

describe('CreepSendPanel note line', () => {
  it('says what is queued in send mode and lists tier experience in develop mode', () => {
    renderPanel();
    const note = document.querySelector('[data-send-queue]');
    expect(note?.firstElementChild?.textContent).toBe('No sends queued');
    expect(screen.queryByRole('list', { name: 'Creature experience by tier' })).toBeNull();
    cleanup();

    renderPanel(true);
    expect(document.querySelector('[data-send-queue]')).toBeNull();
    expect(screen.getByRole('list', { name: 'Creature experience by tier' })).toBeDefined();
  });

  it('carries no heading or gold line of its own: the dock rail and status bar show them', () => {
    renderPanel();

    expect(document.querySelector('.ui-heading')).toBeNull();
    expect(document.querySelector(`img[src="${toFactionEmblemSource(RaceId.ORC)}"]`)).toBeNull();
    expect(screen.queryByLabelText(/^Gold /)).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
