import { describe, expect, it } from 'vitest';
import { getTowerStatsForLevel } from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { mapTowerNextLevelPreview } from './mapTowerNextLevelPreview';
import {
  formatTowerSheetDelta,
  mapTowerSheetNextItems,
  mapTowerSheetStatTiles,
} from './mapTowerSheetStats';

describe('mapTowerSheetStatTiles', () => {
  it('gives damage, range and cooldown tiles with the values the upgrade reaches', () => {
    const current = getTowerStatsForLevel(TowerTypeId.SINGLE, 1)!;
    const next = getTowerStatsForLevel(TowerTypeId.SINGLE, 2)!;
    const preview = mapTowerNextLevelPreview(TowerTypeId.SINGLE, current, next, 2);

    const tiles = mapTowerSheetStatTiles(current, next, preview);

    expect(tiles.map((tile) => tile.name)).toEqual(['Damage', 'Range', 'Cooldown']);
    expect(tiles[0]).toMatchObject({
      value: String(current.damage),
      nextValue: String(next.damage),
    });
    expect(tiles[2]).toMatchObject({
      value: `${(current.attackCooldownMs / 1000).toFixed(2)}s`,
      nextValue: (next.attackCooldownMs / 1000).toFixed(2),
    });
  });

  it('adds a splash tile for a splash tower and leaves next values out at max level', () => {
    const current = getTowerStatsForLevel(TowerTypeId.SPLASH, 3)!;

    const tiles = mapTowerSheetStatTiles(current, null, null);

    expect(tiles.map((tile) => tile.key)).toEqual(['damage', 'range', 'cooldown', 'splash']);
    expect(tiles.every((tile) => tile.nextValue === null)).toBe(true);
  });
});

describe('mapTowerSheetNextItems', () => {
  it('writes the NEXT line in the sheet wording, effects after the stats', () => {
    const current = getTowerStatsForLevel(TowerTypeId.POISON, 1)!;
    const next = getTowerStatsForLevel(TowerTypeId.POISON, 2)!;
    const preview = mapTowerNextLevelPreview(TowerTypeId.POISON, current, next, 2);

    const items = mapTowerSheetNextItems(preview);

    expect(items[0]).toBe(`+${next.damage - current.damage} damage`);
    expect(items.some((item) => item.startsWith('POISON'))).toBe(true);
  });

  it('signs a faster cooldown with a minus in seconds', () => {
    expect(
      formatTowerSheetDelta({
        key: 'cooldown',
        shortLabel: 'SPD',
        name: 'Attack cooldown',
        value: '750ms',
        delta: '-50ms',
        difference: -50,
      }),
    ).toBe('−0.05s');
  });
});
