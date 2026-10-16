import { UnitSizeClass } from '../../../shared/types/content-ids';
import type { CreepEntity } from './types';

/**
 * Knockback (tower-def-bge.9): a tower hit queues cells for the movement step
 * to walk the creep back along its own route. Several hits before that step
 * keep the strongest push instead of adding up, so a splash that catches a
 * creep twice in one frame pushes it once. Large creeps stand firm.
 *
 * Both helpers write the creep's runtime counter in place, like the other
 * per-creep counters (`shotsAimedAt`): it is read only through the entity.
 */
export function queueCreepKnockback(creep: CreepEntity, cells: number): void {
  if (cells <= 0 || creep.status !== 'alive' || creep.sizeClass === UnitSizeClass.LARGE) {
    return;
  }
  const pending = creep.pendingKnockbackCells ?? 0;
  if (cells > pending) {
    creep.pendingKnockbackCells = cells;
  }
}

/** The queued knockback in cells, cleared; 0 when none is queued. */
export function takePendingKnockbackCells(creep: CreepEntity): number {
  const pending = creep.pendingKnockbackCells ?? 0;
  if (pending > 0) {
    creep.pendingKnockbackCells = 0;
  }
  return pending;
}
