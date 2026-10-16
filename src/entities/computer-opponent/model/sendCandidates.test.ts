import { describe, expect, it } from 'vitest';
import { DamageType, EffectId, RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { computeDefenceDamageMix, type DamageModelTower } from './damage-placement';
import { EVEN_DAMAGE_MIX, type DamageTypeMix } from './damage-profile';
import { computeSendPressureEfficiency, createSendCandidates } from './sendCandidates';

// Fixture creatures with lopsided armor; the shipped rosters are not the subject.
const PLATED = { health: 300, physicalArmor: 30, magicalArmor: 0 };
const WARDED = { health: 300, physicalArmor: 0, magicalArmor: 30 };
const SEND_COST = 50;

const ARROWS: DamageTypeMix = { physical: 1, magical: 0, percent: 0 };
const SPELLS: DamageTypeMix = { physical: 0, magical: 1, percent: 0 };
const PERCENT: DamageTypeMix = { physical: 0, magical: 0, percent: 1 };

function tower(towerType: TowerTypeId, damageType?: DamageType): DamageModelTower {
  return {
    towerType,
    stats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] },
    ...(damageType ? { damageType } : {}),
  };
}

describe('entities/computer-opponent send candidates against the defender damage types', () => {
  it('prefers the creep whose armor meets what the defender towers deal', () => {
    const value = (creature: typeof PLATED, mix: DamageTypeMix) =>
      computeSendPressureEfficiency(creature, SEND_COST, {
        defenderDamageMix: mix,
        healthMultiplier: 1,
      });

    // Arrows bounce off plate, spells off wards: send the armor axis the defender lacks.
    expect(value(PLATED, ARROWS)).toBeGreaterThan(value(WARDED, ARROWS));
    expect(value(WARDED, SPELLS)).toBeGreaterThan(value(PLATED, SPELLS));
    // An even defence leaves the two mirrored creeps alike.
    expect(value(PLATED, EVEN_DAMAGE_MIX)).toBeCloseTo(value(WARDED, EVEN_DAMAGE_MIX));
  });

  it('sees through armor against percent damage, which wears down any health alike', () => {
    const value = (creature: typeof PLATED, healthMultiplier: number) =>
      computeSendPressureEfficiency(creature, SEND_COST, {
        defenderDamageMix: PERCENT,
        healthMultiplier,
      });

    expect(value(PLATED, 1)).toBeCloseTo(value(WARDED, 1));
    expect(value(PLATED, 3)).toBeCloseTo(value(PLATED, 1));
  });

  it('reads the defender mix off its towers, damage over time at its own tick type', () => {
    const arrows = computeDefenceDamageMix([tower(TowerTypeId.SINGLE)]);
    const spells = computeDefenceDamageMix([tower(TowerTypeId.SINGLE, DamageType.MAGICAL)]);
    const percentPoison: DamageModelTower = {
      ...tower(TowerTypeId.POISON, DamageType.PERCENT),
      stats: {
        ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.POISON],
        onHitEffects: [{ effectId: EffectId.POISON, damageType: DamageType.PERCENT }],
      },
    };

    expect(arrows).toEqual(ARROWS);
    expect(spells).toEqual(SPELLS);
    expect(computeDefenceDamageMix([percentPoison])).toEqual(PERCENT);
    // Nothing to read on an empty field or one with only auras.
    expect(computeDefenceDamageMix([])).toEqual(EVEN_DAMAGE_MIX);
    expect(computeDefenceDamageMix([tower(TowerTypeId.SUPPORT)])).toEqual(EVEN_DAMAGE_MIX);
  });

  it('ranks a real roster by the defender mix, deterministically', () => {
    const valuation = { defenderDamageMix: ARROWS, healthMultiplier: 1 };
    const first = createSendCandidates(RaceId.ORC, valuation);

    expect(first.map((candidate) => candidate.id)).toEqual(
      getRaceRegistry(RaceId.ORC).sendableCreepIds,
    );
    expect(createSendCandidates(RaceId.ORC, valuation)).toEqual(first);
  });
});
