import { describe, expect, it } from 'vitest';
import sampleRaceContent from './fixtures/sampleRaceContent.json';
import {
  UNIT_CONTENT_FILE_KEYS,
  UNIT_CONTENT_OPTIONAL_KEYS,
  UNIT_CONTENT_REQUIRED_KEYS,
  UNIT_CONTENT_SCHEMA_VERSION,
  UNIT_STAT_BOUNDS,
  type UnitContentEntry,
  type UnitContentFile,
  type UnitContentStatKey,
} from './unitContent.types';
import type { UnitConfig } from '../types';

// Compile-time contract: an authored file is assignable to the schema type, so
// a malformed fixture fails the type check before the assertions below run.
const authoredFile: UnitContentFile = sampleRaceContent;

// Compile-time contract: authored stat names match the runtime unit config, so
// migrating a race to content never requires renaming a downstream field.
const contentStatKeyToRuntimeKey: Record<UnitContentStatKey, keyof UnitConfig> = {
  health: 'health',
  speed: 'speed',
  armor: 'armor',
  damage: 'damage',
  rewardGold: 'rewardGold',
};

function getEntryKeys(entry: UnitContentEntry): string[] {
  return Object.keys(entry);
}

describe('unit content schema', () => {
  it('declares the current schema version on authored files', () => {
    expect(authoredFile.schemaVersion).toBe(UNIT_CONTENT_SCHEMA_VERSION);
  });

  it('exposes every authored file key', () => {
    expect([...UNIT_CONTENT_FILE_KEYS].sort()).toEqual(['race', 'schemaVersion', 'units']);
  });

  it('requires every non-optional field on each authored creature', () => {
    for (const unit of authoredFile.units) {
      for (const requiredKey of UNIT_CONTENT_REQUIRED_KEYS) {
        expect(unit[requiredKey], `${unit.id}.${requiredKey}`).toBeDefined();
      }
    }
  });

  it('allows optional fields to be omitted', () => {
    const withoutDescription = authoredFile.units.find((unit) => unit.description === undefined);

    expect(withoutDescription).toBeDefined();
    expect(UNIT_CONTENT_OPTIONAL_KEYS).toContain('description');
  });

  it('accepts no keys beyond the declared schema', () => {
    const declaredKeys = new Set<string>([
      ...UNIT_CONTENT_REQUIRED_KEYS,
      ...UNIT_CONTENT_OPTIONAL_KEYS,
    ]);

    for (const unit of authoredFile.units) {
      for (const key of getEntryKeys(unit)) {
        expect(declaredKeys.has(key), `unexpected key ${key} on ${unit.id}`).toBe(true);
      }
    }
  });

  it('keeps authored stats inside the declared bounds', () => {
    for (const unit of authoredFile.units) {
      for (const statKey of Object.keys(UNIT_STAT_BOUNDS) as UnitContentStatKey[]) {
        const value = unit[statKey];
        const bound = UNIT_STAT_BOUNDS[statKey];

        expect(Number.isFinite(value), `${unit.id}.${statKey}`).toBe(true);
        expect(value, `${unit.id}.${statKey}`).toBeGreaterThanOrEqual(bound.min);
        expect(value, `${unit.id}.${statKey}`).toBeLessThanOrEqual(bound.max);
      }
    }
  });

  it('names stats exactly as the runtime unit config does', () => {
    for (const [contentKey, runtimeKey] of Object.entries(contentStatKeyToRuntimeKey)) {
      expect(contentKey).toBe(runtimeKey);
    }
  });

  it('lets content express a creature that is faster but frailer than its peer', () => {
    const skeleton = authoredFile.units.find((unit) => unit.id === 'undead_skeleton');
    const ghoul = authoredFile.units.find((unit) => unit.id === 'undead_ghoul');

    expect(skeleton).toBeDefined();
    expect(ghoul).toBeDefined();
    expect(ghoul?.tier).toBe(skeleton?.tier);
    expect(ghoul!.speed).toBeGreaterThan(skeleton!.speed);
    expect(ghoul!.health).toBeLessThan(skeleton!.health);
  });
});
