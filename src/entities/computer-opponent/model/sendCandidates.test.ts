import { describe, expect, it } from 'vitest';
import {
  DamageType,
  EffectId,
  RaceId,
  TowerTypeId,
  UnitMoveType,
} from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { computeDefenceDamageMix, type DamageModelTower } from './damage-placement';
import { EVEN_DAMAGE_MIX, type DamageTypeMix } from './damage-profile';
import { CREATURE_SEND_UNLOCK_WAVE_BY_TIER } from '../../../shared/constants/creatureSendUnlock';
import { resolveUnitConfigById } from '../../unit/model/registry';
import {
  computeSendPressureEfficiency,
  createSendCandidates,
  listUnlockedSendableIds,
} from './sendCandidates';

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
    const first = createSendCandidates(RaceId.ORC, LATE_ROUND, valuation);

    expect(first.map((candidate) => candidate.id)).toEqual(
      getRaceRegistry(RaceId.ORC).sendableCreepIds,
    );
    expect(createSendCandidates(RaceId.ORC, LATE_ROUND, valuation)).toEqual(first);
  });
});

// Sends queued after `round` waves join wave `round + 1`.
const LATE_ROUND = CREATURE_SEND_UNLOCK_WAVE_BY_TIER[6] - 1;

describe('entities/computer-opponent send candidates by the send unlock schedule (tower-def-qpb)', () => {
  it.each([0, 1, 2, 3, 4, 6, 7, 10, 11, 20])(
    'after %i rounds offers exactly the tiers unlocked for the next wave',
    (round) => {
      for (const raceId of [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN, RaceId.ELF]) {
        const tiers = createSendCandidates(raceId, round).map((candidate) => candidate.tier);
        const expected = getRaceRegistry(raceId)
          .sendableCreepIds.map((id) => resolveUnitConfigById(id).tier)
          .filter((tier) => round + 1 >= CREATURE_SEND_UNLOCK_WAVE_BY_TIER[tier]);

        expect(tiers).toEqual(expected);
      }
    },
  );

  it('skips every tier above 2 before wave 3 and offers all 8 creatures from wave 12', () => {
    const opening = createSendCandidates(RaceId.UNDEAD, 0);
    expect(opening.length).toBeGreaterThan(0);
    expect(opening.every((candidate) => candidate.tier <= 2)).toBe(true);
    expect(listUnlockedSendableIds(RaceId.UNDEAD, LATE_ROUND)).toHaveLength(8);
    expect(listUnlockedSendableIds(RaceId.UNDEAD, LATE_ROUND - 1)).not.toContain(
      'undead_frost_wyrm',
    );
  });
});

describe('entities/computer-opponent send candidates against each lane (tower-def-4qe)', () => {
  const FLYING_PLATE = { ...PLATED, moveType: UnitMoveType.AIR };
  const WALKING_PLATE = { ...PLATED, moveType: UnitMoveType.GROUND };
  const lanes = {
    defenderDamageMix: SPELLS,
    healthMultiplier: 1,
    laneDamageMix: { [UnitMoveType.AIR]: ARROWS, [UnitMoveType.GROUND]: SPELLS },
  };

  it('values a flier against the fire on the air line, a walker against the maze', () => {
    const flier = computeSendPressureEfficiency(FLYING_PLATE, SEND_COST, lanes);
    const walker = computeSendPressureEfficiency(WALKING_PLATE, SEND_COST, lanes);
    // Plate turns the air line's arrows; the maze's spells go straight through it.
    expect(flier).toBeGreaterThan(walker);
  });

  it('scales only the flier by its expected survival', () => {
    const plain = { defenderDamageMix: EVEN_DAMAGE_MIX, healthMultiplier: 1 };
    const surviving = { ...plain, airSurvivalFactor: 2 };
    expect(computeSendPressureEfficiency(FLYING_PLATE, SEND_COST, surviving)).toBeCloseTo(
      computeSendPressureEfficiency(FLYING_PLATE, SEND_COST, plain) * 2,
    );
    expect(computeSendPressureEfficiency(WALKING_PLATE, SEND_COST, surviving)).toBeCloseTo(
      computeSendPressureEfficiency(WALKING_PLATE, SEND_COST, plain),
    );
  });
});
