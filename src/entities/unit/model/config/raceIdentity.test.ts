import { describe, expect, it } from 'vitest';
import { elfUnits } from './elf';
import { humanUnits } from './human';
import { orcUnits } from './orc';
import { undeadUnits } from './undead';
import { RaceId } from '../../../../shared/types/content-ids';
import { UnitTier, type UnitConfig } from '../types';

const ROSTERS: Record<RaceId, UnitConfig[]> = {
  [RaceId.UNDEAD]: undeadUnits,
  [RaceId.ORC]: orcUnits,
  [RaceId.HUMAN]: humanUnits,
  [RaceId.ELF]: elfUnits,
};

/**
 * Races declare different tier ranges, so identity is compared over the tiers
 * every race actually fields (1 to 4) instead of the whole roster.
 */
const COMPARABLE_TIERS: readonly UnitTier[] = [
  UnitTier.TIER_1,
  UnitTier.TIER_2,
  UnitTier.TIER_3,
  UnitTier.TIER_4,
];

function averageOf(units: UnitConfig[], read: (unit: UnitConfig) => number): number {
  const comparable = units.filter((unit) => COMPARABLE_TIERS.includes(unit.tier));
  return comparable.reduce((sum, unit) => sum + read(unit), 0) / comparable.length;
}

const averageSpeed = (race: RaceId): number => averageOf(ROSTERS[race], (unit) => unit.speed);
const averageHealth = (race: RaceId): number => averageOf(ROSTERS[race], (unit) => unit.health);
const averageArmor = (race: RaceId): number => averageOf(ROSTERS[race], (unit) => unit.armor);

describe('race identity', () => {
  it('authors every race from content instead of a tier formula', () => {
    for (const [race, roster] of Object.entries(ROSTERS)) {
      expect(roster.length, race).toBeGreaterThan(0);
      expect(roster.every((unit) => unit.faction === race), race).toBe(true);
    }
  });

  it('fields an unbroken tier ladder starting at tier one', () => {
    for (const [race, roster] of Object.entries(ROSTERS)) {
      const tiers = [...new Set(roster.map((unit) => unit.tier))].sort((left, right) => left - right);

      expect(tiers[0], race).toBe(UnitTier.TIER_1);
      tiers.forEach((tier, index) => {
        expect(tier, `${race} tier ladder`).toBe(index + 1);
      });
    }
  });

  it('makes elves the fastest race and humans the slowest', () => {
    expect(averageSpeed(RaceId.ELF)).toBeGreaterThan(averageSpeed(RaceId.UNDEAD));
    expect(averageSpeed(RaceId.UNDEAD)).toBeGreaterThan(averageSpeed(RaceId.ORC));
    expect(averageSpeed(RaceId.ORC)).toBeGreaterThan(averageSpeed(RaceId.HUMAN));
  });

  it('makes humans the armored race and elves the exposed one', () => {
    const armorByRace = [RaceId.UNDEAD, RaceId.ORC, RaceId.ELF].map(averageArmor);

    expect(Math.max(...armorByRace)).toBeLessThan(averageArmor(RaceId.HUMAN));
    expect(Math.min(...armorByRace)).toBe(averageArmor(RaceId.ELF));
  });

  it('makes orcs the bulkiest race and elves the frailest of the living', () => {
    expect(averageHealth(RaceId.ORC)).toBeGreaterThan(averageHealth(RaceId.HUMAN));
    expect(averageHealth(RaceId.HUMAN)).toBeGreaterThan(averageHealth(RaceId.ELF));
  });

  it('gives every race a distinct speed profile', () => {
    const speeds = Object.values(RaceId).map(averageSpeed);

    expect(new Set(speeds).size).toBe(speeds.length);
  });

  it('keeps a fast frail outlier inside each race', () => {
    for (const [race, roster] of Object.entries(ROSTERS)) {
      const fastest = [...roster].sort((left, right) => right.speed - left.speed)[0];
      const slowest = [...roster].sort((left, right) => left.speed - right.speed)[0];

      expect(fastest.speed, `${race} spread`).toBeGreaterThan(slowest.speed * 1.3);
      expect(fastest.health, `${race} fast unit is frail`).toBeLessThan(slowest.health);
    }
  });
});
