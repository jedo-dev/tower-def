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
  TowerTargetScope,
  TowerTypeId,
} from '../../../../shared/types/content-ids';
import { BUILDABLE_TOWER_IDS } from '../towerIds';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { CONTENT_LORE_MAX_LENGTH } from '../../../../shared/lib/content/contentValidation';

/** Tower reach before the fine-grid migration, authored in 32px cells. */
const COARSE_CELL_SIZE_PX = 32;
const COARSE_GRID_RANGE = { guardArcher: 3, cannonSplash: 1.5 } as const;

const FILE = 'content/towers/undead.json';

type AuthoredEntry = Record<string, unknown>;

function createTower(overrides: AuthoredEntry = {}): AuthoredEntry {
  return {
    id: 'undead_bone_archer_tower',
    name: 'Bone Archer Tower',
    archetype: 'single',
    costGold: 50,
    damage: 22,
    range: 6.4,
    attackCooldownMs: 800,
    spriteKey: 'tower.undead.bone_archer',
    description: 'Necromantic archer nest built from cursed remains.',
    ...overrides,
  };
}

function createFile(towers: unknown[], overrides: AuthoredEntry = {}): AuthoredEntry {
  return { schemaVersion: 3, race: 'UNDEAD', towers, ...overrides };
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
      allowedTargets: 'both',
      costGold: 50,
      damage: 22,
      range: 6.4,
      attackCooldownMs: 800,
      onHitEffects: [],
      spriteKey: 'tower.undead.bone_archer',
      description: 'Necromantic archer nest built from cursed remains.',
    });
  });

  it('reads the lore a tower declares and omits it otherwise', () => {
    const [withLore, withoutLore] = parse(
      createFile([
        createTower({ lore: 'Archers who died at their posts and were not relieved.' }),
        createTower({ id: 'undead_plague_tower', archetype: 'splash' }),
      ]),
    );

    expect(withLore.lore).toBe('Archers who died at their posts and were not relieved.');
    expect(withoutLore).not.toHaveProperty('lore');
  });

  it('rejects lore longer than the display limit', () => {
    const lore = 'x'.repeat(CONTENT_LORE_MAX_LENGTH + 1);

    expect(() => parse(createFile([createTower({ lore })]))).toThrow(
      `${FILE} [undead_bone_archer_tower]: "lore" must be at most ${CONTENT_LORE_MAX_LENGTH} characters, got ${CONTENT_LORE_MAX_LENGTH + 1}`,
    );
  });

  it('reads splash radius and on-hit effects when a tower declares them', () => {
    const [tower] = parse(
      createFile([
        createTower({
          id: 'undead_plague_tower',
          archetype: 'splash',
          splashRadius: 3,
          onHitEffects: [{ effectId: 'poison', magnitude: 8, durationMs: 3000 }],
        }),
      ]),
    );

    expect(tower.splashRadius).toBe(3);
    expect(tower.onHitEffects).toEqual([
      { effectId: EffectId.POISON, magnitude: 8, durationMs: 3000 },
    ]);
  });

  it('rejects an unknown tower id', () => {
    expect(() => parse(createFile([createTower({ id: 'undead_soul_cannon' })]))).toThrow(
      `${FILE}: "id" is not a known value: undead_soul_cannon`,
    );
  });

  it('rejects a tower authored under the wrong race', () => {
    expect(() => parse(createFile([createTower({ id: 'orc_spear_watchtower' })]))).toThrow(
      `${FILE} [orc_spear_watchtower]: id does not belong to race UNDEAD`,
    );
  });

  it('rejects a level list that skips or reorders levels', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 3,
          archetypes: [
            createArchetype({
              levels: [
                { level: 2, upgradeCostGold: 0, damage: 20, range: 6, attackCooldownMs: 800 },
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
          schemaVersion: 3,
          archetypes: [createArchetype({ attackKind: undefined })],
        },
      }),
    ).toThrow(/"attackKind" must be a non-empty string/);
  });

  it('rejects an unknown archetype', () => {
    expect(() => parse(createFile([createTower({ archetype: 'railgun' })]))).toThrow(
      `${FILE} [undead_bone_archer_tower]: "archetype" is not a known value: railgun`,
    );
  });

  it('rejects an unknown on-hit effect', () => {
    expect(() =>
      parse(createFile([createTower({ onHitEffects: [{ effectId: 'bleed' }] })])),
    ).toThrow(`${FILE} [undead_bone_archer_tower]: "effectId" is not a known value: bleed`);
  });

  it('rejects stats outside the authoring bounds', () => {
    expect(() => parse(createFile([createTower({ range: 99 })]))).toThrow(
      `${FILE} [undead_bone_archer_tower]: "range" must be between 1 and 24, got 99`,
    );
    expect(() => parse(createFile([createTower({ attackCooldownMs: 10 })]))).toThrow(
      /attackCooldownMs/,
    );
  });

  it('rejects unknown fields on a tower', () => {
    expect(() => parse(createFile([createTower({ chainCount: 3 })]))).toThrow(
      `${FILE} [undead_bone_archer_tower]: unknown field "chainCount"`,
    );
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
    damageType: 'physical',
    damage: 20,
    range: 6,
    attackCooldownMs: 800,
    levels: [
      { level: 1, upgradeCostGold: 0, damage: 20, range: 6, attackCooldownMs: 800 },
      { level: 2, upgradeCostGold: 40, damage: 30, range: 6.4, attackCooldownMs: 750 },
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

describe('tower content schema version', () => {
  it('rejects a coarse-grid race file and names the first tower to migrate', () => {
    expect(() => parse(createFile([createTower()], { schemaVersion: 1 }))).toThrow(
      `${FILE} [undead_bone_archer_tower]: schemaVersion 1 measures distances in coarse 32px cells`,
    );
  });

  it('rejects a coarse-grid archetype file and names the first archetype', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: { schemaVersion: 1, archetypes: [createArchetype()] },
      }),
    ).toThrow('content/towers/archetypes.json [single]: schemaVersion 1 measures distances');
  });

  it('rejects an untyped-damage version 2 file and names the first tower to migrate', () => {
    expect(() => parse(createFile([createTower()], { schemaVersion: 2 }))).toThrow(
      `${FILE} [undead_bone_archer_tower]: schemaVersion 2 has no damage types; ` +
        'add a "damageType" (physical, magical or percent) to every archetype and set schemaVersion 3',
    );
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: { schemaVersion: 2, archetypes: [createArchetype()] },
      }),
    ).toThrow('content/towers/archetypes.json [single]: schemaVersion 2 has no damage types');
  });

  it('rejects any other unknown version at file level', () => {
    expect(() => parse(createFile([createTower()], { schemaVersion: 4 }))).toThrow(
      `${FILE}: unsupported schemaVersion 4, expected 3`,
    );
  });
});

describe('loadTowerArchetypeContent', () => {
  it('requires stats for every declared archetype', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 3,
          archetypes: [createArchetype()],
        },
      }),
    ).toThrow(/missing archetype stats for: splash/);
  });

  it('rejects a duplicate archetype', () => {
    const archetype = createArchetype();

    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: { schemaVersion: 3, archetypes: [archetype, archetype] },
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
      expect(
        archetypes.some((archetype) => AREA_ARCHETYPES.includes(archetype)),
        race,
      ).toBe(true);
      expect(
        archetypes.some((archetype) => CONTROL_ARCHETYPES.includes(archetype)),
        race,
      ).toBe(true);
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

  it('keeps the placement stats the game shipped with, in fine-grid cells', () => {
    expect(TOWER_COMBAT_STATS_BY_TYPE.single).toEqual({
      damage: 20,
      range: 6,
      attackCooldownMs: 800,
    });
    expect(TOWER_COMBAT_STATS_BY_TYPE.splash).toEqual({
      damage: 18,
      range: 5,
      attackCooldownMs: 1200,
      splashRadius: 3,
    });
  });

  it('keeps world-space reach unchanged by the fine-grid migration', () => {
    const guardArcher = buildableTowers.find((tower) => tower.id === 'human_guard_archer_tower');
    const cannon = buildableTowers.find((tower) => tower.id === 'human_cannon_bastion');

    expect(guardArcher).toBeDefined();
    expect(cannon).toBeDefined();
    expect((guardArcher?.range ?? 0) * GRID_DIMENSIONS.cellSize).toBe(
      COARSE_GRID_RANGE.guardArcher * COARSE_CELL_SIZE_PX,
    );
    expect((cannon?.splashRadius ?? 0) * GRID_DIMENSIONS.cellSize).toBe(
      COARSE_GRID_RANGE.cannonSplash * COARSE_CELL_SIZE_PX,
    );
  });

  it('defines every archetype the game declares', () => {
    for (const archetypeId of TOWER_TYPE_IDS) {
      expect(TOWER_ARCHETYPE_DEFINITIONS[archetypeId].id, archetypeId).toBe(archetypeId);
    }
  });
});

describe('allowedTargets', () => {
  it('defaults to both when the content omits it', () => {
    const [tower] = parse(createFile([createTower()]));
    expect(tower.allowedTargets).toBe(TowerTargetScope.BOTH);
  });

  it('reads an authored scope', () => {
    const [tower] = parse(createFile([createTower({ allowedTargets: 'ground' })]));
    expect(tower.allowedTargets).toBe(TowerTargetScope.GROUND);
  });

  it('rejects an unknown scope, naming the file and tower', () => {
    expect(() => parse(createFile([createTower({ allowedTargets: 'sky' })]))).toThrow(
      new RegExp(`${FILE} \\[undead_bone_archer_tower\\].*allowedTargets`),
    );
  });

  it('is authored on every shipped archetype and mirrored by every race tower', () => {
    for (const tower of buildableTowers) {
      expect(tower.allowedTargets, tower.id).toBe(
        TOWER_ARCHETYPE_DEFINITIONS[tower.towerType].allowedTargets,
      );
    }
    // Splash stays on the ground; chain arcs reach fliers (tower-def-xwc.5), as do
    // single-target attacks.
    expect(TOWER_ARCHETYPE_DEFINITIONS.splash.allowedTargets).toBe(TowerTargetScope.GROUND);
    expect(TOWER_ARCHETYPE_DEFINITIONS.chain.allowedTargets).toBe(TowerTargetScope.BOTH);
    expect(TOWER_ARCHETYPE_DEFINITIONS.single.allowedTargets).toBe(TowerTargetScope.BOTH);
    expect(TOWER_ARCHETYPE_DEFINITIONS.frost.allowedTargets).toBe(TowerTargetScope.BOTH);
    expect(TOWER_ARCHETYPE_DEFINITIONS.poison.allowedTargets).toBe(TowerTargetScope.BOTH);
  });

  it('gives every race a damage tower that can shoot air', () => {
    for (const race of RACE_IDS) {
      const antiAir = buildableTowers.filter(
        (tower) =>
          tower.faction === race &&
          tower.allowedTargets !== TowerTargetScope.GROUND &&
          TOWER_ARCHETYPE_DEFINITIONS[tower.towerType].attackKind !== 'aura',
      );
      expect(antiAir.length, race).toBeGreaterThan(0);
    }
  });
});
