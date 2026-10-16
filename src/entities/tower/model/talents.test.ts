import { describe, expect, it } from 'vitest';
import { TowerTalentPricing } from '../../../shared/constants/towerTalents';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { buildableTowers, resolveBuildableTowerById } from './config/buildableTowers';
import {
  canChooseBranch,
  chooseBranch,
  getChosenBranchId,
  getTowerTalentBranches,
  NO_TOWER_BRANCH_CHOICES,
  resolveChosenBranch,
  type TowerTalentRef,
} from './talents';
import {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForCurveLevel,
  getTowerStatsForTowerLevel,
  getUpgradeCost,
  isMaxLevel,
  resolveTowerUpgradeConfig,
} from './upgrade';

const ARCHER_ID = 'undead_bone_archer_tower';
const ARCHER = resolveBuildableTowerById(ARCHER_ID);
const [BRANCH_A, BRANCH_B] = ARCHER.talentBranches;
const RICH = 10_000;

function archerAt(level: number): TowerTalentRef {
  return { type: TowerTypeId.SINGLE, buildableTowerId: ARCHER_ID, level };
}

const ARCHER_CHOSE_A = chooseBranch(NO_TOWER_BRANCH_CHOICES, ARCHER_ID, BRANCH_A.id);

describe('canChooseBranch', () => {
  it('allows a branch of a grade 3 tower whose type has none, for the branch price', () => {
    expect(canChooseBranch(archerAt(3), BRANCH_A.id, NO_TOWER_BRANCH_CHOICES, RICH)).toEqual({
      allowed: true,
      cost: TowerTalentPricing.BRANCH_COST,
    });
  });

  it('refuses below grade 3', () => {
    expect(canChooseBranch(archerAt(2), BRANCH_A.id, NO_TOWER_BRANCH_CHOICES, RICH)).toEqual({
      allowed: false,
      reason: 'not_grade_3',
    });
  });

  it('refuses one gold short of the branch price', () => {
    const gold = TowerTalentPricing.BRANCH_COST - 1;

    expect(canChooseBranch(archerAt(3), BRANCH_A.id, NO_TOWER_BRANCH_CHOICES, gold)).toEqual({
      allowed: false,
      reason: 'not_enough_gold',
    });
  });

  it('locks the other branch, and the same one, once the type has a branch', () => {
    expect(canChooseBranch(archerAt(3), BRANCH_B.id, ARCHER_CHOSE_A, RICH)).toEqual({
      allowed: false,
      reason: 'already_chosen',
    });
    expect(canChooseBranch(archerAt(7), BRANCH_A.id, ARCHER_CHOSE_A, RICH)).toEqual({
      allowed: false,
      reason: 'already_chosen',
    });
  });

  it('refuses a branch of another tower and a tower built without content', () => {
    const otherBranch = resolveBuildableTowerById('undead_plague_tower').talentBranches[0].id;

    expect(canChooseBranch(archerAt(3), otherBranch, NO_TOWER_BRANCH_CHOICES, RICH)).toEqual({
      allowed: false,
      reason: 'unknown_branch',
    });
    expect(
      canChooseBranch(
        { type: TowerTypeId.SINGLE, level: 3 },
        BRANCH_A.id,
        NO_TOWER_BRANCH_CHOICES,
        RICH,
      ),
    ).toEqual({ allowed: false, reason: 'unknown_branch' });
  });

  it('keeps the choice of one tower type away from another', () => {
    const plague = resolveBuildableTowerById('undead_plague_tower');
    const plagueTower: TowerTalentRef = {
      type: TowerTypeId.SPLASH,
      buildableTowerId: plague.id,
      level: 3,
    };

    expect(
      canChooseBranch(plagueTower, plague.talentBranches[1].id, ARCHER_CHOSE_A, RICH).allowed,
    ).toBe(true);
  });
});

describe('chooseBranch', () => {
  it('records the pick without changing the previous record', () => {
    expect(ARCHER_CHOSE_A).toEqual({ [ARCHER_ID]: BRANCH_A.id });
    expect(NO_TOWER_BRANCH_CHOICES).toEqual({});
    expect(getChosenBranchId(ARCHER_ID, ARCHER_CHOSE_A)).toBe(BRANCH_A.id);
    expect(getChosenBranchId(ARCHER_ID, NO_TOWER_BRANCH_CHOICES)).toBeNull();
    expect(resolveChosenBranch({ buildableTowerId: ARCHER_ID }, ARCHER_CHOSE_A)).toBe(BRANCH_A);
  });

  it('lists no branches for a tower without content', () => {
    expect(getTowerTalentBranches(undefined)).toEqual([]);
    expect(getTowerTalentBranches(ARCHER_ID)).toBe(ARCHER.talentBranches);
  });
});

describe('upgrade curve with talents', () => {
  const archer = { type: TowerTypeId.SINGLE, buildableTowerId: ARCHER_ID } as const;

  it('caps the curve at grade 3 while no branch is chosen', () => {
    expect(resolveTowerUpgradeConfig(archer).maxLevel).toBe(3);
    expect(isMaxLevel(archer, 3)).toBe(true);
    expect(getUpgradeCost(archer, 3)).toBeNull();
    expect(canAffordUpgrade(archer, 3, RICH)).toEqual({ allowed: false, reason: 'max_level' });
    expect(getTowerStatsForTowerLevel(archer, 4)).toBeNull();
  });

  it('extends the curve to grade 7 along the chosen branch, priced from the ladder', () => {
    expect(resolveTowerUpgradeConfig(archer, ARCHER_CHOSE_A).maxLevel).toBe(7);
    expect(isMaxLevel(archer, 3, ARCHER_CHOSE_A)).toBe(false);
    expect(isMaxLevel(archer, 7, ARCHER_CHOSE_A)).toBe(true);

    for (const level of [3, 4, 5, 6] as const) {
      const next = (level + 1) as 4 | 5 | 6 | 7;
      expect(getUpgradeCost(archer, level, ARCHER_CHOSE_A)).toBe(
        TowerTalentPricing.GRADE_COSTS[next],
      );
      expect(getTowerStatsForTowerLevel(archer, next, ARCHER_CHOSE_A)).toBe(
        BRANCH_A.grades[next - 4].stats,
      );
    }
    expect(getTowerStatsForCurveLevel(TowerTypeId.SINGLE, ARCHER_ID, 7, ARCHER_CHOSE_A)).toBe(
      BRANCH_A.grades[3].stats,
    );
    expect(getUpgradeCost(archer, 7, ARCHER_CHOSE_A)).toBeNull();
  });

  it('counts bought grades, not the per-type branch price, in the sell value', () => {
    const throughThree = getTotalInvestedGold(archer, 3, ARCHER_CHOSE_A);
    const grades = Object.values(TowerTalentPricing.GRADE_COSTS).reduce((sum, c) => sum + c, 0);

    expect(getTotalInvestedGold(archer, 7, ARCHER_CHOSE_A)).toBe(throughThree + grades);
    expect(getSellValue(archer, 7, 50, ARCHER_CHOSE_A)).toBe(
      Math.floor((50 + throughThree + grades) / 2),
    );
  });

  // tower-def-pzb: cost and max level must follow the curve stats come from.
  it('reads cost, max level and stats from the same resolved curve for every tower', () => {
    const choiceSets = buildableTowers.map((tower) =>
      chooseBranch(NO_TOWER_BRANCH_CHOICES, tower.id, tower.talentBranches[1].id),
    );

    for (const [index, tower] of buildableTowers.entries()) {
      const ref = { type: tower.towerType, buildableTowerId: tower.id };
      for (const choices of [NO_TOWER_BRANCH_CHOICES, choiceSets[index]]) {
        const curve = resolveTowerUpgradeConfig(ref, choices);

        for (let level = 1; level < curve.maxLevel; level += 1) {
          expect(isMaxLevel(ref, level, choices), tower.id).toBe(false);
          expect(getUpgradeCost(ref, level, choices), tower.id).toBe(
            curve.levels[level].upgradeCostGold,
          );
          expect(getTowerStatsForTowerLevel(ref, level + 1, choices), tower.id).toBe(
            curve.levels[level].stats,
          );
        }
        expect(isMaxLevel(ref, curve.maxLevel, choices), tower.id).toBe(true);
        expect(getUpgradeCost(ref, curve.maxLevel, choices), tower.id).toBeNull();
        expect(getTowerStatsForTowerLevel(ref, curve.maxLevel + 1, choices), tower.id).toBeNull();
      }
    }
  });
});
