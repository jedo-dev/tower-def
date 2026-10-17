import { describe, expect, it } from 'vitest';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { groupWaveQueueIcons, mapWaveQueueToViewModel } from './mapWaveQueueToViewModel';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 100,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
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
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices: {},
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
    ...overrides,
  };
}

describe('mapWaveQueueToViewModel', () => {
  it('separates baseline hint from enemy sends during build phase', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({
        phase: 'build',
        opponentSendQueue: [
          { creepTypeId: 'undead_ghoul', index: 0 },
          { creepTypeId: 'undead_gargoyle', index: 1 },
        ],
      }),
    );

    expect(vm.headerLabel).toBe('Next: Wave 3');
    expect(vm.baselineHint).toBe('Baseline wave');
    expect(vm.countLabel).toBe('+2 enemy sends');
    expect(vm.sections).toHaveLength(1);
    expect(vm.sections[0].key).toBe('enemy-sends');
    expect(vm.sections[0].items.map((item) => item.creepTypeId)).toEqual([
      'undead_ghoul',
      'undead_gargoyle',
    ]);
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
          { creepTypeId: 'undead_skeleton', index: 0 },
          { creepTypeId: 'undead_ghoul', index: 1 },
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
    expect(vm.enemyFieldStatus).toBeNull();
  });

  it('says the enemy field is still fighting once the player field is clear', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({ phase: 'wave', waveQueue: [], pendingCreepCount: 0 }),
      3,
    );

    expect(vm.emptyText).toBeNull();
    expect(vm.enemyFieldStatus).toBe('Enemy field: 3 left');
  });

  it('keeps the live queue while the player field still has creeps', () => {
    const vm = mapWaveQueueToViewModel(
      createSnapshot({
        phase: 'wave',
        pendingCreepCount: 1,
        waveQueue: [{ creepTypeId: 'undead_ghoul', index: 0 }],
      }),
      4,
    );

    expect(vm.enemyFieldStatus).toBeNull();
    expect(vm.sections[0].key).toBe('live');
  });

  it('ignores enemy field creeps outside the wave phase', () => {
    const vm = mapWaveQueueToViewModel(createSnapshot({ phase: 'build' }), 2);

    expect(vm.enemyFieldStatus).toBeNull();
  });

  it('words the plate subtitle for each phase', () => {
    const send = (creepTypeId: string, index: number) => ({ creepTypeId, index });
    expect(mapWaveQueueToViewModel(createSnapshot({ phase: 'build' })).subtitle).toBe(
      'Baseline wave',
    );
    expect(
      mapWaveQueueToViewModel(
        createSnapshot({ phase: 'build', opponentSendQueue: [send('orc_grunt', 0)] }),
      ).subtitle,
    ).toBe('baseline + 1 enemy send');
    expect(
      mapWaveQueueToViewModel(
        createSnapshot({
          phase: 'build',
          opponentSendQueue: [send('orc_grunt', 0), send('orc_troll', 1), send('orc_grunt', 2)],
        }),
      ).subtitle,
    ).toBe('baseline + 3 enemy sends');
    expect(
      mapWaveQueueToViewModel(createSnapshot({ phase: 'wave', pendingCreepCount: 6 })).subtitle,
    ).toBe('6 creeps');
    expect(mapWaveQueueToViewModel(createSnapshot({ phase: 'wave' })).subtitle).toBe('No enemies');
  });
});

describe('groupWaveQueueIcons', () => {
  it('folds a queue into one entry per creature type with its count, first seen first', () => {
    const icon = (creepTypeId: string) => ({ creepTypeId, name: creepTypeId, faction: undefined });
    const groups = groupWaveQueueIcons(
      ['orc_grunt', 'orc_troll', 'orc_grunt', 'orc_grunt', 'orc_troll', 'orc_tauren'].map(icon),
    );

    expect(groups.map((group) => [group.creepTypeId, group.count, group.countLabel])).toEqual([
      ['orc_grunt', 3, '×3'],
      ['orc_troll', 2, '×2'],
      ['orc_tauren', 1, '×1'],
    ]);
  });
});
