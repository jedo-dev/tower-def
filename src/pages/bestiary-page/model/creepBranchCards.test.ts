import { describe, expect, it } from 'vitest';
import { resolveUnitConfigById } from '../../../entities/unit';
import { describeCreatureAbilities, NO_CREATURE_SPECIAL } from './creatureAbilityLines';
import { mapCreatureBranch } from './creepBranchCards';
import { mapUnitToCreepCard } from './creepCards';

describe('describeCreatureAbilities', () => {
  it('shows a dash without abilities', () => {
    expect(describeCreatureAbilities(undefined)).toBe(NO_CREATURE_SPECIAL);
    expect(describeCreatureAbilities({})).toBe(NO_CREATURE_SPECIAL);
  });

  it('describes defense, movement and economy in one line', () => {
    expect(
      describeCreatureAbilities({
        effectResistance: { chill: 0, stun: 0.5 },
        dodgeEveryNthShot: 3,
        healthRegenPerSecond: 4,
        regenPausedByPoison: true,
        shieldHp: 25,
        shieldRechargeMs: 5000,
        secondLife: { hpShare: 0.6, speedMultiplier: 1.3, immuneToChill: true },
        speedBoostBelowHpShare: { hpShare: 0.5, speedMultiplier: 1.25 },
        speedBoostLastRouteShare: { routeShare: 0.35, speedMultiplier: 1.5 },
        startInvisibleMs: 3000,
        leakLivesTaken: 2,
        leakGoldToSender: 6,
        killGoldPenaltyToDefender: 1,
        freeNthSend: 4,
      }),
    ).toBe(
      [
        'immune to slow',
        'stun x0.5',
        'every 3rd single shot misses',
        '+4 HP/s (poison stops it)',
        '25 HP shield, refills after 5.0s',
        'revives once at 60% HP, speed x1.3, immune to slow',
        'below 50% HP speed x1.25',
        'last 35% of the route speed x1.5',
        'invisible for 3.0s after spawn',
        'a leak takes 2 lives',
        'a leak pays the sender 6g',
        'a kill costs the defender 1g',
        'every 4th send is free',
      ].join('; '),
    );
  });

  it('folds equal resistances and tower hit multipliers together', () => {
    expect(
      describeCreatureAbilities({
        effectResistance: {
          chill: 0,
          stun: 0,
          poison: 0,
          burn: 0,
          armor_break: 0,
          vulnerability: 0,
        },
      }),
    ).toBe('immune to all effects');
    expect(
      describeCreatureAbilities({
        incomingDamageMultipliers: { single: 0.9, splash: 0.9, chain: 0.9, percent: 0.5 },
      }),
    ).toBe('tower damage x0.9; percent damage x0.5');
    expect(
      describeCreatureAbilities({
        incomingDamageMultipliers: { single: 0.82, splash: 0.82, chain: 0.6 },
      }),
    ).toBe('single, splash damage x0.82; chain damage x0.6');
  });
});

describe('creature branches on the creep card', () => {
  it('maps both shipped branches with a grade 1-4 row each', () => {
    const fiend = resolveUnitConfigById('undead_crypt_fiend');
    const card = mapUnitToCreepCard(fiend);

    expect(card.talentBranches.map((branch) => branch.id)).toEqual(
      fiend.talentBranches.map((branch) => branch.id),
    );
    for (const [index, branch] of card.talentBranches.entries()) {
      const source = fiend.talentBranches[index];
      expect(branch.grades.map((grade) => grade.level)).toEqual([1, 2, 3, 4]);
      expect(branch.grades[3]).toMatchObject({
        health: source.grades[3].health,
        speed: source.grades[3].speed,
        physicalArmor: source.grades[3].physicalArmor,
        magicalArmor: source.grades[3].magicalArmor,
      });
    }
  });

  it('writes the grade abilities into the special line', () => {
    const branch = mapCreatureBranch({
      id: 'undead_gargoyle_dive',
      name: 'Dive',
      description: 'Dives.',
      grades: [
        { level: 1, health: 115, speed: 1.85, physicalArmor: 4, magicalArmor: 8 },
        {
          level: 2,
          health: 118,
          speed: 2,
          physicalArmor: 4,
          magicalArmor: 8,
          abilities: { leakLivesTaken: 2 },
        },
        { level: 3, health: 122, speed: 2.1, physicalArmor: 4, magicalArmor: 8 },
        { level: 4, health: 130, speed: 2.2, physicalArmor: 4, magicalArmor: 9 },
      ],
    });

    expect(branch.grades.map((grade) => grade.special)).toEqual([
      NO_CREATURE_SPECIAL,
      'a leak takes 2 lives',
      NO_CREATURE_SPECIAL,
      NO_CREATURE_SPECIAL,
    ]);
  });
});
