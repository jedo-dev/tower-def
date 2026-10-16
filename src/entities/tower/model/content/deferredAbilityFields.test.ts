import { describe, expect, it } from 'vitest';
import { parseLevelStats } from './towerContentFields';

// Loader checks of the deferred talent mechanics (tower-def-bge.9): cone,
// knockback, grounding fliers, corpse explosions and ground zones.

const LOCATION = { file: 'content/towers/undead.json', entityId: 'undead_frost_wyrm_nest' };

function parseAbilities(abilities: Record<string, unknown>) {
  return parseLevelStats({ damage: 30, range: 7, attackCooldownMs: 800, abilities }, LOCATION)
    .abilities;
}

function expectRejection(abilities: Record<string, unknown>, message: RegExp) {
  expect(() => parseAbilities(abilities)).toThrow(message);
}

describe('knockbackCells and groundsFliersMs', () => {
  it('reads both and rejects them out of bounds', () => {
    expect(parseAbilities({ knockbackCells: 1, groundsFliersMs: 1_000 })).toEqual({
      knockbackCells: 1,
      groundsFliersMs: 1_000,
    });
    expectRejection({ knockbackCells: 4 }, /knockbackCells/);
    expectRejection({ groundsFliersMs: 50 }, /groundsFliersMs/);
  });
});

describe('chill groundsFliersMs', () => {
  function parseEffect(effect: Record<string, unknown>) {
    return parseLevelStats(
      { damage: 30, range: 7, attackCooldownMs: 800, onHitEffects: [effect] },
      LOCATION,
    ).onHitEffects?.[0];
  }

  it('reads it on a freezing chill', () => {
    const effect = { effectId: 'chill', freezeAtStacks: 3, freezeMs: 1200, groundsFliersMs: 1200 };
    expect(parseEffect(effect)?.groundsFliersMs).toBe(1200);
  });

  it('needs freezeAtStacks and is chill only', () => {
    expect(() => parseEffect({ effectId: 'chill', groundsFliersMs: 1000 })).toThrow(
      /needs "freezeAtStacks"/,
    );
    expect(() => parseEffect({ effectId: 'stun', groundsFliersMs: 1000 })).toThrow(/only "chill"/);
  });
});

describe('corpse explosion', () => {
  it('reads share, radius and chain limit together', () => {
    const blast = {
      corpseExplosionShare: 0.4,
      corpseExplosionRadiusCells: 3,
      corpseExplosionChainLimit: 3,
    };
    expect(parseAbilities(blast)).toEqual(blast);
  });

  it('needs share and radius together and a whole chain limit', () => {
    expectRejection({ corpseExplosionShare: 0.4 }, /needs "corpseExplosionRadiusCells"/);
    expectRejection({ corpseExplosionRadiusCells: 2 }, /needs "corpseExplosionShare"/);
    expectRejection(
      { corpseExplosionShare: 0.4, corpseExplosionRadiusCells: 2, corpseExplosionChainLimit: 1.5 },
      /whole number/,
    );
  });
});

describe('coneDegrees', () => {
  it('reads a cone opening in degrees', () => {
    expect(parseAbilities({ coneDegrees: 45 })).toEqual({ coneDegrees: 45 });
  });

  it('rejects an opening outside 10-180 naming the file and tower', () => {
    expectRejection({ coneDegrees: 5 }, /undead\.json \[undead_frost_wyrm_nest\].*coneDegrees/);
    expectRejection({ coneDegrees: 200 }, /coneDegrees/);
  });
});

describe('groundZone', () => {
  const zone = {
    radiusCells: 2,
    durationMs: 3_000,
    tickMs: 500,
    damage: 4,
    damageType: 'magical',
    chill: 0.15,
  };

  it('reads the zone object', () => {
    expect(parseAbilities({ groundZone: zone })).toEqual({ groundZone: zone });
  });

  it('rejects unknown keys, bad types and out-of-bound numbers', () => {
    expectRejection({ groundZone: { ...zone, colour: 'green' } }, /colour/);
    expectRejection({ groundZone: { ...zone, damageType: 'fire' } }, /damageType/);
    expectRejection({ groundZone: { ...zone, radiusCells: 10 } }, /radiusCells/);
    expectRejection({ groundZone: { ...zone, chill: 0.9 } }, /chill/);
  });

  it('needs damage or chill, and a tick within its duration', () => {
    const { chill: _chill, ...noChill } = zone;
    expectRejection({ groundZone: { ...noChill, damage: 0 } }, /must deal damage or chill/);
    expectRejection({ groundZone: { ...zone, tickMs: 4_000 } }, /tickMs/);
  });
});
