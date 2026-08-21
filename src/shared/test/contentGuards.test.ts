import { describe, expect, it } from 'vitest';
import {
  getAllUnitConfigs,
  getUnitsByFaction,
  tryResolveUnitConfigById,
  UNIT_IDS,
  type UnitConfig,
} from '../../entities/unit';
import { UNIT_STAT_BOUNDS } from '../../entities/unit/model/content/unitContent.types';
import { generateWaveUnits, WAVE_UNIT_COUNT_BOUNDS } from '../../entities/wave';
import { getAllRaceRegistries } from '../../entities/race-registry';
import { RACE_IDS } from '../types/content-ids';

/**
 * Guards that catch bad creature authoring before it reaches a scene. The
 * content loader already rejects malformed files; these assertions cover the
 * gaps it cannot see: ids nothing references, races nothing can send, and
 * stats that are valid but unplayable.
 */

const DESIGN_BOUNDS = {
  health: { min: 50, max: 1200 },
  speed: { min: 0.5, max: 2.5 },
  damage: { min: 5, max: 120 },
  rewardGold: { min: 1, max: 60 },
} as const;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('creature content guards', () => {
  it('backs every declared creature id with authored content', () => {
    const missing = UNIT_IDS.filter((unitId) => tryResolveUnitConfigById(unitId) === undefined);

    expect(missing).toEqual([]);
  });

  it('declares no creature that nothing can reference', () => {
    const declared = new Set<string>(UNIT_IDS);
    const orphans = getAllUnitConfigs()
      .map((unit) => unit.id)
      .filter((id) => !declared.has(id));

    expect(orphans).toEqual([]);
  });

  it('resolves every creep a race can send', () => {
    for (const registry of getAllRaceRegistries()) {
      for (const creepId of registry.sendableCreepIds) {
        const unit = tryResolveUnitConfigById(creepId);

        expect(unit, `${registry.raceId} sends ${creepId}`).toBeDefined();
        expect(unit?.faction, `${creepId} belongs to ${registry.raceId}`).toBe(registry.raceId);
      }
    }
  });

  it('keeps every creature inside the schema bounds', () => {
    for (const unit of getAllUnitConfigs()) {
      for (const [statKey, bound] of Object.entries(UNIT_STAT_BOUNDS)) {
        const value = unit[statKey as keyof UnitConfig] as number;

        expect(value, `${unit.id}.${statKey}`).toBeGreaterThanOrEqual(bound.min);
        expect(value, `${unit.id}.${statKey}`).toBeLessThanOrEqual(bound.max);
      }
    }
  });

  it('keeps every creature inside the tighter design bounds', () => {
    for (const unit of getAllUnitConfigs()) {
      for (const [statKey, bound] of Object.entries(DESIGN_BOUNDS)) {
        const value = unit[statKey as keyof UnitConfig] as number;

        expect(value, `${unit.id}.${statKey}`).toBeGreaterThanOrEqual(bound.min);
        expect(value, `${unit.id}.${statKey}`).toBeLessThanOrEqual(bound.max);
      }
    }
  });

  it('gives every creature a unique non-empty sprite key', () => {
    const spriteKeys = getAllUnitConfigs().map((unit) => unit.spriteKey);

    expect(spriteKeys.every((key) => key.startsWith('unit.'))).toBe(true);
    expect(new Set(spriteKeys).size).toBe(spriteKeys.length);
  });

  it('composes a playable wave for every race from wave 1 to 20', () => {
    for (const race of RACE_IDS) {
      const factionUnits = [...getUnitsByFaction(race)];

      for (let waveNumber = 1; waveNumber <= 20; waveNumber += 1) {
        const units = generateWaveUnits({
          waveNumber,
          factionUnits,
          random: seededRandom(waveNumber * 31 + race.length),
        });

        expect(units.length, `${race} wave ${waveNumber}`).toBeGreaterThanOrEqual(
          WAVE_UNIT_COUNT_BOUNDS.min,
        );
        expect(units.length, `${race} wave ${waveNumber}`).toBeLessThanOrEqual(
          WAVE_UNIT_COUNT_BOUNDS.max,
        );
        expect(
          units.every((unit) => unit.faction === race),
          `${race} wave ${waveNumber} stays in faction`,
        ).toBe(true);
      }
    }
  });
});
