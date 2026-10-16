import type { TowerSoundSet } from '../../../../shared/types/sound-ids';

/**
 * Authored tower content contract.
 *
 * Towers are data like creatures are: `src/content/towers/<race>.json` holds
 * the buildable roster of each race, `archetypes.json` holds the base stats an
 * archetype places with. Both are validated on load.
 */

/**
 * Version 3 types every archetype's damage (`damageType`); a race tower may
 * override it. Every distance (range, splash, chain jump, aura radius and range
 * bonus) is measured in cells of the fine 16px grid, as since version 2.
 * Version 1 used the coarse 32px cell and is rejected so a stale file cannot
 * load with halved ranges; version 2 is rejected for its missing damage types.
 */
export const TOWER_CONTENT_SCHEMA_VERSION = 3;

/** The retired untyped-damage format, recognised only to explain the rejection. */
export const TOWER_CONTENT_UNTYPED_DAMAGE_SCHEMA_VERSION = 2;

/** The retired coarse-grid format, recognised only to explain the rejection. */
export const TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION = 1;

export type TowerOnHitEffectEntry = {
  effectId: string;
  magnitude?: number;
  durationMs?: number;
  maxStacks?: number;
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
  /** Optional per-tower upgrade curve; the archetype curve is used without it. */
  levels?: TowerLevelContentEntry[];
  /** Per-tower sound overrides; see "Sound profiles" in docs/08-content-authoring.md. */
  sounds?: TowerSoundSet;
  /** `ground`, `air` or `both`; `both` when absent. Mirrors the archetype today. */
  allowedTargets?: string;
  /** `physical`, `magical` or `percent`; the archetype's type when absent. */
  damageType?: string;
  spriteKey: string;
  description: string;
  /** Bestiary flavour text in the race's voice; at most `CONTENT_LORE_MAX_LENGTH`. */
  lore?: string;
};

export type TowerContentFile = {
  schemaVersion: number;
  race: string;
  towers: TowerContentEntry[];
};

export type TowerChainContentEntry = {
  bounces: number;
  bounceRangeCells: number;
  /** Share of damage lost with each jump, 0.35 meaning each arc is 35% weaker. */
  damageFalloff: number;
};

export type TowerAuraContentEntry = {
  radiusCells: number;
  /** Share of attack speed added to towers in radius, 0.2 meaning 20% faster. */
  attackSpeedBonus: number;
  /** Range added to towers in radius, in cells like `range`. */
  rangeBonus: number;
  /** How two overlapping auras combine. */
  stacking: string;
};

export type TowerLevelContentEntry = {
  level: number;
  upgradeCostGold: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  onHitEffects?: TowerOnHitEffectEntry[];
  aura?: TowerAuraContentEntry;
};

export type TowerArchetypeContentEntry = {
  id: string;
  name: string;
  attackKind: string;
  /** `physical`, `magical` or `percent`; race towers inherit it. */
  damageType: string;
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  onHitEffects?: TowerOnHitEffectEntry[];
  chain?: TowerChainContentEntry;
  aura?: TowerAuraContentEntry;
  /** `ground`, `air` or `both`; `both` when absent. */
  allowedTargets?: string;
  /** Upgrade curve: level 1 is what the tower is built with. */
  levels: TowerLevelContentEntry[];
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
  range: { min: 1, max: 24 },
  attackCooldownMs: { min: 100, max: 10_000 },
  splashRadius: { min: 1, max: 12 },
};

export const TOWER_ON_HIT_EFFECT_KEYS: readonly (keyof TowerOnHitEffectEntry)[] = [
  'effectId',
  'magnitude',
  'durationMs',
  'maxStacks',
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
  'levels',
  'sounds',
  'lore',
  'allowedTargets',
  'damageType',
];

export const TOWER_CONTENT_FILE_KEYS: readonly (keyof TowerContentFile)[] = [
  'schemaVersion',
  'race',
  'towers',
];

export const TOWER_LEVEL_KEYS: readonly (keyof TowerLevelContentEntry)[] = [
  'level',
  'upgradeCostGold',
  'damage',
  'range',
  'attackCooldownMs',
  'splashRadius',
  'onHitEffects',
  'aura',
];

export const TOWER_LEVEL_BOUNDS = {
  upgradeCostGold: { min: 0, max: 1000 },
} as const;

export const TOWER_ARCHETYPE_REQUIRED_KEYS: readonly (keyof TowerArchetypeContentEntry)[] = [
  'id',
  'name',
  'attackKind',
  'damageType',
  'levels',
  'damage',
  'range',
  'attackCooldownMs',
  'description',
];

export const TOWER_ARCHETYPE_OPTIONAL_KEYS: readonly (keyof TowerArchetypeContentEntry)[] = [
  'splashRadius',
  'onHitEffects',
  'chain',
  'aura',
  'allowedTargets',
];

export const TOWER_CHAIN_KEYS: readonly (keyof TowerChainContentEntry)[] = [
  'bounces',
  'bounceRangeCells',
  'damageFalloff',
];

export const TOWER_AURA_KEYS: readonly (keyof TowerAuraContentEntry)[] = [
  'radiusCells',
  'attackSpeedBonus',
  'rangeBonus',
  'stacking',
];

export const TOWER_AURA_BOUNDS = {
  radiusCells: { min: 1, max: 12 },
  attackSpeedBonus: { min: 0, max: 1 },
  rangeBonus: { min: 0, max: 8 },
} as const;

export const TOWER_CHAIN_BOUNDS = {
  bounces: { min: 1, max: 6 },
  bounceRangeCells: { min: 1, max: 12 },
  damageFalloff: { min: 0, max: 0.9 },
} as const;

export const TOWER_ARCHETYPE_FILE_KEYS: readonly (keyof TowerArchetypeContentFile)[] = [
  'schemaVersion',
  'archetypes',
];
