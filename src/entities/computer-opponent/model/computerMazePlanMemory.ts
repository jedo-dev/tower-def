import type { MazePlan } from './maze-planning';

/**
 * Where a running match keeps the computer opponent's maze plan between
 * build phases. Owned by the game runtime next to the opponent's leak
 * history; cleared when a new run starts.
 */
export type ComputerMazePlanMemory = {
  plan: MazePlan | null;
};

export function createComputerMazePlanMemory(): ComputerMazePlanMemory {
  return { plan: null };
}
