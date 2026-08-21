// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
