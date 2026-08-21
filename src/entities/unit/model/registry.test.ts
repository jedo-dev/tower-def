import { describe, expect, it } from 'vitest';
import {
  getAllUnitConfigs,
  getUnitsByFaction,
  resolveUnitConfigById,
  selectFactionRoster,
  tryResolveUnitConfigById,
} from './registry';
import { UNIT_IDS, type UnitId } from './types';
import { RACE_IDS, RaceId } from '../../../shared/types/content-ids';

describe('unit registry', () => {
  it('loads every authored creature exactly once', () => {
    const units = getAllUnitConfigs();
    const ids = units.map((unit) => unit.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(units.length).toBe(UNIT_IDS.length);
  });

  it('covers every race', () => {
    for (const race of RACE_IDS) {
      expect(getUnitsByFaction(race).length, race).toBeGreaterThan(0);
    }
  });

  it('resolves a creature by id', () => {
    const ghoul = resolveUnitConfigById('undead_ghoul');

    expect(ghoul.name).toBe('Ghoul');
    expect(ghoul.faction).toBe(RaceId.UNDEAD);
  });

  it('throws for an id that has no content', () => {
    expect(() => resolveUnitConfigById('undead_lich' as UnitId))
      .toThrow('Missing unit config for id: undead_lich');
    expect(tryResolveUnitConfigById('undead_lich' as UnitId)).toBeUndefined();
  });

  it('hands out an owned copy of a faction roster', () => {
    const first = selectFactionRoster(RaceId.ELF);
    const second = selectFactionRoster(RaceId.ELF);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);

    first.pop();
    expect(selectFactionRoster(RaceId.ELF)).toHaveLength(second.length);
  });
});
