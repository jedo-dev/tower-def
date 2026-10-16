import { describe, expect, it } from 'vitest';
import { parseTowerContentFile } from './loadTowerContent';
import { TOWER_CONTENT_SCHEMA_VERSION } from './towerContent.types';
import { createTalentBranchesFixture } from './fixtures/talentBranchFixture';
import {
  ArmorKind,
  DamageScope,
  EffectId,
  TowerAuraStacking,
} from '../../../../shared/types/content-ids';

const FILE = 'content/towers/undead.json';

type AuthoredEntry = Record<string, unknown>;

function level(overrides: AuthoredEntry = {}): AuthoredEntry {
  return {
    level: 1,
    upgradeCostGold: 0,
    damage: 20,
    range: 6,
    attackCooldownMs: 800,
    ...overrides,
  };
}

function towerWith(levelOverrides: AuthoredEntry, towerOverrides: AuthoredEntry = {}) {
  return {
    schemaVersion: TOWER_CONTENT_SCHEMA_VERSION,
    race: 'UNDEAD',
    towers: [
      {
        id: 'undead_bone_archer_tower',
        name: 'Bone Archer Tower',
        archetype: 'single',
        costGold: 50,
        damage: 20,
        range: 6,
        attackCooldownMs: 800,
        spriteKey: 'tower.undead.bone_archer',
        description: 'Archer nest.',
        levels: [
          level(levelOverrides),
          level({ level: 2, upgradeCostGold: 40, damage: 30 }),
          level({ level: 3, upgradeCostGold: 80, damage: 40 }),
        ],
        talentBranches: createTalentBranchesFixture('undead_bone_archer_tower'),
        ...towerOverrides,
      },
    ],
  };
}

function parseLevelOne(levelOverrides: AuthoredEntry) {
  const [tower] = parseTowerContentFile({ file: FILE, data: towerWith(levelOverrides) });
  return tower.levels?.[0]?.stats;
}

function expectRejection(levelOverrides: AuthoredEntry, message: RegExp) {
  expect(() => parseLevelOne(levelOverrides)).toThrow(message);
}

describe('level abilities', () => {
  it('omits abilities when a level declares none (or an empty object)', () => {
    expect(parseLevelOne({})?.abilities).toBeUndefined();
    expect(parseLevelOne({ abilities: {} })?.abilities).toBeUndefined();
  });

  it('reads every authored ability', () => {
    const abilities = {
      critEveryNthShot: 4,
      critMultiplier: 2,
      extraTargets: 2,
      extraTargetDamageShare: 0.5,
      pierceLine: 0.3,
      airDamageMultiplier: 1.5,
      groundDamageMultiplier: 0.8,
      fullHealthBonusMultiplier: 2,
      largeTargetMultiplier: 1.25,
      minRangeCells: 2,
      volleyEveryMs: 4_000,
      volleyDamageShare: 0.6,
    };

    expect(parseLevelOne({ abilities })?.abilities).toEqual(abilities);
  });

  it('rejects an unknown ability, naming the file and tower', () => {
    expectRejection(
      { abilities: { critChance: 0.2 } },
      /content\/towers\/undead\.json \[undead_bone_archer_tower\].*critChance/,
    );
  });

  it('rejects abilities outside their bounds or not whole where they must be', () => {
    expectRejection({ abilities: { pierceLine: 1.5 } }, /pierceLine/);
    expectRejection({ abilities: { extraTargets: 1.5 } }, /whole number/);
    expectRejection({ abilities: { critEveryNthShot: 1, critMultiplier: 2 } }, /critEveryNthShot/);
  });

  it('rejects half of a pair', () => {
    expectRejection({ abilities: { critEveryNthShot: 3 } }, /needs "critMultiplier"/);
    expectRejection({ abilities: { critMultiplier: 3 } }, /needs "critEveryNthShot"/);
    expectRejection({ abilities: { extraTargetDamageShare: 0.5 } }, /needs "extraTargets"/);
    expectRejection({ abilities: { volleyDamageShare: 0.5 } }, /needs "volleyEveryMs"/);
  });

  it('rejects a minimum range that reaches the level range', () => {
    expectRejection({ abilities: { minRangeCells: 6 } }, /minRangeCells.*below the level range/);
  });

  it('places a tower with its level-one abilities', async () => {
    const { resolveTowerPlacementStats } = await import('../placementStats');
    const [tower] = parseTowerContentFile({
      file: FILE,
      data: towerWith({ abilities: { minRangeCells: 1 } }),
    });

    expect(resolveTowerPlacementStats(tower.towerType, tower).abilities).toEqual({
      minRangeCells: 1,
    });
  });
});

describe('on-hit effect extensions', () => {
  function effectEntry(effect: AuthoredEntry) {
    return parseLevelOne({ onHitEffects: [effect] })?.onHitEffects?.[0];
  }

  it('reads armorKind on an armor break, damageKind on a vulnerability, freeze on a chill', () => {
    expect(effectEntry({ effectId: 'armor_break', armorKind: 'physical' })).toMatchObject({
      effectId: EffectId.ARMOR_BREAK,
      armorKind: ArmorKind.PHYSICAL,
    });
    expect(effectEntry({ effectId: 'vulnerability', damageKind: 'magical' })).toMatchObject({
      effectId: EffectId.VULNERABILITY,
      damageKind: DamageScope.MAGICAL,
    });
    expect(effectEntry({ effectId: 'chill', freezeAtStacks: 4, freezeMs: 800 })).toMatchObject({
      effectId: EffectId.CHILL,
      freezeAtStacks: 4,
      freezeMs: 800,
    });
  });

  it('accepts stun and burn on hit, burn with a damage type', () => {
    expect(effectEntry({ effectId: 'stun', durationMs: 300 })).toMatchObject({
      effectId: EffectId.STUN,
      durationMs: 300,
    });
    expect(effectEntry({ effectId: 'burn', damageType: 'percent' })).toMatchObject({
      effectId: EffectId.BURN,
      damageType: 'percent',
    });
  });

  it('adds no extension fields when none are authored', () => {
    expect(effectEntry({ effectId: 'armor_break' })).not.toHaveProperty('armorKind');
  });

  it('rejects an extension on the wrong effect', () => {
    expectRejection(
      { onHitEffects: [{ effectId: 'chill', armorKind: 'physical' }] },
      /"chill" cannot declare "armorKind"/,
    );
    expectRejection(
      { onHitEffects: [{ effectId: 'poison', damageKind: 'all' }] },
      /cannot declare "damageKind"/,
    );
    expectRejection(
      { onHitEffects: [{ effectId: 'stun', freezeAtStacks: 3 }] },
      /cannot declare "freezeAtStacks"/,
    );
  });

  it('reads an authored stack cap on a stacking effect, 1 included', () => {
    expect(effectEntry({ effectId: 'armor_break', maxStacks: 1 })).toMatchObject({ maxStacks: 1 });
    expect(effectEntry({ effectId: 'burn', maxStacks: 2 })).toMatchObject({ maxStacks: 2 });
    expect(effectEntry({ effectId: 'poison' })?.maxStacks).toBeUndefined();
  });

  it('rejects a stack cap out of bounds, fractional or on a non-stacking effect', () => {
    expectRejection({ onHitEffects: [{ effectId: 'poison', maxStacks: 0 }] }, /maxStacks/);
    expectRejection({ onHitEffects: [{ effectId: 'poison', maxStacks: 11 }] }, /maxStacks/);
    expectRejection({ onHitEffects: [{ effectId: 'burn', maxStacks: 1.5 }] }, /whole number/);
    expectRejection(
      { onHitEffects: [{ effectId: 'chill', maxStacks: 2 }] },
      /"chill" does not stack and cannot declare "maxStacks"/,
    );
  });

  it('rejects unknown kinds and a freeze duration without a freeze count', () => {
    expectRejection(
      { onHitEffects: [{ effectId: 'armor_break', armorKind: 'percent' }] },
      /armorKind/,
    );
    expectRejection(
      { onHitEffects: [{ effectId: 'chill', freezeMs: 500 }] },
      /"freezeMs" needs "freezeAtStacks"/,
    );
  });
});

describe('aura extensions', () => {
  const baseAura = { radiusCells: 3, attackSpeedBonus: 0.1, rangeBonus: 0, stacking: 'strongest' };

  it('reads the optional economy and damage fields', () => {
    const aura = parseLevelOne({
      aura: {
        ...baseAura,
        damagePercentBonus: 0.15,
        damageBonusType: 'magical',
        goldPerKill: 2,
        incomePerRound: 5,
        sellRefundBonus: 0.1,
      },
    })?.aura;

    expect(aura).toEqual({
      radiusCells: 3,
      attackSpeedBonus: 0.1,
      rangeBonus: 0,
      stacking: TowerAuraStacking.STRONGEST,
      damagePercentBonus: 0.15,
      damageBonusType: DamageScope.MAGICAL,
      goldPerKill: 2,
      incomePerRound: 5,
      sellRefundBonus: 0.1,
    });
  });

  it('keeps the aura shape unchanged without extensions', () => {
    expect(parseLevelOne({ aura: baseAura })?.aura).toEqual({
      ...baseAura,
      stacking: TowerAuraStacking.STRONGEST,
    });
  });

  it('rejects a damage bonus type without a bonus and values out of bounds', () => {
    expectRejection(
      { aura: { ...baseAura, damageBonusType: 'all' } },
      /needs "damagePercentBonus"/,
    );
    expectRejection({ aura: { ...baseAura, sellRefundBonus: 2 } }, /sellRefundBonus/);
  });
});
