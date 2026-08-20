import { describe, expect, it } from 'vitest';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { mapWaveQueueToViewModel } from './mapWaveQueueToViewModel';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 100,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
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
    ...overrides,
  };
}

describe('mapWaveQueueToViewModel', () => {
  it('separates baseline hint from enemy sends during build phase', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({
        phase: 'build',
        opponentSendQueue: [
          { type: 'ghoul', index: 0 },
          { type: 'gargoyle', index: 1 },
        ],
      }),
    );

    expect(vm.headerLabel).toBe('Next: Wave 3');
    expect(vm.baselineHint).toBe('Baseline wave');
    expect(vm.countLabel).toBe('+2 enemy sends');
    expect(vm.sections).toHaveLength(1);
    expect(vm.sections[0].key).toBe('enemy-sends');
    expect(vm.sections[0].items.map((item) => item.type)).toEqual(['ghoul', 'gargoyle']);
  });

  it('shows no sends section when the enemy queued nothing', () => {
    const vm = mapWaveQueueToViewModel(createSnapshot({ phase: 'build' }));

    expect(vm.baselineHint).toBe('Baseline wave');
    expect(vm.countLabel).toBeNull();
    expect(vm.sections).toHaveLength(0);
    expect(vm.emptyText).toBeNull();
  });

  it('shows the live combined queue during wave phase', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 5,
        waveQueue: [
          { type: 'skeleton', index: 0 },
          { type: 'ghoul', index: 1 },
        ],
      }),
    );

    expect(vm.headerLabel).toBe('Wave 3');
    expect(vm.countLabel).toBe('5 creeps');
    expect(vm.baselineHint).toBeNull();
    expect(vm.sections[0].key).toBe('live');
    expect(vm.sections[0].items).toHaveLength(2);
  });

  it('shows empty state when a wave has no enemies', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({ phase: 'wave', waveQueue: [], pendingCreepCount: 0 }),
    );
    expect(vm.emptyText).toBe('No enemies');
  });
});
