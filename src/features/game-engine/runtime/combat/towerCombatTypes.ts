import type { CreepEntity } from '../../../../entities/creep';
import type { TowerCombatRuntime, TowerEntity } from '../../../../entities/tower';
import type { EffectId } from '../../../../shared/types/content-ids';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import type { GroundZoneStore } from './towerGroundZones';

/** Splash radius, in fine-grid cells, for a splash tower whose content omits one. */
export const DEFAULT_SPLASH_RADIUS_CELLS = 3;

export type CombatCreep = { entity: CreepEntity };

export type CombatTower = { entity: TowerEntity; runtime: TowerCombatRuntime };

/** The part of a battlefield combat reads and writes. */
export type CombatField<C extends CombatCreep, T extends CombatTower> = {
  creeps: C[];
  towers: T[];
  /** Ground zones left by towers (`abilities.groundZone`); a field without one spawns none. */
  groundZones?: GroundZoneStore;
};

export type DamageNumberSource = 'hit' | 'effect';

/** A pixel position; combat writes into reused instances instead of allocating. */
export type PixelPoint = { x: number; y: number };

/** Writes the pixel centre of a grid position into `out` (no allocation). */
export type CellCenterWriter = (position: GridPosition, out: PixelPoint) => void;

export type TowerCombatHooks<C extends CombatCreep, T extends CombatTower> = {
  /** Pixel centre of a cell, written into `out` so splash and chain stay allocation-free. */
  writeCellCenter: CellCenterWriter;
  /** A creep took a tower hit (single, splash, chain arc, extra target, pierce or volley). */
  onCreepHit: (creep: C) => void;
  /** The primary target of a single or splash shot (or a volley) was struck. */
  onTargetStruck: (tower: T) => void;
  onDamageDealt: (position: GridPosition, damage: number, source: DamageNumberSource) => void;
  /** An effect landed and changed the creep. */
  onEffectApplied: (creep: C, effectId: EffectId) => void;
  /** Effects on the creep advanced (expired, ticked or wore off). */
  onEffectsTicked: (creep: C) => void;
  /**
   * Called once per kill, from a hit or from damage over time. `killer` is the
   * tower whose hit landed the kill; absent for damage-over-time kills.
   */
  onCreepKilled: (creep: C, killer?: T) => void;
  /** The tower attacked; its cooldown is already consumed. */
  onTowerFired: (tower: T, target: C, isSplashTower: boolean) => void;
  /**
   * A lethal hit or tick was spent on the creep's `secondLife`: it stood up
   * again and no kill was scored. `onCreepKilled` fires only on the final
   * death, so kill rewards (bounty, talent XP) count each creature once.
   */
  onCreepRevived?: (creep: C) => void;
  /** The creep dodged a single-target shot (`dodgeEveryNthShot`): no damage, no effects. */
  onShotDodged?: (tower: T, target: C) => void;
};
