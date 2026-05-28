import { memo } from 'react';
import './TowerActionPanel.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useSelectedTower } from '../../../shared/lib/game-bridge/useSelectedTower';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import {
  canAffordUpgrade,
  getSellValue,
  getUpgradeCost,
  isMaxLevel,
} from '../../../entities/tower';
import type { HudTowerType } from '../../../shared/lib/game-bridge/types';

const TOWER_DISPLAY_NAMES: Record<HudTowerType, string> = {
  archer: 'Archer Tower',
  splash: 'Plague Tower',
};

function formatTowerType(type: HudTowerType): string {
  return TOWER_DISPLAY_NAMES[type] ?? type;
}

function TowerActionPanelComponent() {
  const selectedTower = useSelectedTower();
  const snapshot = useGameHudSnapshot();

  if (!selectedTower) {
    return null;
  }

  const { id, type, level, cost, combatStats } = selectedTower;
  const upgradeCost = getUpgradeCost(type, level);
  const maxed = isMaxLevel(type, level);
  const upgradeCheck = canAffordUpgrade(type, level, snapshot.gold);
  const sellValue = getSellValue(type, level, cost);

  const canUpgrade = upgradeCheck.allowed;

  function handleUpgrade(): void {
    sendGameCommand('upgrade-tower', { towerId: id });
  }

  function handleSell(): void {
    sendGameCommand('sell-tower', { towerId: id });
  }

  function handleClose(): void {
    sendGameCommand('select-tower', { towerType: null });
  }

  return (
    <section className="tower-action-panel" aria-label="Tower actions">
      <div className="tower-action-header">
        <span className="tower-action-title">{formatTowerType(type)}</span>
        <span className="tower-action-level">Lv {level}</span>
        <button
          type="button"
          className="tower-action-close"
          aria-label="Close tower panel"
          onClick={handleClose}
        >
          X
        </button>
      </div>

      <div className="tower-action-stats">
        <span className="tower-action-stat-label">DMG:</span>
        <span className="tower-action-stat-value">{combatStats.damage}</span>
        <span className="tower-action-stat-label">RNG:</span>
        <span className="tower-action-stat-value">{combatStats.range.toFixed(1)}</span>
        <span className="tower-action-stat-label">SPD:</span>
        <span className="tower-action-stat-value">{combatStats.attackCooldownMs}ms</span>
        {combatStats.splashRadius !== undefined && (
          <>
            <span className="tower-action-stat-label">AOE:</span>
            <span className="tower-action-stat-value">{combatStats.splashRadius.toFixed(1)}</span>
          </>
        )}
      </div>

      <div className="tower-action-buttons">
        {maxed ? (
          <div className="tower-action-max-label">MAX LEVEL</div>
        ) : (
          <button
            type="button"
            className="tower-action-btn tower-action-btn-upgrade"
            disabled={!canUpgrade}
            aria-label={`Upgrade tower to level ${level + 1}`}
            onClick={handleUpgrade}
          >
            <span>Upgrade</span>
            {upgradeCost !== null && (
              <span className="tower-action-btn-cost">${upgradeCost}</span>
            )}
          </button>
        )}

        <button
          type="button"
          className="tower-action-btn tower-action-btn-sell"
          aria-label={`Sell tower for ${sellValue} gold`}
          onClick={handleSell}
        >
          <span>Sell</span>
          <span className="tower-action-btn-cost">${sellValue}</span>
        </button>
      </div>
    </section>
  );
}

export const TowerActionPanel = memo(TowerActionPanelComponent);
