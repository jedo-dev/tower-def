/**
 * Free list of render-state records (projectiles, impact effects, damage
 * numbers). A record leaves its battlefield list when its sprite is destroyed
 * and is handed to the next spawn of the same kind, so steady combat stops
 * allocating records. The list is capped, so a burst cannot pin memory.
 */
export type RenderRecordPool<R> = {
  readonly free: R[];
  readonly capacity: number;
};

export const DEFAULT_RENDER_RECORD_POOL_CAPACITY = 256;

export function createRenderRecordPool<R>(
  capacity: number = DEFAULT_RENDER_RECORD_POOL_CAPACITY,
): RenderRecordPool<R> {
  return { free: [], capacity };
}

/** A released record to overwrite, or undefined when the pool is empty. */
export function takePooledRecord<R>(pool: RenderRecordPool<R>): R | undefined {
  return pool.free.pop();
}

/** Hands a record whose sprite is gone back to the pool; dropped once full. */
export function releasePooledRecord<R>(pool: RenderRecordPool<R>, record: R): void {
  if (pool.free.length < pool.capacity) {
    pool.free.push(record);
  }
}
