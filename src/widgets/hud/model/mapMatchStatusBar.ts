import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

/** The crimson Start Wave button of the status bar: two lines, countdown in the second. */
export type MatchStartWaveViewModel = {
  label: string;
  /** "auto in 0:28" while the auto start counts down; null without a countdown. */
  countdownLabel: string | null;
  isDisabled: boolean;
};

export type MatchStatusBarViewModel = {
  gold: number;
  /** "+50/wave" under the gold. */
  incomeLabel: string;
  lives: number;
  opponentLives: number;
  /** One sentence for the lives-vs-lives block: both sides' lives, income and gold. */
  duelAriaLabel: string;
  /** Hover hint with the enemy's economy, which the bar has no room to print. */
  duelTooltip: string;
  startWave: MatchStartWaveViewModel;
};

/** "0:28": minutes without padding, seconds with. */
export function formatAutoStartCountdown(secondsLeft: number): string {
  const safeSeconds = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function mapMatchStartWave(snapshot: GameHudSnapshot): MatchStartWaveViewModel {
  return {
    label: `Start wave ${snapshot.waveNumber}`,
    countdownLabel:
      snapshot.autoStartSecondsLeft === null
        ? null
        : `auto in ${formatAutoStartCountdown(snapshot.autoStartSecondsLeft)}`,
    isDisabled: snapshot.phase === 'wave' || !snapshot.canStartWave,
  };
}

export function mapMatchStatusBar(snapshot: GameHudSnapshot): MatchStatusBarViewModel {
  return {
    gold: snapshot.gold,
    incomeLabel: `+${snapshot.income}/wave`,
    lives: snapshot.lives,
    opponentLives: snapshot.opponentLives,
    duelAriaLabel:
      `Your lives ${snapshot.lives}, enemy lives ${snapshot.opponentLives}. ` +
      `Your income ${snapshot.income}, enemy income ${snapshot.opponentIncome}`,
    duelTooltip:
      `Enemy: ${snapshot.opponentLives} lives, ${snapshot.opponentGold} gold, ` +
      `+${snapshot.opponentIncome}/wave`,
    startWave: mapMatchStartWave(snapshot),
  };
}
