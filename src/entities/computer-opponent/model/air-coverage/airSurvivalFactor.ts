import { UnitMoveType } from '../../../../shared/types/content-ids';
import type { DefenderLaneProfile, LaneDefence } from './laneDefence';

/**
 * How closely a sender reads the defender's air coverage: `ignore` values
 * fliers as any creep, `coarse` sorts the field into weak, usual or strong
 * anti-air, `full` follows the air-to-ground load ratio continuously.
 */
export const AirCoverageReading = {
  IGNORE: 'ignore',
  COARSE: 'coarse',
  FULL: 'full',
} as const;

export type AirCoverageReading = (typeof AirCoverageReading)[keyof typeof AirCoverageReading];

export const AIR_SURVIVAL_TUNING = {
  /**
   * How hard the factor follows the load ratio (1: survival in proportion).
   * 0.5 and 0.75 were measured too (tower-def-4qe): elf against undead stayed
   * at 65-80% for elf, as the elf Chimera gains first and the undead
   * Gargoyle (1.3 times short of the Crypt Fiend per gold) only past 1.3.
   */
  exponent: 1,
  /** Bounds of the full reading, either way. */
  maxFactor: 2.5,
  /** The coarse reading's step: weak anti-air at this load ratio, strong at its inverse. */
  coarseStepRatio: 2,
  coarseFactor: 1.5,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** How loaded a lane is: the hit points it must stop, one more send included, per point of damage it deals. */
function laneLoad(lane: LaneDefence, marginalSendHealth: number): number {
  return (lane.incomingHealth + marginalSendHealth) / lane.waveDamage;
}

/**
 * Expected survival of a flier relative to a walker against the defender's
 * field: how loaded its air line is (hit points coming over damage its
 * anti-air deals) against how loaded its maze is. Above 1 the air line is
 * the weaker lane and fliers are worth more per gold, below 1 the defender
 * covers the air better than the ground and walkers are preferred. 1 when the
 * reading is ignored or the field does no ground damage yet (nothing to tell).
 */
export function computeAirSurvivalFactor(
  lanes: DefenderLaneProfile | undefined,
  reading: AirCoverageReading,
): number {
  if (!lanes || reading === AirCoverageReading.IGNORE) {
    return 1;
  }
  const ground = lanes[UnitMoveType.GROUND];
  const air = lanes[UnitMoveType.AIR];
  if (ground.waveDamage <= 0) {
    return 1;
  }
  const tuning = AIR_SURVIVAL_TUNING;
  // An unguarded air line is as weak as the bound allows.
  const relative =
    air.waveDamage > 0
      ? laneLoad(air, lanes.marginalSendHealth) / laneLoad(ground, lanes.marginalSendHealth)
      : Number.POSITIVE_INFINITY;

  if (reading === AirCoverageReading.COARSE) {
    if (relative >= tuning.coarseStepRatio) {
      return tuning.coarseFactor;
    }
    return relative <= 1 / tuning.coarseStepRatio ? 1 / tuning.coarseFactor : 1;
  }
  return clamp(relative ** tuning.exponent, 1 / tuning.maxFactor, tuning.maxFactor);
}
