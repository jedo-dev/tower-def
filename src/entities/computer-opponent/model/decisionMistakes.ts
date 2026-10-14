import { Difficulty } from '../../difficulty/model/types';

/**
 * Deliberate mistakes of the weaker presets. Every difficulty plays by the
 * same rules and economy; these only make some decisions worse, so a lower
 * difficulty loses by deciding badly, never by having less.
 */
export type DecisionMistakes = {
  /**
   * Build phases a leak goes unnoticed before the opponent switches to
   * defending: the newest this many leak-history entries are ignored.
   */
  leakReactionDelayRounds: number;
};

export const DECISION_MISTAKES_BY_DIFFICULTY: Readonly<
  Record<Difficulty, Readonly<DecisionMistakes>>
> = {
  [Difficulty.EASY]: { leakReactionDelayRounds: 1 },
  [Difficulty.NORMAL]: { leakReactionDelayRounds: 0 },
  [Difficulty.HARD]: { leakReactionDelayRounds: 0 },
  [Difficulty.NIGHTMARE]: { leakReactionDelayRounds: 0 },
};

/** Leak history as the opponent has noticed it so far, oldest first. */
export function selectNoticedLeaks<T>(leakHistory: readonly T[], difficulty: Difficulty): T[] {
  const { leakReactionDelayRounds } = DECISION_MISTAKES_BY_DIFFICULTY[difficulty];
  return leakHistory.slice(0, Math.max(0, leakHistory.length - leakReactionDelayRounds));
}
