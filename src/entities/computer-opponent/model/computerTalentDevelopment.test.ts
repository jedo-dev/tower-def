import { describe, expect, it } from 'vitest';
import { TowerTalentRule } from '../../../shared/constants/towerTalents';
import { calculateWaveRoutes } from '../../../shared/lib/pathfinding/waveRoutes';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { Difficulty } from '../../difficulty/model/types';
import { addTower, createBattlefieldState } from '../../duel-match/model/battlefieldOps';
import { createInitialDuelMatchState } from '../../duel-match/model/state';
import type { DuelMatchState } from '../../duel-match/model/types';
import { getTowerTalentBranches } from '../../tower/model/talents';
import type { TowerEntity } from '../../tower/model/types';
import { getTowerStatsForTowerLevel } from '../../tower/model/upgrade';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';
import { buildDecisionContext } from './buildDecisionContext';
import { createComputerTowerEntity } from './computerTowerEntity';

const SPEAR_ID = 'orc_spear_watchtower';
const ANCHORS: GridPosition[] = [
  { x: 2, y: 5 },
  { x: 6, y: 9 },
  { x: 10, y: 13 },
];

function spear(anchor: GridPosition, level: number): TowerEntity {
  const tower = createComputerTowerEntity(
    `computer:tower:${anchor.x}:${anchor.y}`,
    TowerTypeId.SINGLE,
    anchor,
    50,
    RaceId.ORC,
  );
  const stats = getTowerStatsForTowerLevel(tower, level) ?? tower.combatStats;
  return { ...tower, level, combatStats: { ...stats } };
}

function richOrcState(level: number): DuelMatchState {
  const initial = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);
  const grid = initial.opponent.battlefield.grid;
  let battlefield = createBattlefieldState(grid, calculateWaveRoutes(grid));
  for (const anchor of ANCHORS) {
    battlefield = addTower(battlefield, spear(anchor, level));
  }
  return {
    ...initial,
    round: 8,
    opponent: { ...initial.opponent, gold: 3000, income: 300, battlefield },
  };
}

function develop(state: DuelMatchState, difficulty: Difficulty) {
  const context = buildDecisionContext({ matchState: state, difficulty, leakHistory: [] });
  return applyComputerBuildStrategy({ state, context });
}

describe('entities/computer-opponent talent development', () => {
  it('picks a branch for a grade-3 type and climbs it, through the shared talent rules', () => {
    const result = develop(richOrcState(TowerTalentRule.BRANCH_UNLOCK_GRADE), Difficulty.HARD);
    const choices = result.state.opponent.towerBranchChoices;
    const branchIds = getTowerTalentBranches(SPEAR_ID).map((branch) => branch.id);

    expect(result.chosenBranchCount).toBe(1);
    expect(branchIds).toContain(choices[SPEAR_ID]);
    const developed = result.state.opponent.battlefield.towers.filter((tower) => tower.level > 3);
    expect(developed.length).toBeGreaterThan(0);
    expect(developed.every((tower) => tower.level === 4)).toBe(true);
    const actions = result.decision.actions.map((action) => action.kind);
    expect(actions.indexOf('choose_branch')).toBeLessThan(actions.lastIndexOf('upgrade'));
  });

  it('develops on normal too, with its coarse valuation', () => {
    const result = develop(richOrcState(TowerTalentRule.BRANCH_UNLOCK_GRADE), Difficulty.NORMAL);

    expect(result.state.opponent.towerBranchChoices[SPEAR_ID]).toBeDefined();
  });

  it('never develops on easy', () => {
    const result = develop(richOrcState(TowerTalentRule.BRANCH_UNLOCK_GRADE), Difficulty.EASY);

    expect(result.chosenBranchCount).toBe(0);
    expect(result.state.opponent.towerBranchChoices).toEqual({});
    expect(result.state.opponent.battlefield.towers.every((tower) => tower.level <= 3)).toBe(true);
  });

  it('never buys a branch while the type is below grade 3', () => {
    const result = develop(richOrcState(2), Difficulty.NIGHTMARE);

    expect(result.decision.actions.some((action) => action.kind === 'choose_branch')).toBe(false);
    expect(result.state.opponent.towerBranchChoices).toEqual({});
  });

  it('decides the same way every time', () => {
    const state = richOrcState(TowerTalentRule.BRANCH_UNLOCK_GRADE);

    expect(develop(state, Difficulty.HARD).decision).toEqual(
      develop(state, Difficulty.HARD).decision,
    );
  });
});
