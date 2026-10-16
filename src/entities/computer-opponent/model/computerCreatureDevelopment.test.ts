import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState } from '../../duel-match/model/state';
import type { DuelMatchState } from '../../duel-match/model/types';
import { applyComputerSendStrategy } from './applyComputerSendStrategy';
import { buildDecisionContext } from './buildDecisionContext';

function stateWithXp(xp: number): DuelMatchState {
  const initial = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);
  return {
    ...initial,
    round: 6,
    opponent: {
      ...initial.opponent,
      gold: 400,
      income: 40,
      creatureXpByTier: { 1: xp, 2: xp, 3: xp, 4: xp, 5: xp, 6: xp },
    },
  };
}

function runSends(state: DuelMatchState, difficulty: Difficulty) {
  return applyComputerSendStrategy({
    state,
    context: buildDecisionContext({ matchState: state, difficulty, leakHistory: [] }),
  });
}

describe('computer creature development (tower-def-716.5)', () => {
  it('easy never spends creature experience', () => {
    const result = runSends(stateWithXp(200), Difficulty.EASY);
    expect(result.decision.developmentActions).toEqual([]);
    expect(result.state.opponent.creatureBranchChoices).toEqual({});
    expect(result.state.opponent.creatureXpByTier[1]).toBe(200);
  });

  it.each([Difficulty.NORMAL, Difficulty.HARD, Difficulty.NIGHTMARE])(
    '%s picks branches and grades through the shared rules before sending',
    (difficulty) => {
      const result = runSends(stateWithXp(200), difficulty);
      const opponent = result.state.opponent;
      expect(result.developedCount).toBe(result.decision.developmentActions.length);
      expect(Object.keys(opponent.creatureBranchChoices).length).toBeGreaterThan(0);
      for (const xp of Object.values(opponent.creatureXpByTier)) {
        expect(xp).toBeGreaterThanOrEqual(0);
      }
      // The sends were queued after the grades: each carries its creature's grade.
      opponent.sendQueue.forEach((unitId, index) => {
        expect(opponent.sendQueueGrades[index]).toBe(opponent.creatureGrades[unitId] ?? 0);
      });
    },
  );

  it('lists the development ahead of the sends in the recorded decision', () => {
    const result = runSends(stateWithXp(30), Difficulty.HARD);
    const first = result.decision.developmentActions[0];
    expect(first?.kind).toBe('choose_creature_branch');
  });

  it('is deterministic', () => {
    const state = stateWithXp(120);
    expect(runSends(state, Difficulty.HARD).state).toEqual(runSends(state, Difficulty.HARD).state);
  });
});
