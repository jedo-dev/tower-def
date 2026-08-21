import { memo, useState } from 'react';
import styles from './HudPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useBattlefieldView } from '../../../shared/lib/game-bridge/useBattlefieldView';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { mapBattlefieldViewToggleToViewModel, mapHudSnapshotToViewModel } from '../model/mapHudSnapshotToViewModel';
import type { HudPressureLevel } from '../model/mapHudSnapshotToViewModel';
import type { HudFactionType, HudTowerType } from '../../../shared/lib/game-bridge/types';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { PlaceholderIcon } from '../../../shared/ui/placeholder-icon';

export type HudPanelProps = {
  setup: GameSetupConfig | null;
};

function formatCountdown(secondsLeft: number): string {
  const safeSeconds = Math.max(0, secondsLeft);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function mapFactionToDisplayName(faction: HudFactionType): string {
  switch (faction) {
    case 'undead': return 'Undead';
    case 'orc': return 'Orc';
    case 'human': return 'Human';
    case 'elf': return 'Elf';
  }
}

const TOWER_BUTTONS: { type: HudTowerType; label: string }[] = [
  { type: 'archer', label: 'Archer' },
  { type: 'splash', label: 'Plague' },
];

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
  const battlefieldViewToggle = mapBattlefieldViewToggleToViewModel(snapshot, activeBattlefieldView);

  return (
    <section className={styles.panel} aria-label="Game HUD">
      <button
        type="button"
        className={styles.toggle}
        aria-label={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={joinClassNames(styles.toggleIcon, isExpanded && styles.toggleIconUp)}>^</span>
      </button>

      <div className={styles.topRow}>
        <div className={styles.resource}>
          <span className={styles.resourceIcon}>$</span>
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
              onClick={() => sendGameCommand('switch-battlefield-view', { view: battlefieldViewToggle.nextView })}
            >
              {battlefieldViewToggle.label}
            </button>
          ) : snapshot.autoStartSecondsLeft !== null ? (
            <div className={styles.timerActions}>
              <span className={styles.timer}>Auto: {formatCountdown(snapshot.autoStartSecondsLeft)}</span>
              <button
                type="button"
                className={styles.forceStartBtn}
                disabled={viewModel.isStartWaveDisabled}
                onClick={() => sendGameCommand('start-wave', undefined)}
              >
                Force Start
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.startBtn}
              disabled={viewModel.isStartWaveDisabled}
              onClick={() => sendGameCommand('start-wave', undefined)}
            >
              Start Wave
            </button>
          )}
        </div>

        <div className={styles.resource}>
          <span className={styles.resourceIcon}>HP</span>
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
        <span className={joinClassNames(styles.duelSide, styles.duelSideEnemy)}>{viewModel.duel.opponentLine}</span>
      </div>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.towerButtons}>
            {TOWER_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                type="button"
                className={joinClassNames(
                  styles.towerBtn,
                  snapshot.selectedTowerType === btn.type && styles.towerBtnSelected,
                )}
                onClick={() => sendGameCommand('select-tower', { towerType: snapshot.selectedTowerType === btn.type ? null : btn.type })}
              >
                <PlaceholderIcon label={btn.label} faction={snapshot.selectedFaction} />
                {btn.label}
              </button>
            ))}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Race:</span>
            <span className={styles.infoValue}>{snapshot.builderFactionName}</span>
            <span className={styles.infoLabel}>Enemy:</span>
            <span className={styles.infoValue}>{mapFactionToDisplayName(snapshot.selectedFaction)}</span>
            {setup?.difficulty && (
              <>
                <span className={styles.infoLabel}>Diff:</span>
                <span className={joinClassNames(styles.infoValue, styles.infoValueDiff)}>{setup.difficulty}</span>
              </>
            )}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Wave:</span>
            <span className={styles.infoValue}>{snapshot.waveNumber}</span>
            <span className={styles.infoLabel}>Phase:</span>
            <span className={styles.infoValue}>{viewModel.phaseLabel}</span>
          </div>

          <div className={styles.infoRow}>
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
