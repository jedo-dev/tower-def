import { describe, expect, it } from 'vitest';
import { planBuildDecision } from './planBuildDecision';
import { scoreTowerPlacement } from './scoreTowerPlacement';
import type { DecisionContext } from './types';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { calculateWaveStartPath } from '../../wave/model/calculateWavePath';
import { DEFAULT_ENTRANCE, DEFAULT_EXIT } from '../../duel-match/model/state';
import { Difficulty } from '../../difficulty/model/types';
import { getRaceRegistry } from '../../race-registry';
import { getTowerArchetype, TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from '../../tower';
import { buildableTowers } from '../../tower/model/config/buildableTowers';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  RaceId,
  TowerAttackKind,
  TowerTypeId,
} from '../../../shared/types/content-ids';

const WAVE_COUNT = 10;
const BUILD_POSITIONS: GridPosition[] = [
  { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
  { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 },
];

function isControlArchetype(towerType: TowerTypeId): boolean {
  return getTowerArchetype(towerType).onHitEffects.length > 0;
}

function isSupportArchetype(towerType: TowerTypeId): boolean {
  return getTowerArchetype(towerType).attackKind === TowerAttackKind.AURA;
}

function createTower(id: string, towerType: TowerTypeId, position: GridPosition): TowerEntity {
  return {
    id,
    position,
    cost: 50,
    type: towerType,
    level: 1,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] },
  };
}

function affordableTowersFor(raceId: RaceId, gold: number): TowerTypeId[] {
  const registry = getRaceRegistry(raceId);
  const affordable: TowerTypeId[] = [];

  for (const towerId of registry.buildableTowerIds) {
    const tower = buildableTowers.find((candidate) => candidate.id === towerId);
    if (tower && gold >= tower.costGold && !affordable.includes(tower.towerType)) {
      affordable.push(tower.towerType);
    }
  }

  return affordable;
}

function createContext(
  raceId: RaceId,
  round: number,
  towers: readonly TowerEntity[],
  occupiedPositions: readonly GridPosition[],
  difficulty: Difficulty,
): DecisionContext {
  const gold = 400;

  return {
    gold,
    income: 60,
    hp: 100,
    raceId,
    difficulty,
    round,
    phase: 'build',
    mazeCoverage: { totalWalkableCells: 120, occupiedCells: towers.length, towerCount: towers.length },
    threat: { incomingCreepCount: 4, estimatedLeakCount: 0, threatLevel: 'medium' },
    leakHistory: [],
    affordableTowers: affordableTowersFor(raceId, gold),
    upgradeableTowerIds: [],
    availableBuildPositions: BUILD_POSITIONS.filter(
      (position) => !occupiedPositions.some(
        (taken) => taken.x === position.x && taken.y === position.y,
      ),
    ),
    intent: undefined,
  };
}

function simulateBuildRun(raceId: RaceId, difficulty: Difficulty): TowerEntity[] {
  const grid: GridModel = createGridModel({ entrance: DEFAULT_ENTRANCE, exit: DEFAULT_EXIT });
  const path = calculateWaveStartPath(grid);
  const towers: TowerEntity[] = [];
  const occupied: GridPosition[] = [];

  for (let round = 1; round <= WAVE_COUNT; round += 1) {
    const context = createContext(raceId, round, towers, occupied, difficulty);
    const output = planBuildDecision({ context, grid, path, existingTowers: towers });

    for (const action of output.actions) {
      if (action.kind !== 'build') {
        continue;
      }

      towers.push(createTower(`opponent_tower_${towers.length + 1}`, action.towerType, action.position));
      occupied.push(action.position);
    }
  }

  return towers;
}

describe('computer opponent archetype mix', () => {
  it('builds at least one crowd control tower over ten rounds', () => {
    const towers = simulateBuildRun(RaceId.ORC, Difficulty.NORMAL);

    expect(towers.length).toBeGreaterThan(1);
    expect(towers.some((tower) => isControlArchetype(tower.type))).toBe(true);
  });

  it('mixes archetypes instead of stacking one', () => {
    const towers = simulateBuildRun(RaceId.UNDEAD, Difficulty.NORMAL);
    const archetypes = new Set(towers.map((tower) => tower.type));

    expect(archetypes.size).toBeGreaterThan(1);
  });

  it('does not spend the round on support towers', () => {
    for (const race of [RaceId.UNDEAD, RaceId.HUMAN]) {
      const towers = simulateBuildRun(race, Difficulty.NORMAL);
      const supportCount = towers.filter((tower) => isSupportArchetype(tower.type)).length;
      const damageCount = towers.length - supportCount;

      expect(supportCount, race).toBeLessThanOrEqual(Math.floor(damageCount / 3));
    }
  });

  it('stays deterministic for the same inputs', () => {
    const first = simulateBuildRun(RaceId.ELF, Difficulty.NORMAL);
    const second = simulateBuildRun(RaceId.ELF, Difficulty.NORMAL);

    expect(second.map((tower) => `${tower.type}@${tower.position.x},${tower.position.y}`))
      .toEqual(first.map((tower) => `${tower.type}@${tower.position.x},${tower.position.y}`));
  });

  it('keeps difficulty presets distinguishable', () => {
    const easy = simulateBuildRun(RaceId.ORC, Difficulty.EASY);
    const nightmare = simulateBuildRun(RaceId.ORC, Difficulty.NIGHTMARE);

    expect(nightmare.length).toBeGreaterThanOrEqual(easy.length);
  });

  it('never picks a support tower on an empty field', () => {
    const grid = createGridModel({ entrance: DEFAULT_ENTRANCE, exit: DEFAULT_EXIT });
    const path = calculateWaveStartPath(grid);

    const score = scoreTowerPlacement({
      grid,
      position: BUILD_POSITIONS[0],
      towerType: TowerTypeId.SUPPORT,
      existingTowers: [],
      path,
    });

    expect(score.totalScore).toBe(0);
  });
});
