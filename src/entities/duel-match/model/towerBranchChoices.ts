import { chooseBranch, type TowerTalentBranchId } from '../../tower/model/talents';
import type { BuildableTowerId } from '../../tower/model/towerIds';
import type { DuelMatchState, DuelSide } from './types';

/**
 * Records one side's talent pick in the match state. The rules check and the
 * gold charge happen where the side's gold lives (the engine, the simulators);
 * the match state only remembers the pick for the rest of the match.
 */
export function recordTowerBranchChoice(
  state: DuelMatchState,
  side: DuelSide,
  buildableTowerId: BuildableTowerId,
  branchId: TowerTalentBranchId,
): DuelMatchState {
  const duelist = state[side];

  return {
    ...state,
    [side]: {
      ...duelist,
      towerBranchChoices: chooseBranch(duelist.towerBranchChoices, buildableTowerId, branchId),
    },
  };
}
