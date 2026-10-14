import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../difficulty/model/types';
import { selectNoticedLeaks } from './decisionMistakes';

const HISTORY = [
  { round: 3, leakedCount: 0 },
  { round: 4, leakedCount: 2 },
];

describe('entities/computer-opponent/decisionMistakes', () => {
  it('hides the newest leaks from a late-reacting preset', () => {
    expect(selectNoticedLeaks(HISTORY, Difficulty.EASY)).toEqual([HISTORY[0]]);
    expect(selectNoticedLeaks(HISTORY, Difficulty.NORMAL)).toEqual(HISTORY);
    expect(selectNoticedLeaks([], Difficulty.EASY)).toEqual([]);
  });
});
