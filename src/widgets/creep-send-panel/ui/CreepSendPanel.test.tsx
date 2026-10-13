// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
  matchOutcome: { status: 'active', winner: null },
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

afterEach(cleanup);

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
