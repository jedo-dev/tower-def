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

describe('coneDegrees', () => {
  it('reads a cone opening in degrees', () => {
    expect(parseAbilities({ coneDegrees: 45 })).toEqual({ coneDegrees: 45 });
  });

  it('rejects an opening outside 10-180 naming the file and tower', () => {
    expectRejection({ coneDegrees: 5 }, /undead\.json \[undead_frost_wyrm_nest\].*coneDegrees/);
    expectRejection({ coneDegrees: 200 }, /coneDegrees/);
  });
});
