import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { RaceId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { Difficulty } from '../../difficulty/model/types';
import type { DuelMatchState, DuelistState } from '../../duel-match/model/types';
import type { TowerEntity } from '../../tower/model/types';
import { canAffordUpgrade } from '../../tower/model/upgrade';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { buildableTowers } from '../../tower/model/config/buildableTowers';
import type {
  DecisionContext,
  LeakHistoryEntry,
  MazeCoverageMetrics,
  ThreatAssessment,
} from './types';

type OpponentSnapshotInput = {
  matchState: DuelMatchState;
  difficulty: Difficulty;
  leakHistory: readonly LeakHistoryEntry[];
};

function computeMazeCoverage(duelist: DuelistState): MazeCoverageMetrics {
  const grid = duelist.battlefield.grid;
  const totalWalkableCells = grid.cells.filter((cell) => cell.isWalkable).length;
  const occupiedCells = grid.cells.filter((cell) => cell.isOccupied).length;
  const towerCount = duelist.battlefield.towers.length;

  return { totalWalkableCells, occupiedCells, towerCount };
}

function computeThreat(duelist: DuelistState): ThreatAssessment {
  const incomingCreepCount = duelist.battlefield.creeps.filter(
    (creep) => creep.lifeState === 'alive',
  ).length;

  const estimatedLeakCount = Math.max(0, Math.floor(incomingCreepCount * 0.2));

  let threatLevel: ThreatAssessment['threatLevel'] = 'low';
  if (incomingCreepCount >= 10) {
    threatLevel = 'high';
  } else if (incomingCreepCount >= 5) {
    threatLevel = 'medium';
  }

  return { incomingCreepCount, estimatedLeakCount, threatLevel };
}

function computeAffordableTowers(gold: number, raceId: RaceId): TowerTypeId[] {
  const registry = getRaceRegistry(raceId);
  const affordable: TowerTypeId[] = [];

  for (const buildableId of registry.buildableTowerIds) {
    const config = buildableTowers.find((t) => t.id === buildableId);
    if (config && gold >= config.costGold) {
      if (!affordable.includes(config.towerType)) {
        affordable.push(config.towerType);
      }
    }
  }

  return affordable;
}

function computeUpgradeableTowers(towers: readonly TowerEntity[], gold: number): string[] {
  const upgradeable: string[] = [];

  for (const tower of towers) {
    const check = canAffordUpgrade(tower.type, tower.level, gold);
    if (check.allowed) {
      upgradeable.push(tower.id);
    }
  }

  return upgradeable;
}

function computeAvailableBuildPositions(
  duelist: DuelistState,
  raceId: RaceId,
): GridPosition[] {
  const grid = duelist.battlefield.grid;
  const registry = getRaceRegistry(raceId);
  const hasBuildableTowers = registry.buildableTowerIds.length > 0;

  if (!hasBuildableTowers) {
    return [];
  }

  const positions: GridPosition[] = [];

  for (const cell of grid.cells) {
    if (cell.isWalkable && !cell.isOccupied && cell.role === 'empty') {
      positions.push({ x: cell.x, y: cell.y });
    }
  }

  return positions;
}

export function buildDecisionContext(input: OpponentSnapshotInput): DecisionContext {
  const { matchState, difficulty, leakHistory } = input;
  const opponent = matchState.opponent;

  return {
    gold: opponent.gold,
    income: opponent.income,
    hp: opponent.hp,
    raceId: opponent.raceId,
    difficulty,
    round: matchState.round,
    phase: matchState.phase,
    mazeCoverage: computeMazeCoverage(opponent),
    threat: computeThreat(opponent),
    leakHistory,
    affordableTowers: computeAffordableTowers(opponent.gold, opponent.raceId),
    upgradeableTowerIds: computeUpgradeableTowers(
      opponent.battlefield.towers,
      opponent.gold,
    ),
    availableBuildPositions: computeAvailableBuildPositions(opponent, opponent.raceId),
  };
}
