import {
  EFFECT_IDS,
  RACE_IDS,
  RaceId,
  TOWER_ATTACK_KINDS,
  TOWER_TYPE_IDS,
  type EffectId,
  type TowerAttackKind,
} from '../../../../shared/types/content-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  assertSchemaVersion,
  readArray,
  readNumber,
  readRecord,
  readString,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import type { TowerTypeId } from '../../../../shared/types/content-ids';
import { BUILDABLE_TOWER_IDS } from '../towerIds';
import type {
  BuildableTowerConfig,
  TowerCombatStats,
  TowerOnHitEffect,
} from '../types';
import {
  TOWER_ARCHETYPE_FILE_KEYS,
  TOWER_ARCHETYPE_OPTIONAL_KEYS,
  TOWER_ARCHETYPE_REQUIRED_KEYS,
  TOWER_CONTENT_FILE_KEYS,
  TOWER_CONTENT_OPTIONAL_KEYS,
  TOWER_CONTENT_REQUIRED_KEYS,
  TOWER_CHAIN_BOUNDS,
  TOWER_CHAIN_KEYS,
  TOWER_CONTENT_SCHEMA_VERSION,
  TOWER_ON_HIT_EFFECT_KEYS,
  TOWER_STAT_BOUNDS,
} from './towerContent.types';

export type TowerContentSource = {
  file: string;
  data: unknown;
};

export type TowerChainDefinition = {
  bounces: number;
  bounceRangeCells: number;
  damageFalloff: number;
};

export type TowerArchetypeDefinition = TowerCombatStats & {
  id: TowerTypeId;
  name: string;
  attackKind: TowerAttackKind;
  description: string;
  onHitEffects: TowerOnHitEffect[];
  chain?: TowerChainDefinition;
};

const TOWER_ENTRY_KEYS: readonly string[] = [
  ...TOWER_CONTENT_REQUIRED_KEYS,
  ...TOWER_CONTENT_OPTIONAL_KEYS,
];

const ARCHETYPE_ENTRY_KEYS: readonly string[] = [
  ...TOWER_ARCHETYPE_REQUIRED_KEYS,
  ...TOWER_ARCHETYPE_OPTIONAL_KEYS,
];

function parseOnHitEffects(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerOnHitEffect[] {
  if (entry.onHitEffects === undefined) {
    return [];
  }

  const rawEffects = readArray(entry, 'onHitEffects', location);

  return rawEffects.map((rawEffect) => {
    const effect = readRecord(rawEffect, location);
    assertKnownKeys(effect, TOWER_ON_HIT_EFFECT_KEYS, location);

    const effectId: EffectId = readStringFrom(effect, 'effectId', location, EFFECT_IDS);

    return {
      effectId,
      magnitude: effect.magnitude === undefined ? undefined : readNumber(effect, 'magnitude', location),
      durationMs: effect.durationMs === undefined ? undefined : readNumber(effect, 'durationMs', location),
      maxStacks: effect.maxStacks === undefined ? undefined : readNumber(effect, 'maxStacks', location),
    };
  });
}

function parseOptionalStat(
  entry: Record<string, unknown>,
  key: 'splashRadius',
  location: ContentLocation,
): number | undefined {
  if (entry[key] === undefined) {
    return undefined;
  }

  return readNumber(entry, key, location, TOWER_STAT_BOUNDS[key]);
}

function parseChain(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerChainDefinition | undefined {
  if (entry.chain === undefined) {
    return undefined;
  }

  const chain = readRecord(entry.chain, location);
  assertKnownKeys(chain, TOWER_CHAIN_KEYS, location);

  return {
    bounces: readNumber(chain, 'bounces', location, TOWER_CHAIN_BOUNDS.bounces),
    bounceRangeCells: readNumber(
      chain,
      'bounceRangeCells',
      location,
      TOWER_CHAIN_BOUNDS.bounceRangeCells,
    ),
    damageFalloff: readNumber(chain, 'damageFalloff', location, TOWER_CHAIN_BOUNDS.damageFalloff),
  };
}

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
    onHitEffects: parseOnHitEffects(entry, location),
    spriteKey: readString(entry, 'spriteKey', location),
    description: readString(entry, 'description', location),
  };
}

/** Validates one authored race file and returns its buildable towers. */
export function parseTowerContentFile(source: TowerContentSource): BuildableTowerConfig[] {
  const location: ContentLocation = { file: source.file };
  const file = readRecord(source.data, location);

  assertKnownKeys(file, TOWER_CONTENT_FILE_KEYS, location);
  assertSchemaVersion(file, TOWER_CONTENT_SCHEMA_VERSION, location);

  const race = readStringFrom(file, 'race', location, RACE_IDS);
  const rawTowers = readArray(file, 'towers', location);

  if (rawTowers.length === 0) {
    throw new ContentValidationError(location, 'file declares no towers');
  }

  return rawTowers.map((rawEntry) => parseTowerEntry(rawEntry, location, race));
}

export function loadTowerContent(
  sources: readonly TowerContentSource[],
): BuildableTowerConfig[] {
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

  if (attackKind === 'chain' && !chain) {
    throw new ContentValidationError(location, 'a chain archetype must declare its "chain" shape');
  }

  return {
    id,
    name: readString(entry, 'name', location),
    attackKind,
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
    onHitEffects: parseOnHitEffects(entry, location),
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
  assertSchemaVersion(file, TOWER_CONTENT_SCHEMA_VERSION, location);

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
    throw new ContentValidationError(location, `missing archetype stats for: ${missing.join(', ')}`);
  }

  return Object.fromEntries(byId) as Record<TowerTypeId, TowerArchetypeDefinition>;
}
