import { describe, expect, it } from 'vitest';
import { resolveBuildableTowerById } from '../../../entities/tower';
import { TowerTalentPricing } from '../../../shared/constants/towerTalents';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { formatBranchLockWarning, mapTowerBranchState } from './mapTowerBranchState';

const ARCHER = resolveBuildableTowerById('undead_bone_archer_tower');
const [BRANCH_A, BRANCH_B] = ARCHER.talentBranches;
const RICH = 1000;

function archer(level: number, chosenBranchId: string | null = null) {
  return { type: TowerTypeId.SINGLE, buildableTowerId: ARCHER.id, level, chosenBranchId };
}

describe('mapTowerBranchState', () => {
  it('offers no Develop below grade 3 but already counts grades to 7', () => {
    const state = mapTowerBranchState(archer(2), RICH, {});

    expect(state).toEqual({ maxGrade: 7, chosenBranch: null, develop: null });
  });

  it('offers Develop at grade 3 with both branches and their grade 4-7 tables', () => {
    const { develop } = mapTowerBranchState(archer(3), RICH, {});

    expect(develop?.cost).toBe(TowerTalentPricing.BRANCH_COST);
    expect(develop?.isAffordable).toBe(true);
    expect(develop?.blockedReason).toBeNull();
    expect(develop?.branches.map((branch) => [branch.id, branch.glyph])).toEqual([
      [BRANCH_A.id, 'I'],
      [BRANCH_B.id, 'II'],
    ]);
    expect(develop?.branches[0].rows.map((row) => row.level)).toEqual([4, 5, 6, 7]);
    expect(develop?.branches[0].description).toBe(BRANCH_A.description);
  });

  it('keeps Develop visible but blocked with a reason when the gold is short', () => {
    const { develop } = mapTowerBranchState(archer(3), TowerTalentPricing.BRANCH_COST - 1, {});

    expect(develop?.isAffordable).toBe(false);
    expect(develop?.blockedReason).toBe('Not enough gold');
  });

  it('shows the chosen branch badge and no Develop once the type has a branch', () => {
    const choices = { [ARCHER.id]: BRANCH_B.id };
    const state = mapTowerBranchState(archer(3, BRANCH_B.id), RICH, choices);

    expect(state.develop).toBeNull();
    expect(state.chosenBranch).toEqual({ id: BRANCH_B.id, name: BRANCH_B.name, glyph: 'II' });
  });

  it('caps a tower built without content at its own curve', () => {
    const state = mapTowerBranchState(
      { type: TowerTypeId.POISON, level: 3, chosenBranchId: null },
      RICH,
      {},
    );

    expect(state).toEqual({ maxGrade: 3, chosenBranch: null, develop: null });
  });
});

describe('formatBranchLockWarning', () => {
  it('words the lock warning for all towers of the type', () => {
    expect(formatBranchLockWarning('Bone Archer Tower')).toBe(
      'Locks the other branch for all Bone Archer Towers this match',
    );
  });
});
