import { memo, useState } from 'react';
import './HudPanel.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { mapHudSnapshotToViewModel } from '../model/mapHudSnapshotToViewModel';
import type { HudFactionType, HudTowerType } from '../../../shared/lib/game-bridge/types';
import type { GameSetupConfig } from '../../../shared/config/game-setup';

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

const TOWER_BUTTONS: { type: HudTowerType; label: string; color: string }[] = [
  { type: 'archer', label: 'Archer', color: '#5c8cff' },
  { type: 'splash', label: 'Plague', color: '#44aa44' },
];

function HudPanelComponent({ setup }: HudPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const snapshot = useGameHudSnapshot();
  const viewModel = mapHudSnapshotToViewModel(snapshot);

  return (
    <section className={`hud-panel${isExpanded ? ' hud-panel-expanded' : ''}`} aria-label="Game HUD">
      <button
        type="button"
        className="hud-toggle"
        aria-label={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`hud-toggle-icon${isExpanded ? ' hud-toggle-icon-up' : ''}`}>▲</span>
      </button>

      <div className="hud-top-row">
        <div className="hud-resource">
          <span className="hud-resource-icon">💰</span>
          <span className="hud-resource-value">{snapshot.gold}</span>
        </div>
        
        <div className="hud-center">
          {snapshot.autoStartSecondsLeft !== null ? (
            <div className="hud-timer-actions">
              <span className="hud-timer">Auto: {formatCountdown(snapshot.autoStartSecondsLeft)}</span>
              <button
                type="button"
                className="hud-force-start-btn"
                disabled={viewModel.isStartWaveDisabled}
                onClick={() => sendGameCommand('start-wave', undefined)}
              >
                Force Start
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="hud-start-btn"
              disabled={viewModel.isStartWaveDisabled}
              onClick={() => sendGameCommand('start-wave', undefined)}
            >
              Start Wave
            </button>
          )}
        </div>
        
        <div className="hud-resource">
          <span className="hud-resource-icon">❤️</span>
          <span className="hud-resource-value">{snapshot.lives}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="hud-expanded-content">
          <div className="hud-tower-buttons">
            {TOWER_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                type="button"
                className={`hud-tower-btn${snapshot.selectedTowerType === btn.type ? ' hud-tower-btn-selected' : ''}`}
                style={{ '--tower-color': btn.color } as React.CSSProperties}
                onClick={() => sendGameCommand('select-tower', { towerType: snapshot.selectedTowerType === btn.type ? null : btn.type })}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="hud-info-row">
            <span className="hud-info-label">Race:</span>
            <span className="hud-info-value">{snapshot.builderFactionName}</span>
            <span className="hud-info-label">Enemy:</span>
            <span className="hud-info-value">{mapFactionToDisplayName(snapshot.selectedFaction)}</span>
            {setup?.difficulty && (
              <>
                <span className="hud-info-label">Diff:</span>
                <span className="hud-info-value hud-info-value-diff">{setup.difficulty}</span>
              </>
            )}
          </div>

          <div className="hud-info-row">
            <span className="hud-info-label">Wave:</span>
            <span className="hud-info-value">{snapshot.waveNumber}</span>
            <span className="hud-info-label">Phase:</span>
            <span className="hud-info-value">{viewModel.phaseLabel}</span>
          </div>

          <div className="hud-selected-info">
            <span className="hud-selected-label">Selected:</span>
            <span className="hud-selected-value">{viewModel.selectedTowerLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}

export const HudPanel = memo(HudPanelComponent);
