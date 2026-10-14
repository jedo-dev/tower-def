import { describe, expect, it } from 'vitest';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { addTower } from '../../duel-match/model/battlefieldOps';
import { createInitialDuelMatchState } from '../../duel-match/model/state';
import type { DuelMatchState } from '../../duel-match/model/types';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';
import { buildDecisionContext } from './buildDecisionContext';
import { SPEND_BUDGET_BY_DIFFICULTY } from './buildSpendBudget';
import { getMazeBoardKey, type MazePlan } from './maze-planning';
import { computeSurplusGold } from './spendSurplus';
import type { DecisionContext } from './types';

const RACE = RaceId.ORC;
const INCOME = 200;
/** A short wall across the default board's straight route. */
const WALL: readonly GridPosition[] = [
  { x: 8, y: 10 },
  { x: 8, y: 12 },
  { x: 8, y: 14 },
  { x: 8, y: 16 },
  { x: 8, y: 18 },
  { x: 8, y: 20 },
];
/** Pricier than any single option the opponent can buy (tower or upgrade). */
const LARGEST_OPTION_COST = 150;

function createTower(position: GridPosition): TowerEntity {
  return {
    id: `computer:tower:${position.x}:${position.y}`,
    position: { ...position },
    cost: 50,
    type: TowerTypeId.SINGLE,
    level: TOWER_BASE_LEVEL,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE] },
  };
}

function createState(gold: number): DuelMatchState {
  const initial = createInitialDuelMatchState(RaceId.HUMAN, RACE);
  const battlefield = WALL.reduce(
    (current, position) => addTower(current, createTower(position)),
    initial.opponent.battlefield,
  );
  return { ...initial, opponent: { ...initial.opponent, gold, income: INCOME, battlefield } };
}

/** A plan for the board that has nothing left to build: the maze is finished. */
function finishedPlan(state: DuelMatchState): MazePlan {
  return {
    boardKey: getMazeBoardKey(state.opponent.battlefield.grid),
    anchors: [],
    isComplete: true,
  };
}

function playBuildPhase(gold: number, difficulty: Difficulty, plan: MazePlan | null) {
  const state = createState(gold);
  const context = buildDecisionContext({ matchState: state, difficulty, leakHistory: [] });
  const result = applyComputerBuildStrategy({
    state,
    context,
    mazePlan: plan ?? finishedPlan(state),
  });
  return { context, result };
}

function contextWith(gold: number, income: number, difficulty: Difficulty): DecisionContext {
  return buildDecisionContext({
    matchState: {
      ...createState(gold),
      opponent: { ...createState(gold).opponent, income },
    },
    difficulty,
    leakHistory: [],
  });
}

describe('entities/computer-opponent/spendSurplus', () => {
  it('counts the gold above the reserve that the round has not committed', () => {
    const context = contextWith(1000, 400, Difficulty.NORMAL);
    const reserve = 400 * SPEND_BUDGET_BY_DIFFICULTY[Difficulty.NORMAL].surplusReserveIncomeShare;

    expect(computeSurplusGold(context, 300)).toBe(1000 - 300 - reserve);
    expect(computeSurplusGold(context, 1000)).toBe(0);
  });

  it('keeps a bigger reserve on easier difficulties', () => {
    const easy = computeSurplusGold(contextWith(1000, 400, Difficulty.EASY), 0);
    const hard = computeSurplusGold(contextWith(1000, 400, Difficulty.HARD), 0);
    const nightmare = computeSurplusGold(contextWith(1000, 400, Difficulty.NIGHTMARE), 0);

    expect(easy).toBeLessThan(hard);
    expect(hard).toBeLessThan(nightmare);
    expect(nightmare).toBe(1000);
  });

  it.each([Difficulty.NORMAL, Difficulty.HARD])(
    'spends a finished maze down to its reserve on %s',
    (difficulty) => {
      const gold = 900;
      const { context, result } = playBuildPhase(gold, difficulty, null);
      const reserve = INCOME * SPEND_BUDGET_BY_DIFFICULTY[difficulty].surplusReserveIncomeShare;
      const upgrades = result.decision.actions.filter((action) => action.kind === 'upgrade');

      expect(context.gold).toBe(gold);
      expect(result.state.opponent.gold).toBeLessThanOrEqual(reserve + LARGEST_OPTION_COST);
      // Upgrades first: the towers standing are the best value once no wall is left.
      expect(upgrades.length).toBeGreaterThan(0);
      expect(result.upgradedCount).toBe(upgrades.length);
    },
  );

  it('buys new damage towers once the standing ones cannot absorb the surplus', () => {
    const { result } = playBuildPhase(3000, Difficulty.HARD, null);

    expect(result.builtCount).toBeGreaterThan(0);
    expect(result.spentGold).toBeGreaterThan(1000);
  });

  it('leaves an unfinished plan to the threat split', () => {
    // A purse the threat split cannot spend inside its per-round action cap, so
    // the gap does not hinge on whether one more tower happens to fit its ratio.
    const gold = 1200;
    const state = createState(gold);
    const unfinished: MazePlan = { ...finishedPlan(state), isComplete: false };
    const { result } = playBuildPhase(gold, Difficulty.HARD, unfinished);
    const { result: finished } = playBuildPhase(gold, Difficulty.HARD, null);

    expect(result.spentGold).toBeLessThan(finished.spentGold);
  });
});
