import {
  DAMAGE_TYPES,
  RACE_IDS,
  RaceId,
  TOWER_ATTACK_KINDS,
  TOWER_TYPE_IDS,
  type DamageType,
  type TowerAttackKind,
  type TowerTargetScope,
  type TowerTypeId,
} from '../../../../shared/types/content-ids';
import {
  CONTENT_LORE_MAX_LENGTH,
  ContentValidationError,
  assertKnownKeys,
  readArray,
  readNumber,
  readOptionalBoundedString,
  readRecord,
  readString,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import { TOWER_SOUND_SLOTS } from '../../../../shared/types/sound-ids';
import { readSoundSlotSet } from '../../../../shared/lib/content/soundSlotValidation';
import { BUILDABLE_TOWER_IDS } from '../towerIds';
import type { BuildableTowerConfig, TowerCombatStats, TowerOnHitEffect } from '../types';
import {
  TOWER_ARCHETYPE_FILE_KEYS,
  TOWER_ARCHETYPE_OPTIONAL_KEYS,
  TOWER_ARCHETYPE_REQUIRED_KEYS,
  TOWER_CONTENT_FILE_KEYS,
  TOWER_CONTENT_OPTIONAL_KEYS,
  TOWER_CONTENT_REQUIRED_KEYS,
  TOWER_STAT_BOUNDS,
} from './towerContent.types';
import { assertTowerSchemaVersion } from './assertTowerSchemaVersion';
import { parseTalentBranches } from './towerTalentContent';
import {
  parseAllowedTargets,
  parseAura,
  parseChain,
  parseLevels,
  parseOnHitEffects,
  parseOptionalDamageType,
  parseOptionalStat,
  type TowerAuraDefinition,
  type TowerChainDefinition,
  type TowerLevelDefinition,
} from './towerContentFields';

export type { TowerTalentBranchDefinition } from './towerTalentContent';
export type {
  TowerAuraDefinition,
  TowerChainDefinition,
  TowerLevelDefinition,
} from './towerContentFields';

export type TowerContentSource = {
  file: string;
  data: unknown;
};

export type TowerArchetypeDefinition = TowerCombatStats & {
  id: TowerTypeId;
  name: string;
  attackKind: TowerAttackKind;
  /** Damage type every tower of the archetype deals unless it overrides it. */
  damageType: DamageType;
  /** Which creeps the archetype shoots: ground, air or both. */
  allowedTargets: TowerTargetScope;
  description: string;
  onHitEffects: TowerOnHitEffect[];
  chain?: TowerChainDefinition;
  aura?: TowerAuraDefinition;
  levels: TowerLevelDefinition[];
};

const TOWER_ENTRY_KEYS: readonly string[] = [
  ...TOWER_CONTENT_REQUIRED_KEYS,
  ...TOWER_CONTENT_OPTIONAL_KEYS,
];

const ARCHETYPE_ENTRY_KEYS: readonly string[] = [
  ...TOWER_ARCHETYPE_REQUIRED_KEYS,
  ...TOWER_ARCHETYPE_OPTIONAL_KEYS,
];

function parseTowerEntry(
  rawEntry: unknown,
  fileLocation: ContentLocation,
  race: RaceId,
): BuildableTowerConfig {
  const entry = readRecord(rawEntry, fileLocation);
  const id = readStringFrom(entry, 'id', fileLocation, BUILDABLE_TOWER_IDS);
  const location: ContentLocation = { file: fileLocation.file, entityId: id };

  assertKnownKeys(entry, TOWER_ENTRY_KEYS, location);

  if (!id.startsWith(`${race.toLowerCase()}_`)) {
    throw new ContentValidationError(location, `id does not belong to race ${race}`);
  }

  const splashRadius = parseOptionalStat(entry, 'splashRadius', location);
  const sounds = readSoundSlotSet(entry, 'sounds', TOWER_SOUND_SLOTS, location);
  const lore = readOptionalBoundedString(entry, 'lore', location, CONTENT_LORE_MAX_LENGTH);
  const damageType = parseOptionalDamageType(entry, location);

  return {
    id,
    name: readString(entry, 'name', location),
    faction: race,
    towerType: readStringFrom(entry, 'archetype', location, TOWER_TYPE_IDS),
    costGold: readNumber(entry, 'costGold', location, TOWER_STAT_BOUNDS.costGold),
    damage: readNumber(entry, 'damage', location, TOWER_STAT_BOUNDS.damage),
    range: readNumber(entry, 'range', location, TOWER_STAT_BOUNDS.range),
    attackCooldownMs: readNumber(
      entry,
      'attackCooldownMs',
      location,
      TOWER_STAT_BOUNDS.attackCooldownMs,
    ),
    ...(splashRadius === undefined ? {} : { splashRadius }),
    ...(entry.levels === undefined ? {} : { levels: parseLevels(entry, location) }),
    onHitEffects: parseOnHitEffects(entry, location),
    ...(sounds === undefined ? {} : { sounds }),
    allowedTargets: parseAllowedTargets(entry, location),
    ...(damageType === undefined ? {} : { damageType }),
    spriteKey: readString(entry, 'spriteKey', location),
    description: readString(entry, 'description', location),
    ...(lore === undefined ? {} : { lore }),
    talentBranches: parseTalentBranches(entry, location, id),
  };
}

/** Validates one authored race file and returns its buildable towers. */
export function parseTowerContentFile(source: TowerContentSource): BuildableTowerConfig[] {
  const location: ContentLocation = { file: source.file };
  const file = readRecord(source.data, location);

  assertKnownKeys(file, TOWER_CONTENT_FILE_KEYS, location);
  assertTowerSchemaVersion(file, 'towers', location);

  const race = readStringFrom(file, 'race', location, RACE_IDS);
  const rawTowers = readArray(file, 'towers', location);

  if (rawTowers.length === 0) {
    throw new ContentValidationError(location, 'file declares no towers');
  }

  return rawTowers.map((rawEntry) => parseTowerEntry(rawEntry, location, race));
}

export function loadTowerContent(sources: readonly TowerContentSource[]): BuildableTowerConfig[] {
  const towers: BuildableTowerConfig[] = [];
  const fileByTowerId = new Map<string, string>();

  for (const source of sources) {
    for (const tower of parseTowerContentFile(source)) {
      const existingFile = fileByTowerId.get(tower.id);

      if (existingFile !== undefined) {
        throw new ContentValidationError(
          { file: source.file, entityId: tower.id },
          `duplicate tower id, already declared in ${existingFile}`,
        );
      }

      fileByTowerId.set(tower.id, source.file);
      towers.push(tower);
    }
  }

  return towers;
}

function parseArchetypeEntry(
  rawEntry: unknown,
  fileLocation: ContentLocation,
): TowerArchetypeDefinition {
  const entry = readRecord(rawEntry, fileLocation);
  const id = readStringFrom(entry, 'id', fileLocation, TOWER_TYPE_IDS);
  const location: ContentLocation = { file: fileLocation.file, entityId: id };

  assertKnownKeys(entry, ARCHETYPE_ENTRY_KEYS, location);

  const splashRadius = parseOptionalStat(entry, 'splashRadius', location);
  const attackKind = readStringFrom(entry, 'attackKind', location, TOWER_ATTACK_KINDS);
  const chain = parseChain(entry, location);
  const aura = parseAura(entry, location);

  if (attackKind === 'chain' && !chain) {
    throw new ContentValidationError(location, 'a chain archetype must declare its "chain" shape');
  }

  if (attackKind === 'aura' && !aura) {
    throw new ContentValidationError(location, 'an aura archetype must declare its "aura" shape');
  }

  return {
    id,
    name: readString(entry, 'name', location),
    attackKind,
    damageType: readStringFrom(entry, 'damageType', location, DAMAGE_TYPES),
    allowedTargets: parseAllowedTargets(entry, location),
    description: readString(entry, 'description', location),
    damage: readNumber(entry, 'damage', location, TOWER_STAT_BOUNDS.damage),
    range: readNumber(entry, 'range', location, TOWER_STAT_BOUNDS.range),
    attackCooldownMs: readNumber(
      entry,
      'attackCooldownMs',
      location,
      TOWER_STAT_BOUNDS.attackCooldownMs,
    ),
    ...(splashRadius === undefined ? {} : { splashRadius }),
    ...(chain === undefined ? {} : { chain }),
    ...(aura === undefined ? {} : { aura }),
    onHitEffects: parseOnHitEffects(entry, location),
    levels: parseLevels(entry, location),
  };
}

/**
 * Base stats a tower places with, per archetype. Every declared archetype must
 * be authored, so a new archetype id cannot ship without numbers behind it.
 */
export function loadTowerArchetypeContent(
  source: TowerContentSource,
): Record<TowerTypeId, TowerArchetypeDefinition> {
  const location: ContentLocation = { file: source.file };
  const file = readRecord(source.data, location);

  assertKnownKeys(file, TOWER_ARCHETYPE_FILE_KEYS, location);
  assertTowerSchemaVersion(file, 'archetypes', location);

  const rawArchetypes = readArray(file, 'archetypes', location);
  const byId = new Map<TowerTypeId, TowerArchetypeDefinition>();

  for (const rawEntry of rawArchetypes) {
    const archetype = parseArchetypeEntry(rawEntry, location);

    if (byId.has(archetype.id)) {
      throw new ContentValidationError(
        { file: source.file, entityId: archetype.id },
        'duplicate archetype id',
      );
    }

    byId.set(archetype.id, archetype);
  }

  const missing = TOWER_TYPE_IDS.filter((archetypeId) => !byId.has(archetypeId));

  if (missing.length > 0) {
    throw new ContentValidationError(
      location,
      `missing archetype stats for: ${missing.join(', ')}`,
    );
  }

  return Object.fromEntries(byId) as Record<TowerTypeId, TowerArchetypeDefinition>;
}
