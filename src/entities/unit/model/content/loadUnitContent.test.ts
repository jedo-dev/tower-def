import { describe, expect, it } from 'vitest';
import sampleRaceContent from './fixtures/sampleRaceContent.json';
import { loadUnitContent, parseUnitContentFile } from './loadUnitContent';
import { RaceId } from '../../../../shared/types/content-ids';
import { UnitTier } from '../types';

const FILE = 'content/units/undead.json';

type AuthoredEntry = Record<string, unknown>;

function createEntry(overrides: AuthoredEntry = {}): AuthoredEntry {
  return {
    id: 'undead_skeleton',
    name: 'Skeleton',
    tier: 1,
    health: 110,
    speed: 1.3,
    armor: 0,
    damage: 12,
    rewardGold: 6,
    spriteKey: 'unit.undead.skeleton',
    ...overrides,
  };
}

function createFile(units: unknown[], overrides: AuthoredEntry = {}): AuthoredEntry {
  return {
    schemaVersion: 1,
    race: 'UNDEAD',
    units,
    ...overrides,
  };
}

function parse(data: unknown, file = FILE): ReturnType<typeof parseUnitContentFile> {
  return parseUnitContentFile({ file, data });
}

describe('parseUnitContentFile', () => {
  it('returns typed creatures for an authored race file', () => {
    const units = parse(sampleRaceContent);

    expect(units).toHaveLength(2);
    expect(units[0]).toEqual({
      id: 'undead_skeleton',
      name: 'Skeleton',
      faction: RaceId.UNDEAD,
      tier: UnitTier.TIER_1,
      health: 110,
      speed: 1.3,
      armor: 0,
      damage: 12,
      rewardGold: 6,
      spriteKey: 'unit.undead.skeleton',
      description: 'Restless bones marching from forgotten crypts.',
    });
    expect(units[1].description).toBeUndefined();
  });

  it('rejects a file that is not an object', () => {
    expect(() => parse([])).toThrow(`${FILE}: expected an object`);
  });

  it('rejects unknown top-level fields', () => {
    expect(() => parse(createFile([createEntry()], { notes: 'wip' })))
      .toThrow(`${FILE}: unknown field "notes"`);
  });

  it('rejects an unsupported schema version', () => {
    expect(() => parse(createFile([createEntry()], { schemaVersion: 2 })))
      .toThrow(`${FILE}: unsupported schemaVersion 2, expected 1`);
  });

  it('rejects an unknown race', () => {
    expect(() => parse(createFile([createEntry()], { race: 'GOBLIN' })))
      .toThrow(`${FILE}: "race" is not a known value: GOBLIN`);
  });

  it('rejects a file without creatures', () => {
    expect(() => parse(createFile([]))).toThrow(`${FILE}: file declares no units`);
  });

  it('rejects an entry that is not an object', () => {
    expect(() => parse(createFile(['undead_skeleton']))).toThrow(`${FILE}: expected an object`);
  });

  it('rejects an unknown creature id', () => {
    expect(() => parse(createFile([createEntry({ id: 'undead_lich' })])))
      .toThrow(`${FILE}: "id" is not a known value: undead_lich`);
  });

  it('rejects a creature authored under the wrong race', () => {
    expect(() => parse(createFile([createEntry({ id: 'orc_grunt' })])))
      .toThrow(`${FILE} [orc_grunt]: id does not belong to race UNDEAD`);
  });

  it('rejects unknown fields on a creature', () => {
    expect(() => parse(createFile([createEntry({ splashRadius: 2 })])))
      .toThrow(`${FILE} [undead_skeleton]: unknown field "splashRadius"`);
  });

  it('rejects a missing name', () => {
    expect(() => parse(createFile([createEntry({ name: '' })])))
      .toThrow(`${FILE} [undead_skeleton]: "name" must be a non-empty string`);
  });

  it('rejects a tier outside the declared tiers', () => {
    expect(() => parse(createFile([createEntry({ tier: 9 })])))
      .toThrow(`${FILE} [undead_skeleton]: "tier" must be one of 1, 2, 3, 4, 5, 6, got 9`);
  });

  it('rejects a stat that is not a finite number', () => {
    expect(() => parse(createFile([createEntry({ speed: 'fast' })])))
      .toThrow(`${FILE} [undead_skeleton]: "speed" must be a finite number`);
  });

  it('rejects a stat outside the authoring bounds', () => {
    expect(() => parse(createFile([createEntry({ health: 99999 })])))
      .toThrow(`${FILE} [undead_skeleton]: "health" must be between 1 and 5000, got 99999`);
  });

  it('rejects a duplicate creature id inside one file', () => {
    expect(() => parse(createFile([createEntry(), createEntry()])))
      .toThrow(`${FILE} [undead_skeleton]: duplicate unit id`);
  });
});

describe('loadUnitContent', () => {
  it('merges every authored race file into one roster', () => {
    const units = loadUnitContent([
      { file: FILE, data: createFile([createEntry()]) },
      {
        file: 'content/units/orc.json',
        data: createFile([createEntry({ id: 'orc_grunt', name: 'Grunt', spriteKey: 'unit.orc.grunt' })], {
          race: 'ORC',
        }),
      },
    ]);

    expect(units.map((unit) => unit.id)).toEqual(['undead_skeleton', 'orc_grunt']);
    expect(units[1].faction).toBe(RaceId.ORC);
  });

  it('rejects the same creature id declared in two files', () => {
    expect(() =>
      loadUnitContent([
        { file: FILE, data: createFile([createEntry()]) },
        { file: 'content/units/undead-extra.json', data: createFile([createEntry()]) },
      ]),
    ).toThrow('content/units/undead-extra.json [undead_skeleton]: duplicate unit id, already declared in content/units/undead.json');
  });

  it('returns an empty roster when nothing is authored', () => {
    expect(loadUnitContent([])).toEqual([]);
  });
});
