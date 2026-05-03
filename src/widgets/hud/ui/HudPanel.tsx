import { memo, useState } from 'react';
import './HudPanel.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { mapHudSnapshotToViewModel } from '../model/mapHudSnapshotToViewModel';

function formatCountdown(secondsLeft: number): string {
  const safeSeconds = Math.max(0, secondsLeft);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function HudPanelComponent() {
  const [isExpanded, setIsExpanded] = useState(false);
  const snapshot = useGameHudSnapshot();
  const viewModel = mapHudSnapshotToViewModel(snapshot);

  return (
    <section className="hud-panel" aria-label="Game HUD">
      <div className="hud-stats">
        <p className="hud-stat">
          <span className="hud-label">Gold</span>
          <span className="hud-value">{snapshot.gold}</span>
        </p>
        <p className="hud-stat">
          <span className="hud-label">Lives</span>
          <span className="hud-value">{snapshot.lives}</span>
        </p>
        {isExpanded && (
          <>
            <p className="hud-stat">
              <span className="hud-label">Wave</span>
              <span className="hud-value">{snapshot.waveNumber}</span>
            </p>
            <p className="hud-stat">
              <span className="hud-label">Phase</span>
              <span className="hud-value">{viewModel.phaseLabel}</span>
            </p>
          </>
        )}
      </div>

      {isExpanded && (
        <>
          <div className="hud-actions">
            <button
              type="button"
              className={`hud-button${viewModel.isArcherSelected ? ' hud-button-selected' : ''}`}
              aria-label="Select Archer tower"
              onClick={() => sendGameCommand('select-tower', { towerType: 'archer' })}
            >
              Archer
            </button>
            <button
              type="button"
              className={`hud-button${!viewModel.isArcherSelected ? ' hud-button-selected' : ''}`}
              aria-label="Clear tower selection"
              onClick={() => sendGameCommand('select-tower', { towerType: null })}
            >
              None
            </button>
          </div>

          <p className="hud-selection" aria-live="polite">
            <span className="hud-selection-label">Selected Tower:</span>
            <span className="hud-selection-value">{viewModel.selectedTowerLabel}</span>
          </p>

          <p className="hud-mode" aria-live="polite">
            <span className="hud-mode-label">Mode:</span>
            <span className="hud-mode-value">{viewModel.modeLabel}</span>
          </p>
        </>
      )}

      <div className="hud-actions">
        {isExpanded && (
          <>
            <button
              type="button"
              className="hud-button"
              aria-label="Build tower (coming soon)"
              disabled
            >
              Build (stub)
            </button>
            <button
              type="button"
              className="hud-button"
              aria-label="Sell tower (coming soon)"
              disabled
            >
              Sell (stub)
            </button>
          </>
        )}
        <button
          type="button"
          className="hud-button hud-button-primary"
          aria-label="Start wave"
          disabled={viewModel.isStartWaveDisabled}
          onClick={() => sendGameCommand('start-wave', undefined)}
        >
          Start Wave
        </button>
      </div>
      {snapshot.autoStartSecondsLeft !== null && (
        <p className="hud-auto-start" aria-live="polite">
          Auto start in {formatCountdown(snapshot.autoStartSecondsLeft)}
        </p>
      )}

      <button
        type="button"
        className={`hud-hook${isExpanded ? ' hud-hook-expanded' : ''}`}
        aria-label={isExpanded ? 'Collapse HUD details' : 'Expand HUD details'}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <span className="hud-hook-icon" aria-hidden>
          ˅
        </span>
      </button>
    </section>
  );
}

export const HudPanel = memo(HudPanelComponent);

