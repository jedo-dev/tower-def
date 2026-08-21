import towerArchetypeContent from '../../../content/towers/archetypes.json';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { EffectId, RaceId } from '../../../shared/types/content-ids';
import { TOWER_TYPE_IDS, TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerAttackKind } from '../../../shared/types/content-ids';
import {
  loadTowerArchetypeContent,
  type TowerArchetypeDefinition,
} from './content/loadTowerContent';
import type { BuildableTowerId } from './towerIds';

export type { TowerLevelStats, TowerUpgradeLevel, TowerTypeUpgradeConfig } from '../../../shared/constants/tower';
export { TOWER_UPGRADE_CONFIG, TowerUpgradeBalance } from '../../../shared/constants/tower';

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
  spriteKey: string;
  description: string;
};

export type TowerCombatStats = {
  range: number;
  damage: number;
  attackCooldownMs: number;
  splashRadius?: number;
  /** Effects the tower puts on whatever it hits at its current level. */
  onHitEffects?: TowerOnHitEffect[];
};

/**
 * Base stats a tower is placed with, per archetype. Authored in
 * `src/content/towers/archetypes.json` and validated at module init.
 */
export const TOWER_ARCHETYPE_DEFINITIONS = loadTowerArchetypeContent({
  file: 'content/towers/archetypes.json',
  data: towerArchetypeContent,
});

export const TOWER_COMBAT_STATS_BY_TYPE: Record<TowerTypeId, TowerCombatStats> = Object.fromEntries(
  TOWER_TYPE_IDS.map((archetypeId) => {
    const archetype = TOWER_ARCHETYPE_DEFINITIONS[archetypeId];
    return [
      archetypeId,
      {
        range: archetype.range,
        damage: archetype.damage,
        attackCooldownMs: archetype.attackCooldownMs,
        ...(archetype.splashRadius === undefined ? {} : { splashRadius: archetype.splashRadius }),
        ...(archetype.onHitEffects.length === 0 ? {} : { onHitEffects: archetype.onHitEffects }),
      },
    ];
  }),
) as Record<TowerTypeId, TowerCombatStats>;

export function getTowerArchetype(towerType: TowerTypeId): TowerArchetypeDefinition {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType];
}

export function getTowerAttackKind(towerType: TowerTypeId): TowerAttackKind {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType].attackKind;
}

export function getTowerOnHitEffects(towerType: TowerTypeId): readonly TowerOnHitEffect[] {
  return TOWER_ARCHETYPE_DEFINITIONS[towerType].onHitEffects;
}

export const TOWER_BASE_LEVEL = 1;

export type TowerEntity = {
  id: TowerId;
  position: GridPosition;
  cost: number;
  type: TowerType;
  level: number;
  /** Stats the tower actually fights with, support auras included. */
  combatStats: TowerCombatStats;
  /** Stats of its own level, before any aura; set when auras are recalculated. */
  baseCombatStats?: TowerCombatStats;
  auraBonus?: { attackSpeedBonus: number; rangeBonus: number };
};
