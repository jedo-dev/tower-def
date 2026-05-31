import { addTower } from '../../duel-match/model/battlefieldOps';
import type { BattlefieldState } from '../../duel-match/model/battlefield';
import type { DuelMatchState } from '../../duel-match/model/types';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { buildableTowers } from '../../tower/model/config/buildableTowers';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { canAffordUpgrade, getTowerStatsForLevel, getUpgradeCost } from '../../tower/model/upgrade';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { validateTowerPlacementPath } from '../../../shared/lib/pathfinding/validateTowerPlacementPath';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
import { planBuildDecision } from './planBuildDecision';
import type { DecisionContext, DecisionOutput } from './types';

export type ApplyComputerBuildStrategyInput = {
  state: DuelMatchState;
  context: DecisionContext;
  debugRecorder?: ComputerDecisionDebugRecorder;
};

export type ApplyComputerBuildStrategyResult = {
  state: DuelMatchState;
  decision: DecisionOutput;
  builtCount: number;
  upgradedCount: number;
  spentGold: number;
};

function getTowerCostForRace(towerType: TowerTypeId, raceId: DecisionContext['raceId']): number | null {
  const registry = getRaceRegistry(raceId);
  for (const buildableTowerId of registry.buildableTowerIds) {
    const config = buildableTowers.find((tower) => tower.id === buildableTowerId);
    if (config?.towerType === towerType) {
      return config.costGold;
    }
  }
  return null;
}

function createComputerTower(
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
): TowerEntity {
  return {
    id: `computer:tower:${position.x}:${position.y}`,
    position: { x: position.x, y: position.y },
    cost,
    type: towerType,
    level: TOWER_BASE_LEVEL,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] },
  };
}

function applyBuildToBattlefield(
  battlefield: BattlefieldState,
  tower: TowerEntity,
): BattlefieldState {
  const withTower = addTower(battlefield, tower);
  return {
    ...withTower,
    grid: {
      ...withTower.grid,
      cells: withTower.grid.cells.map((cell) =>
        cell.x === tower.position.x && cell.y === tower.position.y
          ? { ...cell, isOccupied: true, isWalkable: false }
          : cell,
      ),
    },
  };
}

function upgradeTower(tower: TowerEntity): TowerEntity | null {
  const nextLevel = tower.level + 1;
  const nextStats = getTowerStatsForLevel(tower.type, nextLevel);
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
  });
  let battlefield = opponent.battlefield;
  let gold = opponent.gold;
  let builtCount = 0;
  let upgradedCount = 0;
  let spentGold = 0;

  for (const action of decision.actions) {
    if (action.kind === 'build') {
      const cost = getTowerCostForRace(action.towerType, opponent.raceId);
      if (cost === null || cost > gold) {
        continue;
      }

      if (!validateTowerPlacementPath(battlefield.grid, action.position)) {
        continue;
      }

      const tower = createComputerTower(action.towerType, action.position, cost);
      battlefield = applyBuildToBattlefield(battlefield, tower);
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
      if (upgradeCost === null || !canAffordUpgrade(targetTower.type, targetTower.level, gold).allowed) {
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
  };
}
