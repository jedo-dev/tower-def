import { describe, expect, it } from 'vitest';
import type { CreatureGradeStats, CreatureTalentBranchDefinition } from '../../../entities/unit';
import {
  NO_CHANGE_MARK,
  describeCreatureAbilities,
  describeCreatureGradeSpecial,
  formatOrdinal,
  mapCreatureTalentGradeRows,
} from './mapCreatureTalentGradeRows';

const BASE: CreatureGradeStats = { health: 100, speed: 1, physicalArmor: 4, magicalArmor: 6 };

function grade(
  level: 1 | 2 | 3 | 4,
  stats: Partial<CreatureGradeStats>,
): CreatureTalentBranchDefinition['grades'][number] {
  return { level, ...BASE, ...stats };
}

describe('mapCreatureTalentGradeRows', () => {
  it('shows each grade as signed deltas against the base creature', () => {
    const rows = mapCreatureTalentGradeRows(BASE, {
      grades: [
        grade(1, { health: 110, speed: 1.05 }),
        grade(2, { health: 120, physicalArmor: 3 }),
        grade(3, { magicalArmor: 9, speed: 0.9 }),
        grade(4, { health: 140, abilities: { dodgeEveryNthShot: 4 } }),
      ],
    });

    expect(rows).toEqual([
      {
        grade: 1,
        healthDelta: '+10',
        speedDelta: '+0.05',
        physicalArmorDelta: NO_CHANGE_MARK,
        magicalArmorDelta: NO_CHANGE_MARK,
        special: NO_CHANGE_MARK,
      },
      {
        grade: 2,
        healthDelta: '+20',
        speedDelta: NO_CHANGE_MARK,
        physicalArmorDelta: '-1',
        magicalArmorDelta: NO_CHANGE_MARK,
        special: NO_CHANGE_MARK,
      },
      {
        grade: 3,
        healthDelta: NO_CHANGE_MARK,
        speedDelta: '-0.1',
        physicalArmorDelta: NO_CHANGE_MARK,
        magicalArmorDelta: '+3',
        special: NO_CHANGE_MARK,
      },
      {
        grade: 4,
        healthDelta: '+40',
        speedDelta: NO_CHANGE_MARK,
        physicalArmorDelta: NO_CHANGE_MARK,
        magicalArmorDelta: NO_CHANGE_MARK,
        special: 'Dodges every 4th shot',
      },
    ]);
  });
});

describe('describeCreatureAbilities', () => {
  it('has nothing to say without abilities', () => {
    expect(describeCreatureAbilities(undefined)).toEqual([]);
    expect(describeCreatureAbilities({})).toEqual([]);
    expect(describeCreatureGradeSpecial(undefined)).toBe(NO_CHANGE_MARK);
  });

  it('phrases every ability field in a fixed order', () => {
    expect(
      describeCreatureAbilities({
        effectResistance: { chill: 0, armor_break: 0.5 },
        incomingDamageMultipliers: { splash: 0.75, percent: 1.25 },
        dodgeEveryNthShot: 5,
        healthRegenPerSecond: 3,
        regenPausedByPoison: true,
        shieldHp: 40,
        shieldRechargeMs: 4000,
        secondLife: { hpShare: 0.5, speedMultiplier: 1.2, immuneToChill: true },
        startInvisibleMs: 1500,
        speedBoostBelowHpShare: { hpShare: 0.3, speedMultiplier: 1.5 },
        speedBoostLastRouteShare: { routeShare: 0.25, speedMultiplier: 1.4 },
        leakLivesTaken: 2,
        leakGoldToSender: 5,
        killGoldPenaltyToDefender: 3,
        freeNthSend: 4,
      }),
    ).toEqual([
      'Immune to chill',
      'armor break x0.5',
      'splash damage x0.75',
      'percent damage x1.25',
      'Dodges every 5th shot',
      'Regen 3/s unless poisoned',
      'Shield 40, refills after 4s',
      'Second life at 50% x1.2 speed, chill-immune',
      'Invisible 1.5s',
      'x1.5 speed below 30% HP',
      'x1.4 speed on last 25% of route',
      'Leak takes 2 lives',
      'Leak +5 gold',
      'Kill costs defender 3 gold',
      'Every 4th send free',
    ]);
  });

  it('leaves out the optional parts of a shield and a second life', () => {
    expect(describeCreatureAbilities({ shieldHp: 20, secondLife: { hpShare: 0.25 } })).toEqual([
      'Shield 20',
      'Second life at 25%',
    ]);
  });

  it('joins a grade special on one line', () => {
    expect(describeCreatureGradeSpecial({ healthRegenPerSecond: 2, freeNthSend: 3 })).toBe(
      'Regen 2/s · Every 3rd send free',
    );
  });
});

describe('formatOrdinal', () => {
  it('picks the English suffix, teens included', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(formatOrdinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
    ]);
  });
});
