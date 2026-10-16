import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  UnitMoveType,
  UnitSizeClass,
  type CreepTypeId,
  type DamageType,
  type EffectId,
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
  /** Mitigates physical hits; negative values amplify them. */
  physicalArmor: number;
  /** Mitigates magical hits and damage over time; negative values amplify them. */
  magicalArmor: number;
  moveType: UnitMoveType;
  /** Footprint class; decides which wave route the creep walks. */
  sizeClass: UnitSizeClass;
};

/** Used by spawn paths that have no authored creature behind them. */
export const DEFAULT_CREEP_COMBAT_TRAITS: CreepCombatTraits = {
  physicalArmor: 0,
  magicalArmor: 0,
  moveType: UnitMoveType.GROUND,
  sizeClass: UnitSizeClass.MEDIUM,
};

/** One timed effect currently running on a creep. */
export type ActiveEffect = {
  id: EffectId;
  /** Magnitude of a single stack, taken from the tower that applied it. */
  magnitude: number;
  remainingMs: number;
  stacks: number;
  /** Cap for this instance; an upgraded tower can raise it above the default. */
  maxStacks: number;
  /** Time until the next damage tick; unused by effects that do not tick. */
  nextTickInMs: number;
  /**
   * Damage over time only: the type its ticks deal, set by the tower that
   * applied it. Absent means `DAMAGE_OVER_TIME_DAMAGE_TYPE`.
   */
  damageType?: DamageType;
};

/** The duel side that bought and sent a creep; baseline wave creeps have none. */
export type CreepSenderSide = 'player' | 'opponent';

export type CreepEntity = CreepCombatTraits & {
  id: CreepId;
  type: CreepType;
  hp: number;
  /**
   * Health the creep spawned with; percent damage takes its share of this.
   * Every spawn path sets it; a creep built without one (tests, legacy
   * fixtures) is treated as spawned at its current health.
   */
  maxHp?: number;
  lifeState: CreepLifeState;
  speed: number;
  status: CreepStatus;
  position: GridPosition;
  pathIndex: number;
  /**
   * Octile cells left to the exit along the creep's own route, kept current by
   * the movement runtime. Tower priority compares this rather than `pathIndex`,
   * which means different things on routes of different lengths. Absent until
   * the creep is placed on a route; treated as "not started".
   */
  remainingRouteDistance?: number;
  /** Absent means no effects; the effect helpers create the list on demand. */
  activeEffects?: ActiveEffect[];
  /** Set only on creeps a duel side sent; absent on baseline wave creeps. */
  sender?: CreepSenderSide;
};
