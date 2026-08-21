import { TowerTypeId } from '../../../shared/types/content-ids';
import { memo } from 'react';
import styles from './TowerActionPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { clearSelectedTower, useSelectedTower } from '../../../shared/lib/game-bridge/useSelectedTower';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import {
  canAffordUpgrade,
  getSellValue,
  getUpgradeCost,
  isMaxLevel,
} from '../../../entities/tower';
import type { HudTowerType } from '../../../shared/lib/game-bridge/types';
import { PlaceholderIcon } from '../../../shared/ui/placeholder-icon';

const TOWER_DISPLAY_NAMES: Record<HudTowerType, string> = {
  [TowerTypeId.SINGLE]: 'Archer Tower',
  [TowerTypeId.SPLASH]: 'Plague Tower',
  [TowerTypeId.FROST]: 'Frost Tower',
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
    clearSelectedTower();
  }

  return (
    <section className={styles.panel} aria-label="Tower actions">
      <div className={styles.header}>
        <PlaceholderIcon label={formatTowerType(type)} faction={snapshot.selectedFaction} />
        <span className={styles.title}>{formatTowerType(type)}</span>
        <span className={styles.level}>Lv {level}</span>
        <button
          type="button"
          className={styles.close}
          aria-label="Close tower panel"
          onClick={handleClose}
        >
          X
        </button>
      </div>

      <div className={styles.stats}>
        <span className={styles.statLabel}>DMG:</span>
        <span className={styles.statValue}>{combatStats.damage}</span>
        <span className={styles.statLabel}>RNG:</span>
        <span className={styles.statValue}>{combatStats.range.toFixed(1)}</span>
        <span className={styles.statLabel}>SPD:</span>
        <span className={styles.statValue}>{combatStats.attackCooldownMs}ms</span>
        {combatStats.splashRadius !== undefined && (
          <>
            <span className={styles.statLabel}>AOE:</span>
            <span className={styles.statValue}>{combatStats.splashRadius.toFixed(1)}</span>
          </>
        )}
      </div>

      <div className={styles.buttons}>
        {maxed ? (
          <div className={styles.maxLabel}>MAX LEVEL</div>
        ) : (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.upgradeBtn}`}
            disabled={!canUpgrade}
            aria-label={`Upgrade tower to level ${level + 1}`}
            onClick={handleUpgrade}
          >
            <span>Upgrade</span>
            {upgradeCost !== null && (
              <span className={styles.btnCost}>${upgradeCost}</span>
            )}
          </button>
        )}

        <button
          type="button"
          className={`${styles.actionBtn} ${styles.sellBtn}`}
          aria-label={`Sell tower for ${sellValue} gold`}
          onClick={handleSell}
        >
          <span>Sell</span>
          <span className={styles.btnCost}>${sellValue}</span>
        </button>
      </div>
    </section>
  );
}

export const TowerActionPanel = memo(TowerActionPanelComponent);
