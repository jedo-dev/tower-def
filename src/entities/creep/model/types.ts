import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  UnitArmorType,
  UnitMoveType,
  type CreepTypeId,
} from '../../../shared/types/content-ids';

export type CreepId = string;

export type CreepType = CreepTypeId;

export type CreepLifeState = 'alive' | 'dead';

export type CreepStatus = CreepLifeState | 'escaped';

/**
 * Creature traits copied onto the creep when it spawns. They live on the
 * entity rather than behind a registry lookup so combat, movement and
 * targeting can read them without touching content in a hot path.
 */
export type CreepCombatTraits = {
  armor: number;
  armorType: UnitArmorType;
  moveType: UnitMoveType;
};

/** Used by spawn paths that have no authored creature behind them. */
export const DEFAULT_CREEP_COMBAT_TRAITS: CreepCombatTraits = {
  armor: 0,
  armorType: UnitArmorType.LIGHT,
  moveType: UnitMoveType.GROUND,
};

export type CreepEntity = CreepCombatTraits & {
  id: CreepId;
  type: CreepType;
  hp: number;
  lifeState: CreepLifeState;
  speed: number;
  status: CreepStatus;
  position: GridPosition;
  pathIndex: number;
};
