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
 * Identity is compared over the opening tiers (1 to 4), the creatures that
 * decide the early waves and duel sends; tiers 5 and 6 are late-game heavies
 * that follow the same shape in every race.
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
const averageArmor = (race: RaceId): number =>
  averageOf(ROSTERS[race], (unit) => unit.physicalArmor);

type ArmorAxis = 'physicalArmor' | 'magicalArmor';

/** Armor profiles compare the whole roster: late heavies carry the race's strong axis. */
function rosterAverageArmor(race: RaceId, axis: ArmorAxis): number {
  const roster = ROSTERS[race];
  return roster.reduce((sum, unit) => sum + unit[axis], 0) / roster.length;
}

/** Authored averages, mirrored in docs/08 "Race armor profiles"; update both together. */
const RACE_ARMOR_PROFILES: Record<RaceId, { physical: number; magical: number }> = {
  [RaceId.UNDEAD]: { physical: 1.875, magical: 8.625 },
  [RaceId.ORC]: { physical: 6.125, magical: 1.125 },
  [RaceId.HUMAN]: { physical: 5.125, magical: 4 },
  [RaceId.ELF]: { physical: 1.125, magical: 5.125 },
};

/** Nothing above 25 armor at tier 6; tier 1 stays within 0 to 3. */
const PROFILE_ARMOR_CEILING = 25;
const PROFILE_TIER_ONE_ARMOR_CEILING = 3;

describe('race identity', () => {
  it('authors every race from content instead of a tier formula', () => {
    for (const [race, roster] of Object.entries(ROSTERS)) {
      expect(roster.length, race).toBeGreaterThan(0);
      expect(
        roster.every((unit) => unit.faction === race),
        race,
      ).toBe(true);
    }
  });

  it('fields an unbroken tier ladder starting at tier one', () => {
    for (const [race, roster] of Object.entries(ROSTERS)) {
      const tiers = [...new Set(roster.map((unit) => unit.tier))].sort(
        (left, right) => left - right,
      );

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

  it('makes elves the exposed race', () => {
    const armorByRace = [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN].map(averageArmor);

    expect(Math.min(...armorByRace)).toBeGreaterThan(averageArmor(RaceId.ELF));
  });

  describe('armor profiles (docs/08 "Race armor profiles")', () => {
    it('records the authored per-race armor averages over the whole roster', () => {
      for (const [race, expected] of Object.entries(RACE_ARMOR_PROFILES)) {
        expect(rosterAverageArmor(race as RaceId, 'physicalArmor'), `${race} physical`).toBeCloseTo(
          expected.physical,
          3,
        );
        expect(rosterAverageArmor(race as RaceId, 'magicalArmor'), `${race} magical`).toBeCloseTo(
          expected.magical,
          3,
        );
      }
    });

    it('makes the undead the most warded race: bones and spirits shrug off magic', () => {
      const undead = rosterAverageArmor(RaceId.UNDEAD, 'magicalArmor');
      const others = [RaceId.ORC, RaceId.HUMAN, RaceId.ELF].map((race) =>
        rosterAverageArmor(race, 'magicalArmor'),
      );

      expect(undead).toBeGreaterThan(Math.max(...others));
    });

    it('makes the orcs the most plated race and the least warded', () => {
      const orcPhysical = rosterAverageArmor(RaceId.ORC, 'physicalArmor');
      const otherPhysical = [RaceId.UNDEAD, RaceId.HUMAN, RaceId.ELF].map((race) =>
        rosterAverageArmor(race, 'physicalArmor'),
      );
      const otherMagical = [RaceId.UNDEAD, RaceId.HUMAN, RaceId.ELF].map((race) =>
        rosterAverageArmor(race, 'magicalArmor'),
      );

      expect(orcPhysical).toBeGreaterThan(Math.max(...otherPhysical));
      expect(rosterAverageArmor(RaceId.ORC, 'magicalArmor')).toBeLessThan(
        Math.min(...otherMagical),
      );
    });

    it('makes the elves the least plated race', () => {
      const elf = rosterAverageArmor(RaceId.ELF, 'physicalArmor');
      const others = [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN].map((race) =>
        rosterAverageArmor(race, 'physicalArmor'),
      );

      expect(elf).toBeLessThan(Math.min(...others));
    });

    it('makes the humans the balanced race: the smallest gap between the two armors', () => {
      const gap = (race: RaceId): number =>
        Math.abs(
          rosterAverageArmor(race, 'physicalArmor') - rosterAverageArmor(race, 'magicalArmor'),
        );
      const otherGaps = [RaceId.UNDEAD, RaceId.ORC, RaceId.ELF].map(gap);

      expect(gap(RaceId.HUMAN)).toBeLessThan(Math.min(...otherGaps));
    });

    it('keeps tier six under the profile ceiling and tier one light', () => {
      for (const [race, roster] of Object.entries(ROSTERS)) {
        for (const unit of roster) {
          const strongest = Math.max(unit.physicalArmor, unit.magicalArmor);

          expect(strongest, `${race} ${unit.id}`).toBeLessThanOrEqual(PROFILE_ARMOR_CEILING);
          if (unit.tier === UnitTier.TIER_1) {
            expect(strongest, `${race} ${unit.id} tier one`).toBeLessThanOrEqual(
              PROFILE_TIER_ONE_ARMOR_CEILING,
            );
          }
        }
      }
    });
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
