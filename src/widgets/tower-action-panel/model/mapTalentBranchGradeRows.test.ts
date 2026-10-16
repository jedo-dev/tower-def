import { describe, expect, it } from 'vitest';
import type { TowerLevelStats, TowerUpgradeLevel } from '../../../entities/tower';
import { EffectId, TowerAuraStacking, TowerTypeId } from '../../../shared/types/content-ids';
import {
  NO_CHANGE_MARK,
  describeGradeSpecial,
  describeTowerAbilities,
  mapTalentBranchGradeRows,
} from './mapTalentBranchGradeRows';

const GRADE_THREE: TowerLevelStats = { damage: 40, range: 6.6, attackCooldownMs: 700 };

function grade(level: number, stats: Partial<TowerLevelStats>): TowerUpgradeLevel {
  return { level, upgradeCostGold: 0, stats: { ...GRADE_THREE, ...stats } };
}

describe('mapTalentBranchGradeRows', () => {
  it('reads every grade against grade 3, not against the grade before it', () => {
    const rows = mapTalentBranchGradeRows(TowerTypeId.SINGLE, GRADE_THREE, {
      grades: [
        grade(4, { damage: 43, range: 6.8 }),
        grade(5, { damage: 46, range: 7, attackCooldownMs: 650 }),
        grade(6, { damage: 50 }),
        grade(7, { damage: 40, range: 6.6, attackCooldownMs: 760 }),
      ],
    });

    expect(rows).toEqual([
      { level: 4, damageDelta: '+3', rangeDelta: '+0.2', cooldownDelta: '—', special: '—' },
      { level: 5, damageDelta: '+6', rangeDelta: '+0.4', cooldownDelta: '-50ms', special: '—' },
      { level: 6, damageDelta: '+10', rangeDelta: '—', cooldownDelta: '—', special: '—' },
      { level: 7, damageDelta: '—', rangeDelta: '—', cooldownDelta: '+60ms', special: '—' },
    ]);
  });
});

describe('describeTowerAbilities', () => {
  it('names each authored ability in a fixed order', () => {
    expect(
      describeTowerAbilities({
        critEveryNthShot: 4,
        critMultiplier: 2.5,
        extraTargets: 2,
        extraTargetDamageShare: 0.5,
        pierceLine: 0.4,
        airDamageMultiplier: 1.5,
        groundDamageMultiplier: 1.25,
        fullHealthBonusMultiplier: 2,
        largeTargetMultiplier: 1.333,
        minRangeCells: 2,
        volleyEveryMs: 4000,
        volleyDamageShare: 0.3,
      }),
    ).toEqual([
      'Crit x2.5 every 4',
      '+2 targets at 50%',
      'Pierce 40%',
      'x1.5 vs air',
      'x1.25 vs ground',
      'x2 vs full HP',
      'x1.33 vs large',
      'Min range 2',
      'Volley 30% / 4.0s',
    ]);
  });

  it('leaves out the share of full-damage extra targets and has nothing without abilities', () => {
    expect(describeTowerAbilities({ extraTargets: 1 })).toEqual(['+1 targets']);
    expect(describeTowerAbilities(undefined)).toEqual([]);
  });
});

describe('describeGradeSpecial', () => {
  it('joins abilities, changed effects and a re-authored chain on one line', () => {
    const special = describeGradeSpecial(TowerTypeId.CHAIN, GRADE_THREE, {
      ...GRADE_THREE,
      abilities: { airDamageMultiplier: 2 },
      onHitEffects: [{ effectId: EffectId.STUN, durationMs: 500 }],
      chain: { bounces: 6, bounceRangeCells: 3, damageFalloff: 0.1 },
    });

    expect(special).toBe('x2 vs air · STUN 0.5s · Chain 6 jumps -10%');
  });

  it('marks a grade that only grows numbers', () => {
    expect(describeGradeSpecial(TowerTypeId.SINGLE, GRADE_THREE, { ...GRADE_THREE })).toBe(
      NO_CHANGE_MARK,
    );
  });

  it('shows a support grade aura only when it differs from grade 3', () => {
    const aura = {
      radiusCells: 3,
      attackSpeedBonus: 0.2,
      rangeBonus: 0.5,
      stacking: TowerAuraStacking.STRONGEST,
    };
    const gradeThree = { ...GRADE_THREE, aura };

    expect(describeGradeSpecial(TowerTypeId.SUPPORT, gradeThree, gradeThree)).toBe(NO_CHANGE_MARK);
    expect(
      describeGradeSpecial(TowerTypeId.SUPPORT, gradeThree, {
        ...gradeThree,
        aura: { ...aura, attackSpeedBonus: 0.3 },
      }),
    ).toBe('AURA +30% speed, +0.5 range, 3 cells');
  });
});
