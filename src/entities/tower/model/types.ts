import towerArchetypeContent from '../../../content/towers/archetypes.json';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerTypeUpgradeConfig } from './upgradeConfig';
import type {
  ArmorKind,
  DamageScope,
  DamageType,
  EffectId,
  RaceId,
  TowerTargetScope,
} from '../../../shared/types/content-ids';
import { TOWER_TYPE_IDS, TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerAttackKind } from '../../../shared/types/content-ids';
import type { TowerSoundSet } from '../../../shared/types/sound-ids';
import {
  loadTowerArchetypeContent,
  type TowerArchetypeDefinition,
  type TowerAuraDefinition,
  type TowerLevelDefinition,
  type TowerTalentBranchDefinition,
} from './content/loadTowerContent';
import type { BuildableTowerId } from './towerIds';
import type { TowerAbilities } from './abilities';
import type { TowerAuraBonus } from './auras';

export type { TowerLevelStats, TowerUpgradeLevel, TowerTypeUpgradeConfig } from './upgradeConfig';
export { TowerUpgradeBalance } from './upgradeConfig';

export type TowerId = string;

export type TowerType = TowerTypeId;

export const TowerTypeConfig = TowerTypeId;

export type BuildableTowerType = TowerTypeId;

export { BUILDABLE_TOWER_IDS } from './towerIds';
export type { BuildableTowerId } from './towerIds';

/** An effect a tower puts on whatever it hits. */
export type TowerOnHitEffect = {
  effectId: EffectId;
  /** Overrides the balance magnitude for this tower; undefined keeps the default. */
  magnitude?: number;
  durationMs?: number;
  /** Raises the stack cap for this tower; undefined keeps the balance cap. */
  maxStacks?: number;
  /**
   * Damage over time only: the type its ticks deal. Undefined keeps
   * `DAMAGE_OVER_TIME_DAMAGE_TYPE` (magical); `percent` makes each tick
   * `magnitude / 1000` of maximum health per stack.
   */
  damageType?: DamageType;
  /** Armor break only: which armor it lowers; the definition's (`both`) when absent. */
  armorKind?: ArmorKind;
  /** Vulnerability only: which hits it amplifies; `all` when absent. */
  damageKind?: DamageScope;
  /** Chill only: every this-many-th chilling hit on a creep freezes it (a stun). */
  freezeAtStacks?: number;
  /** Chill only: how long a freeze lasts; the stun balance duration when absent. */
  freezeMs?: number;
};

export type BuildableTowerConfig = {
  id: BuildableTowerId;
  name: string;
  faction: RaceId;
  towerType: BuildableTowerType;
  costGold: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  onHitEffects: TowerOnHitEffect[];
  /** Per-tower upgrade curve; falls back to the archetype curve when absent. */
  levels?: TowerLevelDefinition[];
  /** Authored sound overrides; the race and default sound profiles fill the rest. */
  sounds?: TowerSoundSet;
  /** Which creeps the tower shoots: ground, air or both. `both` unless authored. */
  allowedTargets: TowerTargetScope;
  /** Authored override of the archetype damage type; see `resolveTowerDamageType`. */
  damageType?: DamageType;
  spriteKey: string;
  description: string;
  /** Bestiary flavour text, one or two sentences in the race's voice. */
  lore?: string;
  /** The two talent branches that extend the curve past grade 3; see `talents.ts`. */
  talentBranches: readonly TowerTalentBranchDefinition[];
};

export type TowerCombatStats = {
  range: number;
  damage: number;
  attackCooldownMs: number;
  splashRadius?: number;
  /** Effects the tower puts on whatever it hits at its current level. */
  onHitEffects?: TowerOnHitEffect[];
  /** Aura projected at this level; only support archetypes have one. */
  aura?: TowerAuraDefinition;
  /** Optional abilities of this level (crit, extra targets, volley...); see `TowerAbilities`. */
  abilities?: TowerAbilities;
};

/**
 * Base stats a tower is placed with, per archetype. Authored in
 * `src/content/towers/archetypes.json` and validated at module init.
 */
export const TOWER_ARCHETYPE_DEFINITIONS = loadTowerArchetypeContent({
  file: 'content/towers/archetypes.json',
  data: towerArchetypeContent,
});

/** A tower is built at level 1 of its archetype curve. */
export const TOWER_COMBAT_STATS_BY_TYPE: Record<TowerTypeId, TowerCombatStats> = Object.fromEntries(
  TOWER_TYPE_IDS.map((archetypeId) => [
    archetypeId,
    { ...TOWER_ARCHETYPE_DEFINITIONS[archetypeId].levels[0].stats },
  ]),
) as Record<TowerTypeId, TowerCombatStats>;

/** Upgrade curves, resolved from the same content the archetypes come from. */
export const TOWER_UPGRADE_CONFIG: Record<TowerTypeId, TowerTypeUpgradeConfig> = Object.fromEntries(
  TOWER_TYPE_IDS.map((archetypeId) => {
    const levels = TOWER_ARCHETYPE_DEFINITIONS[archetypeId].levels;
    return [archetypeId, { maxLevel: levels.length, levels }];
  }),
) as Record<TowerTypeId, TowerTypeUpgradeConfig>;

export function getTowerArchetype(towerType: TowerTypeId): TowerArchetypeDefinition {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType];
}

export function getTowerAttackKind(towerType: TowerTypeId): TowerAttackKind {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType].attackKind;
}

export function getTowerOnHitEffects(towerType: TowerTypeId): readonly TowerOnHitEffect[] {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType].onHitEffects;
}

/**
 * Which creeps a tower shoots: the authored tower's own scope when it was
 * built from content, the archetype's otherwise (computer towers, tests).
 */
export function resolveTowerTargetScope(
  tower: Pick<TowerEntity, 'type' | 'allowedTargets'>,
): TowerTargetScope {
  return tower.allowedTargets ?? TOWER_ARCHETYPE_DEFINITIONS[tower.type].allowedTargets;
}

export const TOWER_BASE_LEVEL = 1;

export type TowerEntity = {
  id: TowerId;
  position: GridPosition;
  cost: number;
  type: TowerType;
  /** Authored tower it was built from; absent for towers placed before content. */
  buildableTowerId?: BuildableTowerId;
  /** Target scope of the authored tower; absent means the archetype's scope. */
  allowedTargets?: TowerTargetScope;
  level: number;
  /** Stats the tower actually fights with, support auras included. */
  combatStats: TowerCombatStats;
  /** Stats of its own level, before any aura; set when auras are recalculated. */
  baseCombatStats?: TowerCombatStats;
  auraBonus?: TowerAuraBonus;
};
