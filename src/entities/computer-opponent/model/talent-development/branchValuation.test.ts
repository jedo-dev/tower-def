import { describe, expect, it } from 'vitest';
import { TowerTalentPricing } from '../../../../shared/constants/towerTalents';
import {
  DamageType,
  EffectId,
  TowerAuraStacking,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import type { TowerCombatStats } from '../../../tower/model/types';
import type { TowerUpgradeLevel } from '../../../tower/model/upgradeConfig';
import {
  BETWEEN_LANES_ANCHOR,
  ledgerTower,
  U_TURN_ROUTE,
  WALL_TYPE,
} from '../damage-placement/damagePlacementFixtures';
import { createRouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { createRouteGeometry } from '../damage-placement/routeGeometry';
import {
  tallyCreature,
  toDamageTypeEfficiency,
  type ArmoredHealth,
  type DamageTypeEfficiency,
} from '../damage-profile';
import { selectBestBranch, valueBranchPath, type BranchPath } from './branchValuation';
import { TalentValuation } from './constants';

// Fixture waves and branches: the shipped rosters and talents are not the subject.
const PLATED: ArmoredHealth = { health: 300, physicalArmor: 50, magicalArmor: 0 };
const WARDED: ArmoredHealth = { health: 300, physicalArmor: 0, magicalArmor: 50 };

const GRADE_THREE: TowerCombatStats = { ...WALL_TYPE.stats };

function grades(statsAt: (step: number) => TowerCombatStats): TowerUpgradeLevel[] {
  return ([4, 5, 6, 7] as const).map((level, step) => ({
    level,
    upgradeCostGold: TowerTalentPricing.GRADE_COSTS[level],
    stats: statsAt(step + 1),
  }));
}

/** Bigger physical spears every grade. */
const SHARP: BranchPath = {
  id: 'fixture_sharp',
  grades: grades((step) => ({ ...GRADE_THREE, damage: GRADE_THREE.damage * (1 + 0.4 * step) })),
};

/** Same numbers as grade 3, plus a percent poison that grows every grade. */
const PERCENT: BranchPath = {
  id: 'fixture_percent',
  grades: grades((step) => ({
    ...GRADE_THREE,
    onHitEffects: [
      {
        effectId: EffectId.POISON,
        magnitude: 3 * step,
        damageType: DamageType.PERCENT,
        durationMs: 4000,
      },
    ],
  })),
};

function ledgerAgainst(creature: ArmoredHealth) {
  const efficiency: DamageTypeEfficiency = toDamageTypeEfficiency(tallyCreature(creature));
  const tower = { ...ledgerTower(BETWEEN_LANES_ANCHOR), stats: GRADE_THREE };
  return createRouteDamageLedger(
    createRouteGeometry(U_TURN_ROUTE),
    [tower],
    UnitMoveType.GROUND,
    efficiency,
  );
}

function pick(creature: ArmoredHealth, valuation: TalentValuation): string | undefined {
  return selectBestBranch(
    ledgerAgainst(creature),
    0,
    [SHARP, PERCENT],
    valuation,
    TowerTalentPricing.BRANCH_COST,
  )?.branchId;
}

describe('entities/computer-opponent/talent-development branch valuation', () => {
  it('picks the percent branch against a wave plated against physical damage', () => {
    expect(pick(PLATED, TalentValuation.FULL)).toBe(PERCENT.id);
  });

  it('picks the physical branch against a wave warded against magic', () => {
    expect(pick(WARDED, TalentValuation.FULL)).toBe(SHARP.id);
  });

  it('reads only grade numbers on the coarse valuation, blind to the added poison', () => {
    expect(pick(PLATED, TalentValuation.COARSE)).toBe(SHARP.id);
    const percent = valueBranchPath(
      ledgerAgainst(PLATED),
      0,
      PERCENT,
      TalentValuation.COARSE,
      TowerTalentPricing.BRANCH_COST,
    );
    expect(percent.topGradeGain).toBe(0);
  });

  it('never picks a branch without valuation (easy)', () => {
    expect(pick(PLATED, TalentValuation.NONE)).toBeUndefined();
  });

  it('prices the whole path: the branch and grades 4-7', () => {
    const value = valueBranchPath(
      ledgerAgainst(WARDED),
      0,
      SHARP,
      TalentValuation.FULL,
      TowerTalentPricing.BRANCH_COST,
    );
    const gradeTotal = Object.values(TowerTalentPricing.GRADE_COSTS).reduce(
      (sum, cost) => sum + cost,
      0,
    );

    expect(value.pathCost).toBe(TowerTalentPricing.BRANCH_COST + gradeTotal);
    expect(value.effectiveCost).toBe(value.pathCost);
    expect(value.topGradeGain).toBeGreaterThan(0);
  });

  it('counts an economy aura as gold back on the path price', () => {
    const economy: BranchPath = {
      id: 'fixture_economy',
      grades: SHARP.grades.map((grade) => ({
        ...grade,
        stats: {
          ...grade.stats,
          aura: {
            radiusCells: 3,
            attackSpeedBonus: 0,
            rangeBonus: 0,
            stacking: TowerAuraStacking.STRONGEST,
            incomePerRound: 20,
          },
        },
      })),
    };
    const ledger = ledgerAgainst(WARDED);
    const plain = valueBranchPath(ledger, 0, SHARP, TalentValuation.FULL, 120);
    const paying = valueBranchPath(ledger, 0, economy, TalentValuation.FULL, 120);

    expect(paying.effectiveCost).toBeLessThan(plain.effectiveCost);
  });

  it('is deterministic', () => {
    expect(pick(PLATED, TalentValuation.FULL)).toBe(pick(PLATED, TalentValuation.FULL));
  });
});
