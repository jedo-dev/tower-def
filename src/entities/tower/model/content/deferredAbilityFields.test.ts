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

describe('coneDegrees', () => {
  it('reads a cone opening in degrees', () => {
    expect(parseAbilities({ coneDegrees: 45 })).toEqual({ coneDegrees: 45 });
  });

  it('rejects an opening outside 10-180 naming the file and tower', () => {
    expectRejection({ coneDegrees: 5 }, /undead\.json \[undead_frost_wyrm_nest\].*coneDegrees/);
    expectRejection({ coneDegrees: 200 }, /coneDegrees/);
  });
});
