import { describe, expect, it } from 'vitest';
import { getUnitsByTier, undeadUnits } from './undead';
import { UNIT_SPRITE_KEYS } from '../../../../shared/constants/sprites';
import { RaceId } from '../../../../shared/types/content-ids';
import { UnitTier } from '../types';

function findUnit(id: string) {
  const unit = undeadUnits.find((candidate) => candidate.id === id);
  expect(unit, `missing authored unit ${id}`).toBeDefined();
  return unit!;
}

describe('undead roster', () => {
  it('loads every authored creature as undead', () => {
    expect(undeadUnits).toHaveLength(8);
    expect(undeadUnits.every((unit) => unit.faction === RaceId.UNDEAD)).toBe(true);
  });

  it('points creatures with finished art at the registered sprite keys', () => {
    expect(findUnit('undead_skeleton').spriteKey).toBe(UNIT_SPRITE_KEYS.UNDEAD_SKELETON);
    expect(findUnit('undead_ghoul').spriteKey).toBe(UNIT_SPRITE_KEYS.UNDEAD_GHOUL);
    expect(findUnit('undead_crypt_fiend').spriteKey).toBe(UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND);
    expect(findUnit('undead_gargoyle').spriteKey).toBe(UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE);
  });

  it('gives same-tier creatures different roles instead of one shared curve', () => {
    const skeleton = findUnit('undead_skeleton');
    const ghoul = findUnit('undead_ghoul');

    expect(ghoul.tier).toBe(skeleton.tier);
    expect(ghoul.speed).toBeGreaterThan(skeleton.speed * 1.4);
    expect(ghoul.health).toBeLessThan(skeleton.health);
  });

  it('makes the heavy creature slow and armored rather than merely bigger', () => {
    const abomination = findUnit('undead_abomination');
    const banshee = findUnit('undead_banshee');

    expect(abomination.speed).toBeLessThan(banshee.speed);
    expect(abomination.health).toBeGreaterThan(banshee.health);
    expect(abomination.armor).toBeGreaterThan(banshee.armor);
  });

  it('keeps health and reward rising with tier', () => {
    const cheapestTierOne = Math.min(...getUnitsByTier(UnitTier.TIER_1).map((unit) => unit.rewardGold));
    const frostWyrm = findUnit('undead_frost_wyrm');

    expect(frostWyrm.rewardGold).toBeGreaterThan(cheapestTierOne);
    expect(frostWyrm.health).toBeGreaterThan(findUnit('undead_crypt_fiend').health);
  });

  it('filters the roster by tier', () => {
    expect(getUnitsByTier(UnitTier.TIER_1).map((unit) => unit.id)).toEqual([
      'undead_skeleton',
      'undead_ghoul',
    ]);
    expect(getUnitsByTier(UnitTier.TIER_5).map((unit) => unit.id)).toEqual([
      'undead_necromancer',
      'undead_banshee',
    ]);
    expect(getUnitsByTier(UnitTier.TIER_6)).toHaveLength(1);
  });
});
