import { Difficulty } from '../../../difficulty/model/types';

/**
 * Roll fed to the baseline wave generator when estimating the next wave, so
 * the estimate is the typical wave, the same every time it is asked for.
 */
export const BASELINE_ESTIMATE_RANDOM_ROLL = 0.5;

/**
 * Share of its income the other duelist is assumed to put into sends while
 * its queue is still empty. Once it has queued creeps, the queue is the truth.
 */
export const ENEMY_SEND_INCOME_SHARE = 0.5;

/**
 * Route samples a freshly built wall tower is assumed to reach before the
 * opponent has any tower to measure: a straight lane through a range-6 tower.
 */
export const DEFAULT_NEW_TOWER_COVERED_SAMPLES = 12;

/**
 * Surplus defence turns into extra send share: at twice the comfortable
 * margin the send share grows by this fraction of itself.
 */
export const SURPLUS_SEND_SHARE_BOOST = 0.5;

/** Hard ceiling on the share of a purse that goes to sends in one round. */
export const MAX_SEND_SHARE = 0.9;

/**
 * Down to this share of its lives a threatened side still buys one income
 * creep a round. A share of a small purse never adds up to a creep, and an
 * income that stops growing can never catch up with growing waves.
 */
export const ECONOMY_FLOOR_MIN_LIVES_SHARE = 0.5;

/**
 * How the opponent splits gold between defence and sends, per difficulty.
 * `defenceMargin` is the damage its towers deal to the next wave divided by
 * that wave's armor-adjusted health.
 */
export type ThreatBudgetTuning = {
  /** At or below this margin the opponent is threatened: defence takes all it needs. */
  threatenedMargin: number;
  /** At or above this margin defence is comfortable; also the margin defence tops up to. */
  comfortableMargin: number;
  /** Share of a comfortable purse the build planner still spends on defence. */
  comfortableBuildSpendScale: number;
  /**
   * Share of the comfortable send budget kept for sends even when threatened,
   * at full lives (scaled down as lives run out). Income compounds and is the
   * defence of later waves, so a side with lives to spare keeps investing.
   */
  threatenedSendScale: number;
};

export const THREAT_BUDGET_TUNING_BY_DIFFICULTY: Readonly<
  Record<Difficulty, Readonly<ThreatBudgetTuning>>
> = {
  [Difficulty.EASY]: {
    threatenedMargin: 1.8,
    comfortableMargin: 3.2,
    comfortableBuildSpendScale: 0.8,
    threatenedSendScale: 0.5,
  },
  [Difficulty.NORMAL]: {
    threatenedMargin: 1.6,
    comfortableMargin: 2.8,
    comfortableBuildSpendScale: 0.7,
    threatenedSendScale: 0.6,
  },
  [Difficulty.HARD]: {
    threatenedMargin: 1.5,
    comfortableMargin: 2.5,
    comfortableBuildSpendScale: 0.6,
    threatenedSendScale: 0.7,
  },
  [Difficulty.NIGHTMARE]: {
    threatenedMargin: 1.4,
    comfortableMargin: 2.3,
    comfortableBuildSpendScale: 0.5,
    threatenedSendScale: 0.8,
  },
};
