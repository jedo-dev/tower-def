import { describe, expect, it } from 'vitest';
import { PERCENT_DAMAGE } from '../../../../shared/constants/damage';
import { DamageType } from '../../../../shared/types/content-ids';
import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import {
  addArmorTallies,
  computeKillDamage,
  EMPTY_ARMOR_TALLY,
  NEUTRAL_DAMAGE_EFFICIENCY,
  scaleArmorTally,
  tallyCreature,
  toDamageTypeEfficiency,
} from './armorProfile';
import { computeMixedEffectiveHealth, toArmorNeutralEfficiency } from './damageMix';

const PLATED = { health: 400, physicalArmor: 20, magicalArmor: 0 };
const WARDED = { health: 100, physicalArmor: 0, magicalArmor: 10 };

describe('entities/computer-opponent/damage-profile', () => {
  it('kills through the matching armor with the combat curve, percent through no armor', () => {
    expect(computeKillDamage(PLATED, DamageType.PHYSICAL)).toBeCloseTo(
      400 / getArmorDamageMultiplier(20),
    );
    expect(computeKillDamage(PLATED, DamageType.MAGICAL)).toBeCloseTo(400);
    // Percent damage kills anything with the same raw damage.
    expect(computeKillDamage(PLATED, DamageType.PERCENT)).toBeCloseTo(
      PERCENT_DAMAGE.healthShareDivisor,
    );
    expect(computeKillDamage(WARDED, DamageType.PERCENT)).toBeCloseTo(
      PERCENT_DAMAGE.healthShareDivisor,
    );
  });

  it('averages a wave by health: the combined efficiency kills the whole wave exactly', () => {
    const wave = addArmorTallies(tallyCreature(PLATED), tallyCreature(WARDED));
    const efficiency = toDamageTypeEfficiency(wave);
    const physicalKill =
      computeKillDamage(PLATED, DamageType.PHYSICAL) +
      computeKillDamage(WARDED, DamageType.PHYSICAL);

    expect(efficiency.physical * physicalKill).toBeCloseTo(500);
    expect(efficiency.percent).toBeCloseTo(500 / (2 * PERCENT_DAMAGE.healthShareDivisor));
    const scaled = toDamageTypeEfficiency(scaleArmorTally(wave, 3));
    expect(scaled.physical).toBeCloseTo(efficiency.physical);
    expect(scaled.magical).toBeCloseTo(efficiency.magical);
    expect(scaled.percent).toBeCloseTo(efficiency.percent);
  });

  it('stays neutral without a wave', () => {
    expect(toDamageTypeEfficiency(EMPTY_ARMOR_TALLY)).toEqual(NEUTRAL_DAMAGE_EFFICIENCY);
  });

  it('averages the two armors for the armor-neutral reference, percent untouched', () => {
    const efficiency = toDamageTypeEfficiency(tallyCreature(PLATED));
    const neutral = toArmorNeutralEfficiency(efficiency);

    expect(neutral.physical).toBeCloseTo((efficiency.physical + efficiency.magical) / 2);
    expect(neutral.magical).toBe(neutral.physical);
    expect(neutral.percent).toBe(efficiency.percent);
  });

  it('kills a creature with a mixed damage stream share by share', () => {
    const mixed = computeMixedEffectiveHealth(PLATED, { physical: 0.5, magical: 0.5, percent: 0 });

    expect(mixed).toBeCloseTo(400 / ((getArmorDamageMultiplier(20) + 1) / 2));
  });
});
