import { describe, expect, it } from 'vitest';
import {
  mapTowerEffectsToLines,
  mapTowerEffectUpgradeDeltas,
} from './mapTowerEffectsToLines';
import {
  getTowerStatsForLevel,
  TOWER_COMBAT_STATS_BY_TYPE,
} from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';

function statsFor(towerType: TowerTypeId, level = 1) {
  return getTowerStatsForLevel(towerType, level) ?? TOWER_COMBAT_STATS_BY_TYPE[towerType];
}

describe('mapTowerEffectsToLines', () => {
  it('says nothing extra about a plain single target tower', () => {
    expect(mapTowerEffectsToLines(TowerTypeId.SINGLE, statsFor(TowerTypeId.SINGLE))).toEqual([]);
  });

  it('describes the slow a frost tower applies', () => {
    const [line] = mapTowerEffectsToLines(TowerTypeId.FROST, statsFor(TowerTypeId.FROST));

    expect(line.label).toBe('SLOW');
    expect(line.value).toMatch(/^\d+% \/ \d\.\ds$/);
  });

  it('describes poison as damage per second with its stack cap', () => {
    const [line] = mapTowerEffectsToLines(TowerTypeId.POISON, statsFor(TowerTypeId.POISON));

    expect(line.label).toBe('POISON');
    expect(line.value).toMatch(/^\d+\/s x\d \/ \d\.\ds$/);
  });

  it('describes the jumps of a chain tower', () => {
    const [line] = mapTowerEffectsToLines(TowerTypeId.CHAIN, statsFor(TowerTypeId.CHAIN));

    expect(line.label).toBe('CHAIN');
    expect(line.value).toContain('jumps');
  });

  it('describes what a support aura gives its neighbours', () => {
    const [line] = mapTowerEffectsToLines(TowerTypeId.SUPPORT, statsFor(TowerTypeId.SUPPORT));

    expect(line.label).toBe('AURA');
    expect(line.value).toContain('speed');
    expect(line.value).toContain('range');
  });
});

describe('mapTowerEffectUpgradeDeltas', () => {
  it('shows the stronger slow the next frost level buys', () => {
    const deltas = mapTowerEffectUpgradeDeltas(
      TowerTypeId.FROST,
      statsFor(TowerTypeId.FROST, 1),
      statsFor(TowerTypeId.FROST, 2),
    );

    expect(deltas).toHaveLength(1);
    expect(deltas[0].label).toBe('SLOW');
    expect(deltas[0].value).not.toBe(
      mapTowerEffectsToLines(TowerTypeId.FROST, statsFor(TowerTypeId.FROST, 1))[0].value,
    );
  });

  it('shows nothing when an upgrade only adds damage', () => {
    const deltas = mapTowerEffectUpgradeDeltas(
      TowerTypeId.SINGLE,
      statsFor(TowerTypeId.SINGLE, 1),
      statsFor(TowerTypeId.SINGLE, 2),
    );

    expect(deltas).toEqual([]);
  });
});
