import { memo, type CSSProperties } from 'react';
import styles from './MatchStatusBar.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useBattlefieldView } from '../../../shared/lib/game-bridge/useBattlefieldView';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import {
  mapBattlefieldViewToggleToViewModel,
  mapHudPressureToViewModel,
  type HudPressureLevel,
} from '../model/mapHudSnapshotToViewModel';
import { mapMatchStatusBar } from '../model/mapMatchStatusBar';
import { RACE_DISPLAY_NAMES } from '../../../shared/ui/faction-emblem';
import { getDifficultyConfig } from '../../../entities/difficulty';

export type MatchStatusBarProps = {
  setup: GameSetupConfig | null;
};

export const MATCH_STATUS_LABEL = 'Match status';

const PRESSURE_LEVEL_CLASS: Record<HudPressureLevel, string> = {
  none: '',
  low: styles.pressureLow,
  medium: styles.pressureMedium,
  high: styles.pressureHigh,
};

function joinClassNames(...classNames: (string | false | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

/** The enemy's lives take the enemy race colour (a theme token per race). */
function enemyColorStyle(setup: GameSetupConfig | null): CSSProperties | undefined {
  if (!setup) {
    return undefined;
  }
  return {
    '--status-enemy-color': `var(--color-faction-${setup.enemyFaction.toLowerCase()})`,
  } as CSSProperties;
}

/** "Undead vs Orc · Normal": who plays whom, for the duel block's tooltip. */
function describeMatchup(setup: GameSetupConfig | null): string | null {
  if (!setup) {
    return null;
  }
  const races = `${RACE_DISPLAY_NAMES[setup.builderFaction]} vs ${RACE_DISPLAY_NAMES[setup.enemyFaction]}`;
  return `${races} · ${getDifficultyConfig(setup.difficulty).name}`;
}

/**
 * One framed row under the event row: gold and income, both sides' lives
 * with the pressure line under them, and the wave action. The build phase
 * offers Start Wave with the auto-start countdown; the wave swaps it for the
 * battlefield view toggle. Re-renders per HUD snapshot event, never per frame.
 */
function MatchStatusBarComponent({ setup }: MatchStatusBarProps) {
  const snapshot = useGameHudSnapshot();
  const activeBattlefieldView = useBattlefieldView();
  const viewModel = mapMatchStatusBar(snapshot);
  const pressure = mapHudPressureToViewModel(snapshot);
  const battlefieldViewToggle = mapBattlefieldViewToggleToViewModel(
    snapshot,
    activeBattlefieldView,
  );
  const { startWave } = viewModel;
  const matchup = describeMatchup(setup);
  const duelTooltip = matchup
    ? `${matchup}
${viewModel.duelTooltip}`
    : viewModel.duelTooltip;

  return (
    <section className={`ui-panel ${styles.bar}`} aria-label={MATCH_STATUS_LABEL}>
      <div className={styles.gold} aria-label={`Gold ${viewModel.gold}, ${viewModel.incomeLabel}`}>
        <span className={`ui-icon-coin ${styles.coin}`} aria-hidden="true" />
        <span className={styles.stack} aria-hidden="true">
          <span className={styles.value}>{viewModel.gold}</span>
          <span className={styles.sub}>{viewModel.incomeLabel}</span>
        </span>
      </div>

      <div className={styles.duel} title={duelTooltip}>
        <div
          className={styles.lives}
          role="group"
          aria-label={viewModel.duelAriaLabel}
          style={enemyColorStyle(setup)}
        >
          <span className={`ui-icon-heart ${styles.heart}`} aria-hidden="true" />
          <span className={styles.value} data-player-lives="">
            {viewModel.lives}
          </span>
          <span className={styles.versus} aria-hidden="true">
            <span className={styles.swords}>⚔</span>vs
          </span>
          <span className={joinClassNames(styles.value, styles.enemyValue)} data-enemy-lives="">
            {viewModel.opponentLives}
          </span>
        </div>
        <div
          className={joinClassNames(styles.pressure, PRESSURE_LEVEL_CLASS[pressure.level])}
          role="status"
          aria-label={pressure.ariaLabel}
          title={pressure.detail}
        >
          {pressure.label}
          <span className={styles.visuallyHidden}>{pressure.detail}</span>
        </div>
      </div>

      {battlefieldViewToggle.isVisible ? (
        <button
          type="button"
          className={joinClassNames(
            styles.action,
            styles.viewToggle,
            battlefieldViewToggle.isOpponentActive && styles.viewToggleActive,
          )}
          aria-label={battlefieldViewToggle.ariaLabel}
          aria-pressed={battlefieldViewToggle.isOpponentActive}
          onClick={() =>
            sendGameCommand('switch-battlefield-view', { view: battlefieldViewToggle.nextView })
          }
        >
          <span className={styles.actionLabel}>{battlefieldViewToggle.label}</span>
          <span className={styles.actionSub}>battlefield</span>
        </button>
      ) : (
        <button
          type="button"
          className={joinClassNames(styles.action, styles.startWave)}
          disabled={startWave.isDisabled}
          onClick={() => sendGameCommand('start-wave', undefined)}
        >
          <span className={styles.actionLabel}>{startWave.label}</span>
          {startWave.countdownLabel !== null && (
            <span className={styles.actionSub}>{startWave.countdownLabel}</span>
          )}
        </button>
      )}
    </section>
  );
}

export const MatchStatusBar = memo(MatchStatusBarComponent);
