import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { TowerTalentRule } from '../../../shared/constants/towerTalents';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { chooseBranch, type TowerBranchChoices } from '../../tower/model/talents';
import type { TowerEntity } from '../../tower/model/types';
import { createComputerTowerEntity } from './computerTowerEntity';
import type { PlannedBranch, PlannedUpgrade } from './damage-placement';
import type { ComputerAction } from './types';

/** Running state of one build phase while its actions are chosen. */
export type BuildRoundState = {
  actions: ComputerAction[];
  reasoning: string[];
  remainingBudget: number;
  buildCount: number;
  /** Towers on the field plus the ones chosen this round. */
  plannedTowers: TowerEntity[];
  plannedPositions: GridPosition[];
  /** Grid with this round's chosen blocks walled off. */
  grid: GridModel;
  /** Route-search cells expanded so far this decision. */
  expandedNodeCount: number;
  /** This side's talent picks, the ones made this round included. */
  towerBranchChoices: TowerBranchChoices;
  /** Grade-3 towers whose grade 4 a pick made this round opened. */
  unlockedTowerIds: string[];
};

function createPlannedTower(
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
  raceId: RaceId,
): TowerEntity {
  return createComputerTowerEntity(
    `planned:tower:${position.x}:${position.y}`,
    towerType,
    position,
    cost,
    raceId,
  );
}

export function recordBuild(
  round: BuildRoundState,
  raceId: RaceId,
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
  note: string,
): void {
  round.actions.push({ kind: 'build', towerType, position });
  round.plannedPositions.push(position);
  round.plannedTowers.push(createPlannedTower(towerType, position, cost, raceId));
  round.grid = withFootprintOccupancy(round.grid, position, TOWER_FOOTPRINT, true);
  round.remainingBudget -= cost;
  round.buildCount += 1;
  round.reasoning.push(
    `Building ${towerType} at (${position.x},${position.y}) for ${cost} gold, ${note}`,
  );
}

export function recordUpgrade(round: BuildRoundState, upgrade: PlannedUpgrade): void {
  round.actions.push({ kind: 'upgrade', towerId: upgrade.towerId });
  // Later passes this round see the new level: its next upgrade, not this one again.
  round.plannedTowers = round.plannedTowers.map((tower) =>
    tower.id === upgrade.towerId ? { ...tower, level: tower.level + 1 } : tower,
  );
  round.remainingBudget -= upgrade.cost;
  round.reasoning.push(
    `Upgrading tower ${upgrade.towerId} for ${upgrade.cost} gold, +${upgrade.value.toFixed(0)} route damage`,
  );
}

export function recordBranch(round: BuildRoundState, branch: PlannedBranch): void {
  round.actions.push({ kind: 'choose_branch', towerId: branch.towerId, branchId: branch.branchId });
  round.towerBranchChoices = chooseBranch(
    round.towerBranchChoices,
    branch.buildableTowerId,
    branch.branchId,
  );
  for (const tower of round.plannedTowers) {
    if (
      tower.buildableTowerId === branch.buildableTowerId &&
      tower.level === TowerTalentRule.BRANCH_UNLOCK_GRADE
    ) {
      round.unlockedTowerIds.push(tower.id);
    }
  }
  round.remainingBudget -= branch.cost;
  round.reasoning.push(
    `Developing ${branch.buildableTowerId} along ${branch.branchId} for ${branch.cost} gold, +${branch.value.toFixed(0)} route damage over grades 4-7`,
  );
}
