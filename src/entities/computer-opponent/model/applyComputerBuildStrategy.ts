import { addTower } from '../../duel-match/model/battlefieldOps';
import type { BattlefieldState } from '../../duel-match/model/battlefield';
import type { DuelMatchState } from '../../duel-match/model/types';
import type { TowerEntity } from '../../tower/model/types';
import {
  canAffordUpgrade,
  getTowerStatsForTowerLevel,
  getUpgradeCost,
} from '../../tower/model/upgrade';
import { getTowerCostForType } from './buildSpendBudget';
import { createComputerTowerEntity } from './computerTowerEntity';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { canPlaceFootprint } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
import { planBuildDecision } from './planBuildDecision';
import type { MazePlan } from './maze-planning';
import type { DecisionContext, DecisionOutput } from './types';

export type ApplyComputerBuildStrategyInput = {
  state: DuelMatchState;
  context: DecisionContext;
  debugRecorder?: ComputerDecisionDebugRecorder;
  /** Maze plan kept from the previous build phase; omitted or null makes a fresh one. */
  mazePlan?: MazePlan | null;
};

export type ApplyComputerBuildStrategyResult = {
  state: DuelMatchState;
  decision: DecisionOutput;
  /** Maze plan to hand back on the next build phase. */
  mazePlan: MazePlan | null;
  builtCount: number;
  upgradedCount: number;
  spentGold: number;
};

function createComputerTower(
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
  raceId: DecisionContext['raceId'],
): TowerEntity {
  return createComputerTowerEntity(
    `computer:tower:${position.x}:${position.y}`,
    towerType,
    position,
    cost,
    raceId,
  );
}

function recalculateBattlefieldPath(battlefield: BattlefieldState): BattlefieldState {
  const pathResult = findPathBfs(battlefield.grid);
  if (!pathResult.found || pathResult.path.length === 0) {
    return battlefield;
  }

  return {
    ...battlefield,
    path: pathResult.path,
  };
}

function upgradeTower(tower: TowerEntity): TowerEntity | null {
  const nextLevel = tower.level + 1;
  const nextStats = getTowerStatsForTowerLevel(tower, nextLevel);
  if (!nextStats) {
    return null;
  }

  return {
    ...tower,
    level: nextLevel,
    combatStats: { ...nextStats },
  };
}

export function applyComputerBuildStrategy(
  input: ApplyComputerBuildStrategyInput,
): ApplyComputerBuildStrategyResult {
  const opponent = input.state.opponent;
  const decision = planBuildDecision({
    context: input.context,
    grid: opponent.battlefield.grid,
    existingTowers: opponent.battlefield.towers,
    path: opponent.battlefield.path,
    debugRecorder: input.debugRecorder,
    mazePlan: input.mazePlan,
  });
  let battlefield = opponent.battlefield;
  let gold = opponent.gold;
  let builtCount = 0;
  let upgradedCount = 0;
  let spentGold = 0;

  for (const action of decision.actions) {
    if (action.kind === 'build') {
      const cost = getTowerCostForType(action.towerType, opponent.raceId);
      if (cost === null || cost > gold) {
        continue;
      }

      // The plan was scored against a simulated grid; re-check the real one so
      // a block never overlaps another tower or seals the route.
      if (!canPlaceFootprint(battlefield.grid, action.position, TOWER_FOOTPRINT)) {
        continue;
      }

      const tower = createComputerTower(action.towerType, action.position, cost, opponent.raceId);
      battlefield = addTower(battlefield, tower);
      battlefield = recalculateBattlefieldPath(battlefield);
      gold -= cost;
      spentGold += cost;
      builtCount += 1;
      continue;
    }

    if (action.kind === 'upgrade') {
      const targetTower = battlefield.towers.find((tower) => tower.id === action.towerId);
      if (!targetTower) {
        continue;
      }

      const upgradeCost = getUpgradeCost(targetTower.type, targetTower.level);
      if (
        upgradeCost === null ||
        !canAffordUpgrade(targetTower.type, targetTower.level, gold).allowed
      ) {
        continue;
      }

      const upgradedTower = upgradeTower(targetTower);
      if (!upgradedTower) {
        continue;
      }

      battlefield = {
        ...battlefield,
        towers: battlefield.towers.map((tower) =>
          tower.id === upgradedTower.id ? upgradedTower : tower,
        ),
      };
      gold -= upgradeCost;
      spentGold += upgradeCost;
      upgradedCount += 1;
    }
  }

  return {
    state: {
      ...input.state,
      opponent: {
        ...opponent,
        gold,
        battlefield,
      },
    },
    decision,
    builtCount,
    upgradedCount,
    spentGold,
    mazePlan: decision.mazePlan,
  };
}
