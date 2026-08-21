import { describe, expect, it } from 'vitest';
import {
  loadTowerArchetypeContent,
  loadTowerContent,
  parseTowerContentFile,
} from './loadTowerContent';
import { buildableTowers } from '../config/buildableTowers';
import { TOWER_ARCHETYPE_DEFINITIONS, TOWER_COMBAT_STATS_BY_TYPE } from '../types';
import {
  EffectId,
  RACE_IDS,
  RaceId,
  TOWER_TYPE_IDS,
  TowerTypeId,
} from '../../../../shared/types/content-ids';
import { BUILDABLE_TOWER_IDS } from '../towerIds';

const FILE = 'content/towers/undead.json';

type AuthoredEntry = Record<string, unknown>;

function createTower(overrides: AuthoredEntry = {}): AuthoredEntry {
  return {
    id: 'undead_bone_archer_tower',
    name: 'Bone Archer Tower',
    archetype: 'single',
    costGold: 50,
    damage: 22,
    range: 3.2,
    attackCooldownMs: 800,
    spriteKey: 'tower.undead.bone_archer',
    description: 'Necromantic archer nest built from cursed remains.',
    ...overrides,
  };
}

function createFile(towers: unknown[], overrides: AuthoredEntry = {}): AuthoredEntry {
  return { schemaVersion: 1, race: 'UNDEAD', towers, ...overrides };
}

function parse(data: unknown, file = FILE) {
  return parseTowerContentFile({ file, data });
}

describe('parseTowerContentFile', () => {
  it('returns typed towers for an authored race file', () => {
    const [tower] = parse(createFile([createTower()]));

    expect(tower).toEqual({
      id: 'undead_bone_archer_tower',
      name: 'Bone Archer Tower',
      faction: RaceId.UNDEAD,
      towerType: TowerTypeId.SINGLE,
      costGold: 50,
      damage: 22,
      range: 3.2,
      attackCooldownMs: 800,
      onHitEffects: [],
      spriteKey: 'tower.undead.bone_archer',
      description: 'Necromantic archer nest built from cursed remains.',
    });
  });

  it('reads splash radius and on-hit effects when a tower declares them', () => {
    const [tower] = parse(
      createFile([
        createTower({
          id: 'undead_plague_tower',
          archetype: 'splash',
          splashRadius: 1.5,
          onHitEffects: [{ effectId: 'poison', magnitude: 8, durationMs: 3000 }],
        }),
      ]),
    );

    expect(tower.splashRadius).toBe(1.5);
    expect(tower.onHitEffects).toEqual([
      { effectId: EffectId.POISON, magnitude: 8, durationMs: 3000 },
    ]);
  });

  it('rejects an unknown tower id', () => {
    expect(() => parse(createFile([createTower({ id: 'undead_soul_cannon' })])))
      .toThrow(`${FILE}: "id" is not a known value: undead_soul_cannon`);
  });

  it('rejects a tower authored under the wrong race', () => {
    expect(() => parse(createFile([createTower({ id: 'orc_spear_watchtower' })])))
      .toThrow(`${FILE} [orc_spear_watchtower]: id does not belong to race UNDEAD`);
  });

  it('rejects a level list that skips or reorders levels', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 1,
          archetypes: [
            createArchetype({
              levels: [
                { level: 2, upgradeCostGold: 0, damage: 20, range: 3, attackCooldownMs: 800 },
              ],
            }),
          ],
        },
      }),
    ).toThrow(/levels must be listed in order from 1/);
  });

  it('rejects an archetype with no attack kind', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 1,
          archetypes: [
            createArchetype({ attackKind: undefined }),
          ],
        },
      }),
    ).toThrow(/"attackKind" must be a non-empty string/);
  });

  it('rejects an unknown archetype', () => {
    expect(() => parse(createFile([createTower({ archetype: 'railgun' })])))
      .toThrow(`${FILE} [undead_bone_archer_tower]: "archetype" is not a known value: railgun`);
  });

  it('rejects an unknown on-hit effect', () => {
    expect(() => parse(createFile([createTower({ onHitEffects: [{ effectId: 'bleed' }] })])))
      .toThrow(`${FILE} [undead_bone_archer_tower]: "effectId" is not a known value: bleed`);
  });

  it('rejects stats outside the authoring bounds', () => {
    expect(() => parse(createFile([createTower({ range: 99 })])))
      .toThrow(`${FILE} [undead_bone_archer_tower]: "range" must be between 0.5 and 12, got 99`);
    expect(() => parse(createFile([createTower({ attackCooldownMs: 10 })])))
      .toThrow(/attackCooldownMs/);
  });

  it('rejects unknown fields on a tower', () => {
    expect(() => parse(createFile([createTower({ chainCount: 3 })])))
      .toThrow(`${FILE} [undead_bone_archer_tower]: unknown field "chainCount"`);
  });

  it('rejects a file with no towers', () => {
    expect(() => parse(createFile([]))).toThrow(`${FILE}: file declares no towers`);
  });
});

describe('loadTowerContent', () => {
  it('rejects the same tower declared in two files', () => {
    expect(() =>
      loadTowerContent([
        { file: FILE, data: createFile([createTower()]) },
        { file: 'content/towers/undead-extra.json', data: createFile([createTower()]) },
      ]),
    ).toThrow(/duplicate tower id, already declared in content\/towers\/undead\.json/);
  });
});

function createArchetype(overrides: AuthoredEntry = {}): AuthoredEntry {
  const entry: AuthoredEntry = {
    id: 'single',
    name: 'Archer',
    attackKind: 'single-target',
    damage: 20,
    range: 3,
    attackCooldownMs: 800,
    levels: [
      { level: 1, upgradeCostGold: 0, damage: 20, range: 3, attackCooldownMs: 800 },
      { level: 2, upgradeCostGold: 40, damage: 30, range: 3.2, attackCooldownMs: 750 },
    ],
    description: 'Single target.',
    ...overrides,
  };

  for (const [key, value] of Object.entries(entry)) {
    if (value === undefined) {
      delete entry[key];
    }
  }

  return entry;
}

describe('loadTowerArchetypeContent', () => {
  it('requires stats for every declared archetype', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 1,
          archetypes: [
            createArchetype(),
          ],
        },
      }),
    ).toThrow(/missing archetype stats for: splash/);
  });

  it('rejects a duplicate archetype', () => {
    const archetype = createArchetype();

    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: { schemaVersion: 1, archetypes: [archetype, archetype] },
      }),
    ).toThrow(/duplicate archetype id/);
  });
});

describe('shipped tower content', () => {
  it('loads a full roster for every race', () => {
    expect(buildableTowers.map((tower) => tower.id)).toEqual([...BUILDABLE_TOWER_IDS]);
  });

  it('gives every race a damage, an area and a crowd control tower', () => {
    const AREA_ARCHETYPES: TowerTypeId[] = [TowerTypeId.SPLASH, TowerTypeId.CHAIN];
    const CONTROL_ARCHETYPES: TowerTypeId[] = [
      TowerTypeId.FROST,
      TowerTypeId.POISON,
      TowerTypeId.CHAIN,
    ];

    for (const race of RACE_IDS) {
      const roster = buildableTowers.filter((tower) => tower.faction === race);
      const archetypes = roster.map((tower) => tower.towerType);

      expect(roster.length, race).toBe(4);
      expect(archetypes, race).toContain(TowerTypeId.SINGLE);
      expect(archetypes.some((archetype) => AREA_ARCHETYPES.includes(archetype)), race).toBe(true);
      expect(archetypes.some((archetype) => CONTROL_ARCHETYPES.includes(archetype)), race).toBe(true);
      expect(new Set(archetypes).size, `${race} avoids duplicate archetypes`).toBe(roster.length);
    }
  });

  it('prices the same archetype the same way for every race', () => {
    const costByArchetype = new Map<TowerTypeId, number>();

    for (const tower of buildableTowers) {
      const knownCost = costByArchetype.get(tower.towerType);

      if (knownCost === undefined) {
        costByArchetype.set(tower.towerType, tower.costGold);
        continue;
      }

      expect(tower.costGold, tower.id).toBe(knownCost);
    }
  });

  it('keeps the placement stats the game shipped with', () => {
    expect(TOWER_COMBAT_STATS_BY_TYPE.single).toEqual({
      damage: 20,
      range: 3,
      attackCooldownMs: 800,
    });
    expect(TOWER_COMBAT_STATS_BY_TYPE.splash).toEqual({
      damage: 18,
      range: 2.5,
      attackCooldownMs: 1200,
      splashRadius: 1.5,
    });
  });

  it('defines every archetype the game declares', () => {
    for (const archetypeId of TOWER_TYPE_IDS) {
      expect(TOWER_ARCHETYPE_DEFINITIONS[archetypeId].id, archetypeId).toBe(archetypeId);
    }
  });
});
