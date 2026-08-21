/**
 * Authored tower content contract.
 *
 * Towers are data like creatures are: `src/content/towers/<race>.json` holds
 * the buildable roster of each race, `archetypes.json` holds the base stats an
 * archetype places with. Both are validated on load.
 */

export const TOWER_CONTENT_SCHEMA_VERSION = 1;

export type TowerOnHitEffectEntry = {
  effectId: string;
  magnitude?: number;
  durationMs?: number;
};

export type TowerContentEntry = {
  id: string;
  name: string;
  archetype: string;
  costGold: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  onHitEffects?: TowerOnHitEffectEntry[];
  spriteKey: string;
  description: string;
};

export type TowerContentFile = {
  schemaVersion: number;
  race: string;
  towers: TowerContentEntry[];
};

export type TowerArchetypeContentEntry = {
  id: string;
  name: string;
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  onHitEffects?: TowerOnHitEffectEntry[];
  description: string;
};

export type TowerArchetypeContentFile = {
  schemaVersion: number;
  archetypes: TowerArchetypeContentEntry[];
};

export type TowerStatKey = 'costGold' | 'damage' | 'range' | 'attackCooldownMs' | 'splashRadius';

export type TowerStatBound = {
  min: number;
  max: number;
};

/** Values outside these bounds are typos, not design decisions. */
export const TOWER_STAT_BOUNDS: Record<TowerStatKey, TowerStatBound> = {
  costGold: { min: 0, max: 1000 },
  damage: { min: 0, max: 500 },
  range: { min: 0.5, max: 12 },
  attackCooldownMs: { min: 100, max: 10_000 },
  splashRadius: { min: 0.5, max: 6 },
};

export const TOWER_ON_HIT_EFFECT_KEYS: readonly (keyof TowerOnHitEffectEntry)[] = [
  'effectId',
  'magnitude',
  'durationMs',
];

export const TOWER_CONTENT_REQUIRED_KEYS: readonly (keyof TowerContentEntry)[] = [
  'id',
  'name',
  'archetype',
  'costGold',
  'damage',
  'range',
  'attackCooldownMs',
  'spriteKey',
  'description',
];

export const TOWER_CONTENT_OPTIONAL_KEYS: readonly (keyof TowerContentEntry)[] = [
  'splashRadius',
  'onHitEffects',
];

export const TOWER_CONTENT_FILE_KEYS: readonly (keyof TowerContentFile)[] = [
  'schemaVersion',
  'race',
  'towers',
];

export const TOWER_ARCHETYPE_REQUIRED_KEYS: readonly (keyof TowerArchetypeContentEntry)[] = [
  'id',
  'name',
  'damage',
  'range',
  'attackCooldownMs',
  'description',
];

export const TOWER_ARCHETYPE_OPTIONAL_KEYS: readonly (keyof TowerArchetypeContentEntry)[] = [
  'splashRadius',
  'onHitEffects',
];

export const TOWER_ARCHETYPE_FILE_KEYS: readonly (keyof TowerArchetypeContentFile)[] = [
  'schemaVersion',
  'archetypes',
];
