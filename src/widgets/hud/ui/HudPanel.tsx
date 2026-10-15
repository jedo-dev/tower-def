import { RaceId } from '../../../shared/types/content-ids';
import type { FactionThemeName } from '../../../shared/constants/theme';
import { mapRaceRosterToBuildOptions } from '../model/mapRaceRosterToBuildOptions';
import { memo, useState } from 'react';
import styles from './HudPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useBattlefieldView } from '../../../shared/lib/game-bridge/useBattlefieldView';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import {
  mapBattlefieldViewToggleToViewModel,
  mapHudSnapshotToViewModel,
} from '../model/mapHudSnapshotToViewModel';
import type { HudPressureLevel } from '../model/mapHudSnapshotToViewModel';
import type { HudFactionType } from '../../../shared/lib/game-bridge/types';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { PlaceholderIcon } from '../../../shared/ui/placeholder-icon';
import { FantasyButton } from '../../../shared/ui/fantasy-button';

export type HudPanelProps = {
  setup: GameSetupConfig | null;
};

export const BUILD_PHASE_ONLY_HINT = 'Build phase only';

function formatCountdown(secondsLeft: number): string {
  const safeSeconds = Math.max(0, secondsLeft);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function mapFactionToDisplayName(faction: HudFactionType): string {
  switch (faction) {
    case 'undead':
      return 'Undead';
    case 'orc':
      return 'Orc';
    case 'human':
      return 'Human';
    case 'elf':
      return 'Elf';
  }
}

const PRESSURE_LEVEL_CLASS: Record<HudPressureLevel, string> = {
  none: '',
  low: styles.pressureLow,
  medium: styles.pressureMedium,
  high: styles.pressureHigh,
};

function joinClassNames(...classNames: (string | false)[]): string {
  return classNames.filter(Boolean).join(' ');
}

function HudPanelComponent({ setup }: HudPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const snapshot = useGameHudSnapshot();
  const activeBattlefieldView = useBattlefieldView();
  const viewModel = mapHudSnapshotToViewModel(snapshot);
  const battlefieldViewToggle = mapBattlefieldViewToggleToViewModel(
    snapshot,
    activeBattlefieldView,
  );
  // Recomputed per HUD snapshot event, not per frame: the bar only changes when
  // gold, race or selection changes.
  const builderFactionTheme = (
    setup?.builderFaction ?? RaceId.UNDEAD
  ).toLowerCase() as FactionThemeName;
  const buildOptions = mapRaceRosterToBuildOptions({
    raceId: setup?.builderFaction ?? RaceId.UNDEAD,
    gold: snapshot.gold,
    selectedTowerType: snapshot.selectedTowerType,
  });
  // Towers go down in the build phase only; the buttons say so during a wave
  // instead of letting a tap end in a silent error sound.
  const isBuildLocked = viewModel.isBuildLocked;

  return (
    <section className={`ui-panel ${styles.panel}`} aria-label="Game HUD">
      <button
        type="button"
        className={styles.toggle}
        aria-label={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={joinClassNames(styles.toggleIcon, isExpanded && styles.toggleIconUp)} />
      </button>

      <div className={styles.topRow}>
        <div className={styles.resource}>
          <span className={`ui-icon-coin ${styles.resourceIcon}`} aria-hidden="true" />
          <span className={styles.resourceValue}>{snapshot.gold}</span>
        </div>

        <div className={styles.center}>
          {battlefieldViewToggle.isVisible ? (
            <button
              type="button"
              className={joinClassNames(
                styles.battlefieldViewBtn,
                battlefieldViewToggle.isOpponentActive && styles.battlefieldViewBtnActive,
              )}
              aria-label={battlefieldViewToggle.ariaLabel}
              aria-pressed={battlefieldViewToggle.isOpponentActive}
              onClick={() =>
                sendGameCommand('switch-battlefield-view', { view: battlefieldViewToggle.nextView })
              }
            >
              {battlefieldViewToggle.label}
            </button>
          ) : snapshot.autoStartSecondsLeft !== null ? (
            <div className={styles.timerActions}>
              <span className={styles.timer}>
                Auto: {formatCountdown(snapshot.autoStartSecondsLeft)}
              </span>
              <FantasyButton
                tone="ember"
                className={`fantasy-button--compact ${styles.forceStartBtn}`}
                disabled={viewModel.isStartWaveDisabled}
                onClick={() => sendGameCommand('start-wave', undefined)}
              >
                Start Wave
              </FantasyButton>
            </div>
          ) : (
            <FantasyButton
              tone="ember"
              className={`fantasy-button--compact ${styles.startBtn}`}
              disabled={viewModel.isStartWaveDisabled}
              onClick={() => sendGameCommand('start-wave', undefined)}
            >
              Start Wave
            </FantasyButton>
          )}
        </div>

        <div className={joinClassNames(styles.resource, styles.resourceRight)}>
          <span className={`ui-icon-heart ${styles.resourceIcon}`} aria-hidden="true" />
          <span className={styles.resourceValue}>{snapshot.lives}</span>
        </div>
      </div>

      <div
        className={joinClassNames(styles.pressure, PRESSURE_LEVEL_CLASS[viewModel.pressure.level])}
        role="status"
        aria-label={viewModel.pressure.ariaLabel}
      >
        <span className={styles.pressureLabel}>{viewModel.pressure.label}</span>
        <span className={styles.pressureDetail}>{viewModel.pressure.detail}</span>
      </div>

      <div className={styles.duelRow} role="status" aria-label={viewModel.duel.ariaLabel}>
        <span className={styles.duelSide}>{viewModel.duel.playerLine}</span>
        <span className={joinClassNames(styles.duelSide, styles.duelSideEnemy)}>
          {viewModel.duel.opponentLine}
        </span>
      </div>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={`ui-heading ${styles.buildHeading}`}>Build</div>
          {isBuildLocked && (
            <div className={styles.buildPhaseHint} role="note">
              {BUILD_PHASE_ONLY_HINT}
            </div>
          )}
          <div className={styles.towerButtons} role="group" aria-label="Buildable towers">
            {buildOptions.map((option) => (
              <button
                key={option.towerId}
                type="button"
                className={joinClassNames(
                  'ui-slot',
                  styles.towerBtn,
                  option.isSelected && 'ui-slot--selected',
                  option.isSelected && styles.towerBtnSelected,
                  isBuildLocked && styles.towerBtnLocked,
                )}
                disabled={!option.isAffordable && !option.isSelected}
                aria-disabled={isBuildLocked || undefined}
                aria-label={option.ariaLabel}
                title={isBuildLocked ? BUILD_PHASE_ONLY_HINT : undefined}
                onClick={() => {
                  if (isBuildLocked) return;
                  sendGameCommand('select-tower', {
                    towerType: option.isSelected ? null : option.towerType,
                  });
                }}
              >
                <span className={styles.towerBtnPortrait}>
                  <PlaceholderIcon label={option.name} faction={builderFactionTheme} />
                </span>
                <span className={styles.towerBtnBody}>
                  <span className={styles.towerBtnName}>{option.name}</span>
                  <span className={styles.towerBtnMeta} title={option.effectHint}>
                    <span className="ui-icon-coin" aria-hidden="true" />
                    {option.costGold}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Race:</span>
            <span className={styles.infoValue}>{snapshot.builderFactionName}</span>
            <span className={styles.infoLabel}>Enemy:</span>
            <span className={styles.infoValue}>
              {mapFactionToDisplayName(snapshot.selectedFaction)}
            </span>
            {setup?.difficulty && (
              <>
                <span className={styles.infoLabel}>Diff:</span>
                <span className={joinClassNames(styles.infoValue, styles.infoValueDiff)}>
                  {setup.difficulty}
                </span>
              </>
            )}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Wave:</span>
            <span className={styles.infoValue}>{snapshot.waveNumber}</span>
            <span className={styles.infoLabel}>Phase:</span>
            <span className={styles.infoValue}>{viewModel.phaseLabel}</span>
          </div>

          <div className={joinClassNames(styles.infoRow, styles.infoRowEnemy)}>
            <span className={styles.infoLabel}>Enemy gold:</span>
            <span className={styles.infoValue}>{snapshot.opponentGold}</span>
            <span className={styles.infoLabel}>Enemy income:</span>
            <span className={styles.infoValue}>{snapshot.opponentIncome}</span>
            <span className={styles.infoLabel}>Enemy HP:</span>
            <span className={styles.infoValue}>{snapshot.opponentLives}</span>
            <span className={styles.infoLabel}>Enemy sends:</span>
            <span className={styles.infoValue}>{snapshot.opponentSendQueue.length}</span>
          </div>

          {snapshot.matchOutcome.status !== 'active' && (
            <div className={styles.infoRow} role="status">
              <span className={styles.infoLabel}>Match:</span>
              <span className={styles.infoValue}>{snapshot.matchOutcome.status}</span>
            </div>
          )}

          <div className={styles.selectedInfo}>
            <span className={styles.selectedLabel}>Selected:</span>
            <span className={styles.selectedValue}>{viewModel.selectedTowerLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}

export const HudPanel = memo(HudPanelComponent);
