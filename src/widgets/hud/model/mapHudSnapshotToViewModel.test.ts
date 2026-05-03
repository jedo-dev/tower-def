import { describe, expect, it } from 'vitest';
import { mapHudSnapshotToViewModel } from './mapHudSnapshotToViewModel';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

function createSnapshot(overrides: Partial<GameHudSnapshot> = {}): GameHudSnapshot {
  return {
    gold: 100,
    lives: 20,
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
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
      createSnapshot({ selectedTowerType: 'archer' }),
    );

    expect(vm.selectedTowerLabel).toBe('Archer');
    expect(vm.modeLabel).toBe('Build (placeholder)');
    expect(vm.isArcherSelected).toBe(true);
  });

  it('maps no selection to sell placeholder mode', () => {
    const vm = mapHudSnapshotToViewModel(
      createSnapshot({ selectedTowerType: null }),
    );

    expect(vm.selectedTowerLabel).toBe('None');
    expect(vm.modeLabel).toBe('Sell (placeholder)');
    expect(vm.isArcherSelected).toBe(false);
  });
});

