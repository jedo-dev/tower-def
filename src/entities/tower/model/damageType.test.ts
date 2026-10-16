import { describe, expect, it } from 'vitest';
import { loadTowerArchetypeContent, parseTowerContentFile } from './content/loadTowerContent';
import { buildableTowers } from './config/buildableTowers';
import { resolveBuildableTowerDamageType, resolveTowerDamageType } from './damageType';
import { TOWER_ARCHETYPE_DEFINITIONS, TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';
import { DamageType, TOWER_TYPE_IDS, TowerTypeId } from '../../../shared/types/content-ids';

const FILE = 'content/towers/undead.json';
const ARCHETYPE_FILE = 'content/towers/archetypes.json';

function createTowerFile(towerOverrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
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
    levels: [{ level: 1, upgradeCostGold: 0, damage: 20, range: 6, attackCooldownMs: 800 }],
    description: 'Single target.',
    ...archetypeOverrides,
  };

  for (const [key, value] of Object.entries(archetype)) {
    if (value === undefined) {
      delete archetype[key];
    }
  }

  return { schemaVersion: 3, archetypes: [archetype] };
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
