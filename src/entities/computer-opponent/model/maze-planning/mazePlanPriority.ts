import type { GridPoint } from '../../../../shared/types/grid';

/** How much the maze plan wants a block at an anchor, for placement scoring. */
export type MazePlanPriority = {
  /** 1 for the next planned block, falling towards 0 down the plan; 0 off-plan. */
  priorityOf(anchor: GridPoint): number;
};

export const EMPTY_MAZE_PLAN_PRIORITY: MazePlanPriority = { priorityOf: () => 0 };

/** Priority by position in `unbuilt` (plan order), the first one highest. */
export function createMazePlanPriority(unbuilt: readonly GridPoint[]): MazePlanPriority {
  if (unbuilt.length === 0) {
    return EMPTY_MAZE_PLAN_PRIORITY;
  }

  const rankByKey = new Map<string, number>();
  unbuilt.forEach((anchor, index) => {
    const key = `${anchor.x}:${anchor.y}`;
    if (!rankByKey.has(key)) {
      rankByKey.set(key, index);
    }
  });

  return {
    priorityOf(anchor: GridPoint): number {
      const rank = rankByKey.get(`${anchor.x}:${anchor.y}`);
      return rank === undefined ? 0 : (unbuilt.length - rank) / unbuilt.length;
    },
  };
}
