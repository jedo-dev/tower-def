import { describe, expect, it } from 'vitest';
import { loadTowerArchetypeContent, parseTowerContentFile } from './content/loadTowerContent';
import { buildableTowers } from './config/buildableTowers';
import { resolveBuildableTowerDamageType, resolveTowerDamageType } from './damageType';
import { TOWER_ARCHETYPE_DEFINITIONS, TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';
import {
  createBaseLevelsFixture,
  createTalentBranchesFixture,
} from './content/fixtures/talentBranchFixture';
import { DamageType, TOWER_TYPE_IDS, TowerTypeId } from '../../../shared/types/content-ids';

const FILE = 'content/towers/undead.json';
const ARCHETYPE_FILE = 'content/towers/archetypes.json';

function createTowerFile(towerOverrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 4,
    race: 'UNDEAD',
    towers: [
      {
        id: 'undead_bone_archer_tower',
        name: 'Bone Archer Tower',
        archetype: 'single',
        costGold: 50,
        damage: 22,
        range: 6.4,
        attackCooldownMs: 800,
        spriteKey: 'tower.undead.bone_archer',
        description: 'Necromantic archer nest built from cursed remains.',
        talentBranches: createTalentBranchesFixture('undead_bone_archer_tower'),
        ...towerOverrides,
      },
    ],
  };
}

function createArchetypeFile(archetypeOverrides: Record<string, unknown> = {}) {
  const archetype: Record<string, unknown> = {
    id: 'single',
    name: 'Archer',
    attackKind: 'single-target',
    damageType: 'physical',
    damage: 20,
    range: 6,
    attackCooldownMs: 800,
    levels: createBaseLevelsFixture(),
    description: 'Single target.',
    ...archetypeOverrides,
  };

  for (const [key, value] of Object.entries(archetype)) {
    if (value === undefined) {
      delete archetype[key];
    }
  }

  return { schemaVersion: 4, archetypes: [archetype] };
}

function createTowerEntity(overrides: Partial<TowerEntity> = {}): TowerEntity {
  return {
    id: 'tower:test',
    position: { x: 0, y: 0 },
    cost: 50,
    type: TowerTypeId.SINGLE,
    level: 1,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE] },
    ...overrides,
  };
}

describe('tower damage type content', () => {
  it('requires a known damage type on every archetype', () => {
    expect(() =>
      loadTowerArchetypeContent({
        file: ARCHETYPE_FILE,
        data: createArchetypeFile({ damageType: undefined }),
      }),
    ).toThrow(`${ARCHETYPE_FILE} [single]: "damageType" must be a non-empty string`);
    expect(() =>
      loadTowerArchetypeContent({
        file: ARCHETYPE_FILE,
        data: createArchetypeFile({ damageType: 'holy' }),
      }),
    ).toThrow(`${ARCHETYPE_FILE} [single]: "damageType" is not a known value: holy`);
  });

  it('lets a race tower override the archetype type and leaves it absent otherwise', () => {
    const [inherited] = parseTowerContentFile({ file: FILE, data: createTowerFile() });
    const [overridden] = parseTowerContentFile({
      file: FILE,
      data: createTowerFile({ damageType: 'percent' }),
    });

    expect(inherited.damageType).toBeUndefined();
    expect(resolveBuildableTowerDamageType(inherited)).toBe(
      TOWER_ARCHETYPE_DEFINITIONS[TowerTypeId.SINGLE].damageType,
    );
    expect(overridden.damageType).toBe(DamageType.PERCENT);
    expect(resolveBuildableTowerDamageType(overridden)).toBe(DamageType.PERCENT);
    expect(() =>
      parseTowerContentFile({ file: FILE, data: createTowerFile({ damageType: 'holy' }) }),
    ).toThrow(`${FILE} [undead_bone_archer_tower]: "damageType" is not a known value: holy`);
  });

  it('ships direct-fire archetypes as physical and effect archetypes as magical', () => {
    const expected: Record<TowerTypeId, DamageType> = {
      [TowerTypeId.SINGLE]: DamageType.PHYSICAL,
      [TowerTypeId.SPLASH]: DamageType.PHYSICAL,
      [TowerTypeId.CHAIN]: DamageType.PHYSICAL,
      [TowerTypeId.FROST]: DamageType.MAGICAL,
      [TowerTypeId.POISON]: DamageType.MAGICAL,
      [TowerTypeId.SUPPORT]: DamageType.MAGICAL,
    };

    for (const archetypeId of TOWER_TYPE_IDS) {
      expect(TOWER_ARCHETYPE_DEFINITIONS[archetypeId].damageType, archetypeId).toBe(
        expected[archetypeId],
      );
    }
  });
});

describe('shipped race tower damage types (docs/08 "Damage type")', () => {
  const EXPECTED_TOWER_DAMAGE_TYPES: Record<string, DamageType> = {
    undead_bone_archer_tower: DamageType.PHYSICAL,
    undead_plague_tower: DamageType.MAGICAL,
    undead_frost_wyrm_nest: DamageType.MAGICAL,
    undead_bone_obelisk: DamageType.MAGICAL,
    orc_spear_watchtower: DamageType.PHYSICAL,
    orc_burning_pit: DamageType.PHYSICAL,
    orc_lightning_totem: DamageType.MAGICAL,
    orc_tar_pit: DamageType.MAGICAL,
    human_guard_archer_tower: DamageType.PHYSICAL,
    human_cannon_bastion: DamageType.PHYSICAL,
    human_alchemist_tower: DamageType.MAGICAL,
    human_guard_post: DamageType.MAGICAL,
    elf_moon_archer_tower: DamageType.PHYSICAL,
    elf_wisp_bloom: DamageType.MAGICAL,
    elf_moonwell: DamageType.MAGICAL,
    elf_thorn_spire: DamageType.PERCENT,
  };

  it('deals the damage type each race tower is authored with', () => {
    const actual = Object.fromEntries(
      buildableTowers.map((tower) => [tower.id, resolveBuildableTowerDamageType(tower)]),
    );

    expect(actual).toEqual(EXPECTED_TOWER_DAMAGE_TYPES);
  });

  it('gives every race at least one physical and one magical damage tower', () => {
    const typesByRace = new Map<string, Set<DamageType>>();

    for (const tower of buildableTowers) {
      const types = typesByRace.get(tower.faction) ?? new Set<DamageType>();
      types.add(resolveBuildableTowerDamageType(tower));
      typesByRace.set(tower.faction, types);
    }

    for (const [race, types] of typesByRace) {
      expect(types.has(DamageType.PHYSICAL), `${race} physical`).toBe(true);
      expect(types.has(DamageType.MAGICAL), `${race} magical`).toBe(true);
    }
  });

  it('makes the percent tower poison in percent at every level', () => {
    const thornSpire = buildableTowers.find((tower) => tower.id === 'elf_thorn_spire');
    const levelEffects = (thornSpire?.levels ?? []).flatMap(
      (level) => level.stats.onHitEffects ?? [],
    );

    expect(levelEffects.length).toBeGreaterThan(0);
    for (const effect of [...(thornSpire?.onHitEffects ?? []), ...levelEffects]) {
      expect(effect.damageType).toBe(DamageType.PERCENT);
      // Each tick per stack takes 0.6% to 0.8% of maximum health.
      expect(effect.magnitude).toBeGreaterThanOrEqual(6);
      expect(effect.magnitude).toBeLessThanOrEqual(8);
    }
  });
});

describe('resolveTowerDamageType', () => {
  it('falls back to the archetype for a tower built without content', () => {
    expect(resolveTowerDamageType(createTowerEntity({ type: TowerTypeId.POISON }))).toBe(
      TOWER_ARCHETYPE_DEFINITIONS[TowerTypeId.POISON].damageType,
    );
  });

  it('reads the authored tower a placed tower was built from', () => {
    for (const authored of buildableTowers) {
      const tower = createTowerEntity({ type: authored.towerType, buildableTowerId: authored.id });

      expect(resolveTowerDamageType(tower), authored.id).toBe(
        resolveBuildableTowerDamageType(authored),
      );
    }
  });
});
