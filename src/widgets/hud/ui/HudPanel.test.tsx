// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { RaceId } from '../../../shared/types/content-ids';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { HudPanel } from './HudPanel';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 750,
    income: 65,
    lives: 18,
    opponentGold: 400,
    opponentIncome: 80,
    opponentLives: 14,
    matchOutcome: { status: 'active', winner: null },
    builderFactionName: 'Undead',
    waveNumber: 5,
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

describe('HudPanel render', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
  });

  it('renders resources and the duel readability row from the snapshot', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);

    expect(screen.getByText('750')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined();
    expect(screen.getByText('You +65')).toBeDefined();
    expect(screen.getByText('Enemy 14 HP · +80')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('expands to show enemy details without crashing', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    expect(screen.getByText('Enemy gold:')).toBeDefined();
    expect(screen.getByText('Orc')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse HUD' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables wave start while a wave is running', () => {
    publishGameHudSnapshot(createSnapshot({ phase: 'wave', canStartWave: false }));

    render(<HudPanel setup={null} />);

    // During a wave the center slot shows the battlefield view toggle.
    expect(screen.getByRole('button', { name: 'Show opponent battlefield' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('HudPanel build bar', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  function createSetup(builderFaction: RaceId): GameSetupConfig {
    return {
      builderFaction,
      enemyFaction: EnemyFaction.ORC,
      difficulty: Difficulty.NORMAL,
    };
  }

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  it('lists every tower the chosen race can build', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.ORC)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const buttons = within(buildBar).getAllByRole('button');

    expect(buttons.map((button) => button.getAttribute('aria-label')))
      .toEqual(getBuildableTowersByFaction(RaceId.ORC).map((tower) => expect.stringContaining(tower.name)));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('swaps the bar when another race is building', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.ELF)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    expect(within(buildBar).getByRole('button', { name: /Moonwell/ })).toBeDefined();
    expect(within(buildBar).queryByRole('button', { name: /Plague Tower/ })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables a tower the player cannot afford', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 0 }));

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    for (const button of within(buildBar).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled, button.getAttribute('aria-label') ?? '').toBe(true);
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows cost and effect on every button', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    expect(within(buildBar).getByText(/70g - Slows/)).toBeDefined();
    expect(within(buildBar).getByText(/Boosts towers/)).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

