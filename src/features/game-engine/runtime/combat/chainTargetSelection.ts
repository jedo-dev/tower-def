import { getCreepFootprintCenter, isCreepHidden } from '../../../../entities/creep';
import { canTowerTargetCreep } from '../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';

/**
 * Reusable working memory for chain target selection, so a chain shot does
 * not allocate. Buffers grow (doubling) only when the field outgrows them and
 * are reused by every later call.
 */
export type ChainTargetScratch = {
  /** Pixel centre of each eligible creep, by index in `field.creeps`. */
  centerX: Float64Array;
  centerY: Float64Array;
  /** 1 while the creep at that index may still be picked by an arc. */
  isCandidate: Uint8Array;
  /** Picked creeps, nearest-first per bounce; only the first `count` slots are valid. */
  targets: (CombatCreep | undefined)[];
};

const INITIAL_SCRATCH_CAPACITY = 64;

export function createChainTargetScratch(
  capacity: number = INITIAL_SCRATCH_CAPACITY,
): ChainTargetScratch {
  return {
    centerX: new Float64Array(capacity),
    centerY: new Float64Array(capacity),
    isCandidate: new Uint8Array(capacity),
    targets: [],
  };
}

const sharedChainTargetScratch = createChainTargetScratch();

/** The module-wide scratch the chain shot uses; exposed so tests can check reuse. */
export function getSharedChainTargetScratch(): ChainTargetScratch {
  return sharedChainTargetScratch;
}

function ensureCapacity(scratch: ChainTargetScratch, creepCount: number): void {
  if (scratch.isCandidate.length >= creepCount) {
    return;
  }
  let capacity = Math.max(scratch.isCandidate.length, 1);
  while (capacity < creepCount) {
    capacity *= 2;
  }
  scratch.centerX = new Float64Array(capacity);
  scratch.centerY = new Float64Array(capacity);
  scratch.isCandidate = new Uint8Array(capacity);
}

/** Drops every candidate carrying `id`, as the old visited-id set did. */
function excludeCandidatesWithId<C extends CombatCreep>(
  creeps: readonly C[],
  isCandidate: Uint8Array,
  id: string,
): void {
  for (let index = 0; index < creeps.length; index += 1) {
    if (isCandidate[index] === 1 && creeps[index].entity.id === id) {
      isCandidate[index] = 0;
    }
  }
}

/**
 * Marks the creeps an arc may jump to (alive, not hidden, in the tower's
 * target scope, not the primary target) and caches their pixel centres, which
 * stay fixed for the whole selection.
 */
function collectCandidates<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  tower: T,
  fromId: string,
  scratch: ChainTargetScratch,
): void {
  const { creeps } = field;
  for (let index = 0; index < creeps.length; index += 1) {
    const creep = creeps[index].entity;
    const isCandidate =
      creep.status === 'alive' &&
      creep.id !== fromId &&
      !isCreepHidden(creep) &&
      canTowerTargetCreep(tower.entity, creep);
    scratch.isCandidate[index] = isCandidate ? 1 : 0;
    if (isCandidate) {
      const center = hooks.toCellCenter(getCreepFootprintCenter(creep));
      scratch.centerX[index] = center.x;
      scratch.centerY[index] = center.y;
    }
  }
}

/**
 * Picks the creeps an arc jumps to, among those the tower may hit, and writes
 * them to `scratch.targets[0..count)`; returns `count`. Each bounce takes the
 * nearest candidate to the previous one within range, ties broken by id
 * (`localeCompare`), so a given battlefield state always produces the same
 * chain. Selection finishes before any arc strikes, so kills during the
 * strikes cannot change it.
 */
export function selectChainTargets<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  tower: T,
  from: C,
  bounces: number,
  bounceRangeCells: number,
  scratch: ChainTargetScratch = sharedChainTargetScratch,
): number {
  if (bounces <= 0) {
    return 0;
  }

  const { creeps } = field;
  ensureCapacity(scratch, creeps.length);
  collectCandidates(field, hooks, tower, from.entity.id, scratch);

  const { centerX, centerY, isCandidate, targets } = scratch;
  const rangePx = bounceRangeCells * GRID_DIMENSIONS.cellSize;
  const fromCenter = hooks.toCellCenter(getCreepFootprintCenter(from.entity));
  let currentX = fromCenter.x;
  let currentY = fromCenter.y;
  let count = 0;

  for (let bounce = 0; bounce < bounces; bounce += 1) {
    let bestIndex = -1;
    let bestDistance = 0;
    let bestId = '';

    for (let index = 0; index < creeps.length; index += 1) {
      if (isCandidate[index] === 0) {
        continue;
      }
      const distance = Math.hypot(centerX[index] - currentX, centerY[index] - currentY);
      if (!(distance <= rangePx)) {
        continue;
      }
      const id = creeps[index].entity.id;
      if (
        bestIndex < 0 ||
        distance < bestDistance ||
        (distance === bestDistance && id.localeCompare(bestId) < 0)
      ) {
        bestIndex = index;
        bestDistance = distance;
        bestId = id;
      }
    }

    if (bestIndex < 0) {
      break;
    }

    excludeCandidatesWithId(creeps, isCandidate, bestId);
    if (count < targets.length) {
      targets[count] = creeps[bestIndex];
    } else {
      targets.push(creeps[bestIndex]);
    }
    count += 1;
    currentX = centerX[bestIndex];
    currentY = centerY[bestIndex];
  }

  return count;
}
