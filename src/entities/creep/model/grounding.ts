import { UnitMoveType } from '../../../shared/types/content-ids';
import type { CreepEntity } from './types';

/**
 * Grounded fliers (tower-def-bge.9): a flier pulled down by a tower hit
 * (`groundsFliersMs`) or by a freeze (chill `groundsFliersMs`) counts as a
 * ground creep for targeting until the timer runs out. It keeps flying its
 * air route; only who may shoot it changes.
 */

type GroundingCreep = Pick<CreepEntity, 'moveType' | 'groundedRemainingMs'>;

/** Whether the creep is a flier currently pulled down to the ground. */
export function isCreepGrounded(creep: GroundingCreep): boolean {
  return (
    creep.moveType === UnitMoveType.AIR &&
    creep.groundedRemainingMs !== undefined &&
    creep.groundedRemainingMs > 0
  );
}

/**
 * Grounds an alive flier for `durationMs`, keeping a longer timer already
 * running; ground creeps are untouched. Writes the entity in place, like the
 * other per-creep runtime counters.
 */
export function groundCreep(creep: CreepEntity, durationMs: number): void {
  if (durationMs <= 0 || creep.status !== 'alive' || creep.moveType !== UnitMoveType.AIR) {
    return;
  }
  if (durationMs > (creep.groundedRemainingMs ?? 0)) {
    creep.groundedRemainingMs = durationMs;
  }
}

/** Counts a running grounding down by `deltaMs`, in place. */
export function tickCreepGrounding(creep: CreepEntity, deltaMs: number): void {
  const remainingMs = creep.groundedRemainingMs;
  if (remainingMs === undefined || remainingMs <= 0 || deltaMs <= 0) {
    return;
  }
  creep.groundedRemainingMs = Math.max(0, remainingMs - deltaMs);
}
