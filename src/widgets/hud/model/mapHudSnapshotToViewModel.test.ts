import { describe, expect, it } from 'vitest';
import { mapBattlefieldViewToggleToViewModel, mapHudSnapshotToViewModel } from './mapHudSnapshotToViewModel';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

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
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

describe('mapHudSnapshotToViewModel', () => {
  it('maps game-over phase to readable label', () => {
    const vm = mapHudSnapshotToViewModel(createSnapshot({ phase: 'game-over' }));

    expect(vm.phaseLabel).toBe('Game Over');
  });

  it('marks start wave disabled during active wave', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({ phase: 'wave', canStartWave: true }),
    );

    expect(vm.isStartWaveDisabled).toBe(true);
  });

  it('marks start wave disabled when command is unavailable', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({ phase: 'build', canStartWave: false }),
    );

    expect(vm.isStartWaveDisabled).toBe(true);
  });

  it('maps selected archer to build mode and selected flag', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({ selectedTowerType: 'single' }),
    );

    expect(vm.selectedTowerLabel).toBe('Archer');
    expect(vm.modeLabel).toBe('Build: Archer');
    expect(vm.isArcherSelected).toBe(true);
  });

  it('maps no selection to inspect mode', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({ selectedTowerType: null }),
    );

    expect(vm.selectedTowerLabel).toBe('None');
    expect(vm.modeLabel).toBe('Tap a tower to inspect');
    expect(vm.isArcherSelected).toBe(false);
  });

  it('maps duel readability lines from snapshot fields', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({
        income: 35,
        opponentLives: 14,
        opponentIncome: 60,
      }),
    );

    expect(vm.duel.playerLine).toBe('You +35');
    expect(vm.duel.opponentLine).toBe('Enemy 14 HP · +60');
    expect(vm.duel.ariaLabel).toContain('income 35');
    expect(vm.duel.ariaLabel).toContain('14 lives');
  });

  it('shows queued enemy sends during build phase', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({
        phase: 'build',
        opponentSendQueue: [
          { type: 'skeleton', index: 0 },
          { type: 'ghoul', index: 1 },
          { type: 'crypt_fiend', index: 2 },
          { type: 'gargoyle', index: 3 },
        ],
      }),
    );

    expect(vm.pressure).toEqual({
      level: 'medium',
      label: 'Enemy sends 4',
      detail: 'Queued for next wave',
      queuedCount: 4,
      incomingCount: 0,
      ariaLabel: 'Enemy sends 4. Queued for next wave. Pressure medium',
    });
  });

  it('shows active incoming creep pressure during wave phase', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 8,
        opponentSendQueue: [{ type: 'skeleton', index: 0 }],
      }),
    );

    expect(vm.pressure).toEqual({
      level: 'high',
      label: 'Incoming 8',
      detail: '1 queued by enemy',
      queuedCount: 1,
      incomingCount: 8,
      ariaLabel: 'Incoming 8. 1 queued by enemy. Pressure high',
    });
  });

  it('hides opponent battlefield toggle during build phase', () => {
    const vm = mapBattlefieldViewToggleToViewModel(
      createSnapshot({ phase: 'build' }),
      'player',
    );

    expect(vm.isVisible).toBe(false);
    expect(vm.nextView).toBe('opponent');
    expect(vm.ariaLabel).toBe('Show opponent battlefield');
  });

  it('shows opponent battlefield toggle during battle phase', () => {
    const vm = mapBattlefieldViewToggleToViewModel(
      createSnapshot({ phase: 'wave' }),
      'player',
    );

    expect(vm.isVisible).toBe(true);
    expect(vm.isOpponentActive).toBe(false);
    expect(vm.label).toBe('Enemy');
    expect(vm.nextView).toBe('opponent');
  });

  it('marks opponent battlefield toggle active with a return aria label', () => {
    const vm = mapBattlefieldViewToggleToViewModel(
      createSnapshot({ phase: 'wave' }),
      'opponent',
    );

    expect(vm.isVisible).toBe(true);
    expect(vm.isOpponentActive).toBe(true);
    expect(vm.label).toBe('Mine');
    expect(vm.ariaLabel).toBe('Show player battlefield');
    expect(vm.nextView).toBe('player');
  });
});

