import { Difficulty } from '../../difficulty/model/types';

/** How the computer opponent spends on sends, per difficulty. */
export type SendTuning = {
  /**
   * Share of the purse sends may take once defence is comfortable (the threat
   * split tops it up when defence has surplus); without a defence assessment,
   * the fixed share of every purse.
   */
  maxSendRatioPerRound: number;
  /**
   * The preset's own cap on creeps per round, so a gold pile does not turn into
   * a single flood. It may be stricter than the shared send limits every side
   * plays by, never looser: those are enforced on top of it.
   */
  maxSendsPerRound: number;
  /** Opening rounds spent entirely on income, before any pressure. */
  economyRounds: number;
  /** Share of the budget that goes to pressure once the opening is over. */
  basePressureWeight: number;
};

export const SEND_TUNING_BY_DIFFICULTY: Readonly<Record<Difficulty, Readonly<SendTuning>>> = {
  [Difficulty.EASY]: {
    maxSendRatioPerRound: 0.2,
    maxSendsPerRound: 3,
    economyRounds: 5,
    basePressureWeight: 0.2,
  },
  [Difficulty.NORMAL]: {
    maxSendRatioPerRound: 0.35,
    maxSendsPerRound: 5,
    economyRounds: 4,
    basePressureWeight: 0.4,
  },
  [Difficulty.HARD]: {
    maxSendRatioPerRound: 0.5,
    maxSendsPerRound: 7,
    economyRounds: 3,
    basePressureWeight: 0.6,
  },
  [Difficulty.NIGHTMARE]: {
    maxSendRatioPerRound: 0.7,
    maxSendsPerRound: 7,
    economyRounds: 4,
    basePressureWeight: 0.5,
  },
};
