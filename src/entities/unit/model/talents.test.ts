import { describe, expect, it } from 'vitest';
import { resolveUnitConfigById } from './registry';
import {
  addCreatureXp,
  applyCreatureGrade,
  canChooseCreatureBranch,
  canUpgradeCreature,
  chooseCreatureBranch,
  getCreatureBranchCost,
  getCreatureDeathXp,
  getCreatureLeakXp,
  getNextCreatureGradeCost,
  NO_CREATURE_BRANCH_CHOICES,
  NO_CREATURE_GRADES,
  NO_CREATURE_XP,
  resolveCreatureStatsAtGrade,
  resolveCreatureStatsForGrade,
  upgradeCreature,
  type CreatureTalentLedger,
} from './talents';
import { UnitTier } from './types';

// Crypt Fiend is tier 2: branch 8, grades 12 / 20 / 32 / 52 (docs/12 example).
const FIEND = resolveUnitConfigById('undead_crypt_fiend');
const [BRANCH_A, BRANCH_B] = FIEND.talentBranches;

function ledgerWithXp(xp: number): CreatureTalentLedger {
  return {
    creatureXpByTier: addCreatureXp(NO_CREATURE_XP, UnitTier.TIER_2, xp),
    creatureBranchChoices: NO_CREATURE_BRANCH_CHOICES,
    creatureGrades: NO_CREATURE_GRADES,
  };
}

describe('creature experience', () => {
  it('pays deaths and leaks per tier, with the life bonus on top of a leak', () => {
    expect(getCreatureDeathXp(UnitTier.TIER_3)).toBe(3);
    expect(getCreatureLeakXp(UnitTier.TIER_3, false)).toBe(9);
    expect(getCreatureLeakXp(UnitTier.TIER_3, true)).toBe(11);
  });

  it('keeps one ledger per tier', () => {
    const xp = addCreatureXp(addCreatureXp(NO_CREATURE_XP, UnitTier.TIER_1, 3), UnitTier.TIER_2, 5);

    expect(xp).toEqual({ 1: 3, 2: 5 });
    expect(addCreatureXp(xp, UnitTier.TIER_1, 0)).toBe(xp);
  });

  it('prices the branch and grades by tier, with no grade past 4', () => {
    expect(getCreatureBranchCost(UnitTier.TIER_2)).toBe(8);
    expect(
      [0, 1, 2, 3, 4].map((grade) => getNextCreatureGradeCost(UnitTier.TIER_2, grade as 0)),
    ).toEqual([12, 20, 32, 52, null]);
  });
});

describe('canChooseCreatureBranch', () => {
  it('allows a branch of a creature without one for the branch price', () => {
    expect(
      canChooseCreatureBranch(FIEND, BRANCH_A.id, NO_CREATURE_BRANCH_CHOICES, { 2: 8 }),
    ).toEqual({ allowed: true, cost: 8 });
  });

  it('refuses one experience short, counting only the creature tier', () => {
    expect(
      canChooseCreatureBranch(FIEND, BRANCH_A.id, NO_CREATURE_BRANCH_CHOICES, { 1: 100, 2: 7 }),
    ).toEqual({ allowed: false, reason: 'not_enough_xp' });
  });

  it('refuses a branch of another creature', () => {
    expect(
      canChooseCreatureBranch(FIEND, 'undead_skeleton_i', NO_CREATURE_BRANCH_CHOICES, { 2: 99 }),
    ).toEqual({ allowed: false, reason: 'unknown_branch' });
  });

  it('locks both branches once one is chosen', () => {
    const { ledger } = chooseCreatureBranch(ledgerWithXp(99), FIEND, BRANCH_A.id);

    for (const branch of [BRANCH_A, BRANCH_B]) {
      expect(
        canChooseCreatureBranch(
          FIEND,
          branch.id,
          ledger.creatureBranchChoices,
          ledger.creatureXpByTier,
        ),
      ).toEqual({ allowed: false, reason: 'already_chosen' });
    }
  });
});

describe('chooseCreatureBranch and upgradeCreature', () => {
  it('spends the tier experience and records the pick', () => {
    const result = chooseCreatureBranch(ledgerWithXp(10), FIEND, BRANCH_B.id);

    expect(result.check).toEqual({ allowed: true, cost: 8 });
    expect(result.ledger.creatureXpByTier).toEqual({ 2: 2 });
    expect(result.ledger.creatureBranchChoices).toEqual({ undead_crypt_fiend: BRANCH_B.id });
  });

  it('leaves the ledger untouched on a refusal', () => {
    const ledger = ledgerWithXp(3);
    const result = chooseCreatureBranch(ledger, FIEND, BRANCH_A.id);

    expect(result.ledger).toBe(ledger);
    expect(upgradeCreature(ledger, FIEND)).toEqual({
      ledger,
      check: { allowed: false, reason: 'no_branch' },
    });
  });

  it('climbs grades 1-4 along the branch, each for its price, then stops', () => {
    let ledger = chooseCreatureBranch(
      ledgerWithXp(8 + 12 + 20 + 32 + 52),
      FIEND,
      BRANCH_A.id,
    ).ledger;

    for (const grade of [1, 2, 3, 4]) {
      const result = upgradeCreature(ledger, FIEND);
      expect(result.check.allowed, `grade ${grade}`).toBe(true);
      ledger = result.ledger;
      expect(ledger.creatureGrades.undead_crypt_fiend).toBe(grade);
    }

    expect(ledger.creatureXpByTier).toEqual({ 2: 0 });
    expect(
      canUpgradeCreature(FIEND, ledger.creatureBranchChoices, ledger.creatureGrades, {
        2: 999,
      }),
    ).toEqual({ allowed: false, reason: 'max_grade' });
  });

  it('refuses a grade the tier cannot afford', () => {
    const ledger = chooseCreatureBranch(ledgerWithXp(8 + 11), FIEND, BRANCH_A.id).ledger;

    expect(upgradeCreature(ledger, FIEND).check).toEqual({
      allowed: false,
      reason: 'not_enough_xp',
    });
  });
});

describe('resolveCreatureStatsForGrade', () => {
  const choices = { undead_crypt_fiend: BRANCH_A.id };

  it('is the authored base at grade 0 or without a branch', () => {
    const base = {
      health: FIEND.health,
      speed: FIEND.speed,
      physicalArmor: FIEND.physicalArmor,
      magicalArmor: FIEND.magicalArmor,
    };

    expect(resolveCreatureStatsForGrade(FIEND, choices, NO_CREATURE_GRADES)).toEqual(base);
    expect(resolveCreatureStatsAtGrade(FIEND, NO_CREATURE_BRANCH_CHOICES, 3)).toEqual(base);
  });

  it('reads the grade row of the chosen branch', () => {
    const row = BRANCH_A.grades[2];

    expect(resolveCreatureStatsForGrade(FIEND, choices, { undead_crypt_fiend: 3 })).toEqual({
      health: row.health,
      speed: row.speed,
      physicalArmor: row.physicalArmor,
      magicalArmor: row.magicalArmor,
    });
  });

  it('applies a grade onto the creature config and keeps grade 0 as the same object', () => {
    const graded = applyCreatureGrade(FIEND, choices, 4);

    expect(applyCreatureGrade(FIEND, choices, 0)).toBe(FIEND);
    expect(graded.id).toBe(FIEND.id);
    expect(graded.tier).toBe(FIEND.tier);
    expect(graded.health).toBe(BRANCH_A.grades[3].health);
    expect(graded.rewardGold).toBe(FIEND.rewardGold);
  });
});
