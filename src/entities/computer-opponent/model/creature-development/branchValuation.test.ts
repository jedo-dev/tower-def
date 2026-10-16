import { describe, expect, it } from 'vitest';
import { DamageType, EffectId, TowerTypeId } from '../../../../shared/types/content-ids';
import { CreatureDamageShape } from '../../../../shared/types/creatureAbilities';
import { resolveUnitConfigById } from '../../../unit/model/registry';
import { selectBestCreatureBranch, valueCreatureBranch } from './branchValuation';
import { CreatureValuation } from './constants';
import {
  defenderTower,
  FROST_FIELD,
  fullContext,
  MAGICAL_SPLASH_FIELD,
  PHYSICAL_SINGLE_FIELD,
} from './creatureDevelopmentFixtures';
import { computeDefenceProfile, UNKNOWN_DEFENCE_PROFILE } from './defenceProfile';

describe('computeDefenceProfile', () => {
  it('reads damage type, shape and effects off the towers', () => {
    const archers = computeDefenceProfile(PHYSICAL_SINGLE_FIELD);
    expect(archers.damageMix[DamageType.PHYSICAL]).toBe(1);
    expect(archers.shapeMix[CreatureDamageShape.SINGLE]).toBe(1);
    expect(archers.effectCoverage[EffectId.CHILL]).toBe(0);

    const mortars = computeDefenceProfile(MAGICAL_SPLASH_FIELD);
    expect(mortars.shapeMix[CreatureDamageShape.SPLASH]).toBeGreaterThan(0.9);

    const frost = computeDefenceProfile(FROST_FIELD);
    expect(frost.effectCoverage[EffectId.CHILL]).toBe(1);
    expect(frost.chillSlow).toBeGreaterThan(0);
  });

  it('knows nothing about an empty or aura-only field', () => {
    expect(computeDefenceProfile([])).toBe(UNKNOWN_DEFENCE_PROFILE);
    expect(computeDefenceProfile([defenderTower(TowerTypeId.SUPPORT)])).toBe(
      UNKNOWN_DEFENCE_PROFILE,
    );
  });
});

describe('creature branch valuation', () => {
  it('picks the armor and dodge branch against physical single-target towers', () => {
    const grunt = resolveUnitConfigById('orc_grunt');
    expect(selectBestCreatureBranch(grunt, fullContext(PHYSICAL_SINGLE_FIELD))?.branchId).toBe(
      'orc_grunt_shieldbearer',
    );
  });

  it('picks the splash-multiplier branch against heavy splash', () => {
    const militia = resolveUnitConfigById('human_militia');
    expect(selectBestCreatureBranch(militia, fullContext(MAGICAL_SPLASH_FIELD))?.branchId).toBe(
      'human_militia_torches',
    );
  });

  it('picks the chill-resistance branch against frost towers', () => {
    const hippogryph = resolveUnitConfigById('elf_hippogryph');
    expect(selectBestCreatureBranch(hippogryph, fullContext(FROST_FIELD))?.branchId).toBe(
      'elf_hippogryph_whirlwind',
    );
    expect(selectBestCreatureBranch(hippogryph, fullContext(PHYSICAL_SINGLE_FIELD))?.branchId).toBe(
      'elf_hippogryph_rider',
    );
  });

  it('coarse valuation reads the stats only, blind to the abilities', () => {
    const grunt = resolveUnitConfigById('orc_grunt');
    const shieldbearer = grunt.talentBranches[1]!;
    const full = valueCreatureBranch(grunt, shieldbearer, fullContext(PHYSICAL_SINGLE_FIELD));
    const coarse = valueCreatureBranch(grunt, shieldbearer, {
      ...fullContext(PHYSICAL_SINGLE_FIELD),
      valuation: CreatureValuation.COARSE,
    });
    expect(coarse.gains[0]).toBeCloseTo(full.gains[0]!);
    expect(coarse.gains[3]!).toBeLessThan(full.gains[3]!);
  });

  it('values grades that climb and is deterministic', () => {
    const grunt = resolveUnitConfigById('orc_grunt');
    const context = fullContext(PHYSICAL_SINGLE_FIELD);
    const value = valueCreatureBranch(grunt, grunt.talentBranches[1]!, context);
    expect(value.gains[3]!).toBeGreaterThan(value.gains[0]!);
    expect(value.pathXpCost).toBe(62);
    expect(valueCreatureBranch(grunt, grunt.talentBranches[1]!, context)).toEqual(value);
  });
});
