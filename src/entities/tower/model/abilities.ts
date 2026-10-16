import { TOWER_ABILITY_BALANCE } from '../../../shared/constants/towerAbilities';
import { UnitMoveType, UnitSizeClass } from '../../../shared/types/content-ids';
import type { GridPoint } from '../../../shared/types/grid';
import type { CreepEntity } from '../../creep';

/**
 * Optional abilities a tower level (1-7) may carry under `abilities`. Every
 * field is optional and absent means "no such ability": a tower without the
 * object fights exactly as before. Field semantics are documented in
 * docs/08-content-authoring.md, "Tower abilities".
 */
export type TowerAbilities = {
  /** Every Nth shot of the tower is a critical hit (a counter, no randomness). */
  critEveryNthShot?: number;
  /** Damage multiplier of a critical shot; required with `critEveryNthShot`. */
  critMultiplier?: number;
  /** A single-target shot also hits this many other valid creeps in range, nearest the tower first. */
  extraTargets?: number;
  /** Share of the shot's damage each extra target takes; 1 when omitted. */
  extraTargetDamageShare?: number;
  /** Share of the shot's damage dealt to every other valid creep on the line to the target. */
  pierceLine?: number;
  /** Damage multiplier against fliers. */
  airDamageMultiplier?: number;
  /** Damage multiplier against ground creeps. */
  groundDamageMultiplier?: number;
  /** Damage multiplier against a creep still at full health. */
  fullHealthBonusMultiplier?: number;
  /** Damage multiplier against large creeps. */
  largeTargetMultiplier?: number;
  /** Creeps closer than this, in cells, are ignored by targeting. */
  minRangeCells?: number;
  /** Every this many ms the tower also hits every valid creep in range once. */
  volleyEveryMs?: number;
  /** Share of the tower's damage a volley deals; 1 when omitted. */
  volleyDamageShare?: number;
  /**
   * A single-target shot also hits every other valid creep in range inside a
   * cone of this many degrees toward the target, at full damage (Wyrm Breath).
   */
  coneDegrees?: number;
};

type TargetedCreep = Pick<CreepEntity, 'moveType' | 'sizeClass' | 'hp' | 'maxHp'>;

/**
 * Product of the abilities that depend on who is hit (air/ground, full
 * health, large). 1 without any; read per hit, allocates nothing.
 */
export function resolveTargetDamageMultiplier(
  abilities: TowerAbilities | undefined,
  creep: TargetedCreep,
): number {
  if (abilities === undefined) {
    return 1;
  }

  let multiplier = 1;
  const flies = creep.moveType === UnitMoveType.AIR;

  if (flies && abilities.airDamageMultiplier !== undefined) {
    multiplier *= abilities.airDamageMultiplier;
  }

  if (!flies && abilities.groundDamageMultiplier !== undefined) {
    multiplier *= abilities.groundDamageMultiplier;
  }

  if (abilities.fullHealthBonusMultiplier !== undefined && creep.hp >= (creep.maxHp ?? creep.hp)) {
    multiplier *= abilities.fullHealthBonusMultiplier;
  }

  if (abilities.largeTargetMultiplier !== undefined && creep.sizeClass === UnitSizeClass.LARGE) {
    multiplier *= abilities.largeTargetMultiplier;
  }

  return multiplier;
}

/** Whether shot number `shotNumber` (counted from 1) of the tower is critical. */
export function isCriticalShot(abilities: TowerAbilities | undefined, shotNumber: number): boolean {
  const every = abilities?.critEveryNthShot;
  return every !== undefined && every > 0 && shotNumber % every === 0;
}

/** Damage multiplier of shot number `shotNumber`: the crit multiplier on a crit, 1 otherwise. */
export function resolveShotDamageMultiplier(
  abilities: TowerAbilities | undefined,
  shotNumber: number,
): number {
  if (!isCriticalShot(abilities, shotNumber)) {
    return 1;
  }
  return abilities?.critMultiplier ?? 1;
}

const DEGREES_PER_HALF_TURN = 180;

/** Cosine of half a cone's opening; compare it with `isInCone` per creep. */
export function getConeHalfAngleCosine(coneDegrees: number): number {
  return Math.cos(((coneDegrees / 2) * Math.PI) / DEGREES_PER_HALF_TURN);
}

/**
 * Whether the point (`offsetX`, `offsetY` from the cone apex) lies inside the
 * cone that opens toward (`axisX`, `axisY`) with the given half-angle cosine.
 * Plain numbers, so a cone shot allocates nothing per creep. The apex itself
 * counts as inside.
 */
export function isInCone(
  axisX: number,
  axisY: number,
  offsetX: number,
  offsetY: number,
  halfAngleCosine: number,
): boolean {
  const axisLength = Math.hypot(axisX, axisY);
  const offsetLength = Math.hypot(offsetX, offsetY);
  if (axisLength === 0 || offsetLength === 0) {
    return true;
  }
  return (axisX * offsetX + axisY * offsetY) / (axisLength * offsetLength) >= halfAngleCosine;
}

/**
 * Whether `point` lies on the piercing line from `from` to `to`: within
 * `pierceLineHalfWidthCells` of the segment (all in cells).
 */
export function isPointOnPierceLine(from: GridPoint, to: GridPoint, point: GridPoint): boolean {
  const segmentX = to.x - from.x;
  const segmentY = to.y - from.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection =
    lengthSquared === 0
      ? 0
      : ((point.x - from.x) * segmentX + (point.y - from.y) * segmentY) / lengthSquared;
  const clamped = Math.min(1, Math.max(0, projection));
  const nearestX = from.x + segmentX * clamped;
  const nearestY = from.y + segmentY * clamped;

  return (
    Math.hypot(point.x - nearestX, point.y - nearestY) <=
    TOWER_ABILITY_BALANCE.pierceLineHalfWidthCells
  );
}
