import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../difficulty/model/types';
import { DECISION_MISTAKES_BY_DIFFICULTY, selectNoticedLeaks } from './decisionMistakes';

const HISTORY = [
  { round: 3, leakedCount: 0 },
  { round: 4, leakedCount: 2 },
];

describe('entities/computer-opponent/decisionMistakes', () => {
  it('lets only easy react to leaks late; the stronger presets make no deliberate mistakes', () => {
    expect(DECISION_MISTAKES_BY_DIFFICULTY[Difficulty.EASY].leakReactionDelayRounds).toBe(1);
    for (const difficulty of [Difficulty.NORMAL, Difficulty.HARD, Difficulty.NIGHTMARE]) {
      expect(DECISION_MISTAKES_BY_DIFFICULTY[difficulty].leakReactionDelayRounds).toBe(0);
    }
  });

  it('hides the newest leaks from a late-reacting preset', () => {
    expect(selectNoticedLeaks(HISTORY, Difficulty.EASY)).toEqual([HISTORY[0]]);
    expect(selectNoticedLeaks(HISTORY, Difficulty.NORMAL)).toEqual(HISTORY);
    expect(selectNoticedLeaks([], Difficulty.EASY)).toEqual([]);
  });
});
