/** The slice of a field creep the remaining count reads. */
type FieldCreepStatusView = {
  readonly entity: { readonly status: string };
};

/**
 * Creeps a field still has to resolve this wave: those alive on it plus those
 * not spawned yet. A spawn moves a creep between the two, so only a kill, a
 * leak or a new schedule changes the total.
 */
export function countFieldRemainingCreeps(
  creeps: readonly FieldCreepStatusView[],
  pendingSpawnCount: number,
): number {
  let aliveCount = 0;
  for (const creep of creeps) {
    if (creep.entity.status === 'alive') aliveCount += 1;
  }
  return pendingSpawnCount + aliveCount;
}

export type OpponentFieldCreepsPublisher = {
  /** Publishes `remaining` only when it differs from the last published value. */
  update: (remaining: number) => void;
};

/** One per scene: the first update always publishes so the HUD starts in sync. */
export function createOpponentFieldCreepsPublisher(
  publish: (remaining: number) => void,
): OpponentFieldCreepsPublisher {
  let lastPublished: number | null = null;
  return {
    update: (remaining) => {
      if (remaining === lastPublished) return;
      lastPublished = remaining;
      publish(remaining);
    },
  };
}
