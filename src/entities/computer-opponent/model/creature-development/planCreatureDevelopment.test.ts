import { describe, expect, it } from 'vitest';
import {
  NO_CREATURE_BRANCH_CHOICES,
  NO_CREATURE_GRADES,
  type CreatureTalentLedger,
} from '../../../unit/model/talents';
import { CreatureValuation } from './constants';
import { fullContext, PHYSICAL_SINGLE_FIELD } from './creatureDevelopmentFixtures';
import { planCreatureDevelopment, type CreatureDevelopmentInput } from './planCreatureDevelopment';

function ledgerWith(xpByTier: CreatureTalentLedger['creatureXpByTier']): CreatureTalentLedger {
  return {
    creatureXpByTier: xpByTier,
    creatureBranchChoices: NO_CREATURE_BRANCH_CHOICES,
    creatureGrades: NO_CREATURE_GRADES,
  };
}

function input(overrides: Partial<CreatureDevelopmentInput>): CreatureDevelopmentInput {
  return {
    ...fullContext(PHYSICAL_SINGLE_FIELD),
    sendableUnitIds: ['orc_grunt', 'orc_wolf_rider', 'orc_troll'],
    ledger: ledgerWith({}),
    plannedSends: [],
    ...overrides,
  };
}

describe('planCreatureDevelopment', () => {
  it('never spends on easy (no valuation)', () => {
    const ledger = ledgerWith({ 1: 500 });
    const plan = planCreatureDevelopment(input({ ledger, valuation: CreatureValuation.NONE }));
    expect(plan.actions).toEqual([]);
    expect(plan.ledger).toBe(ledger);
  });

  it('picks the branch first, then buys grades in order while the tier can pay', () => {
    // Tier 1: branch 4, grades 6 / 10 / 16 / 26.
    const plan = planCreatureDevelopment(input({ ledger: ledgerWith({ 1: 25 }) }));
    expect(plan.actions).toEqual([
      { kind: 'choose_creature_branch', unitId: 'orc_grunt', branchId: 'orc_grunt_shieldbearer' },
      { kind: 'upgrade_creature', unitId: 'orc_grunt' },
      { kind: 'upgrade_creature', unitId: 'orc_grunt' },
    ]);
    expect(plan.ledger.creatureGrades.orc_grunt).toBe(2);
    expect(plan.ledger.creatureXpByTier[1]).toBe(5);
  });

  it('never drives experience negative and stops at grade 4', () => {
    const plan = planCreatureDevelopment(input({ ledger: ledgerWith({ 1: 1000, 2: 7, 3: 0 }) }));
    expect(plan.ledger.creatureGrades.orc_grunt).toBe(4);
    expect(plan.ledger.creatureXpByTier[1]).toBe(1000 - 62);
    // Tier 2 holds 7 < 8, the branch price: nothing bought.
    expect(plan.ledger.creatureBranchChoices.orc_wolf_rider).toBeUndefined();
    for (const xp of Object.values(plan.ledger.creatureXpByTier)) {
      expect(xp).toBeGreaterThanOrEqual(0);
    }
  });

  it('continues a chosen branch from its current grade', () => {
    const ledger: CreatureTalentLedger = {
      creatureXpByTier: { 1: 16 },
      creatureBranchChoices: { orc_grunt: 'orc_grunt_rage' },
      creatureGrades: { orc_grunt: 2 },
    };
    const plan = planCreatureDevelopment(input({ ledger }));
    expect(plan.actions).toEqual([{ kind: 'upgrade_creature', unitId: 'orc_grunt' }]);
    expect(plan.ledger.creatureBranchChoices.orc_grunt).toBe('orc_grunt_rage');
    expect(plan.ledger.creatureGrades.orc_grunt).toBe(3);
  });

  it('develops the most-sent creature of a shared tier first', () => {
    const shared = input({
      sendableUnitIds: ['undead_skeleton', 'undead_ghoul'],
      ledger: ledgerWith({ 1: 10 }),
    });
    const ghoulFirst = planCreatureDevelopment({
      ...shared,
      plannedSends: ['undead_ghoul', 'undead_ghoul', 'undead_skeleton'],
    });
    expect(ghoulFirst.actions[0]).toMatchObject({ unitId: 'undead_ghoul' });
    const skeletonFirst = planCreatureDevelopment({
      ...shared,
      plannedSends: ['undead_skeleton', 'undead_skeleton', 'undead_ghoul'],
    });
    expect(skeletonFirst.actions[0]).toMatchObject({ unitId: 'undead_skeleton' });
  });

  it('is deterministic', () => {
    const args = input({ ledger: ledgerWith({ 1: 40, 2: 50, 3: 70 }) });
    expect(planCreatureDevelopment(args)).toEqual(planCreatureDevelopment(args));
  });
});
