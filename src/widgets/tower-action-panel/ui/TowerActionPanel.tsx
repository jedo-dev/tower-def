import { TowerTypeId } from '../../../shared/types/content-ids';
import { memo } from 'react';
import styles from './TowerActionPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import {
  clearSelectedTower,
  useSelectedTower,
} from '../../../shared/lib/game-bridge/useSelectedTower';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import {
  canAffordUpgrade,
  getSellValue,
  getTowerStatsForLevel,
  getUpgradeCost,
  isMaxLevel,
} from '../../../entities/tower';
import { mapTowerEffectsToLines } from '../model/mapTowerEffectsToLines';
import { mapTowerNextLevelPreview } from '../model/mapTowerNextLevelPreview';
import { mapTowerStatsToLines } from '../model/mapTowerStatsToLines';
import type { HudTowerType } from '../../../shared/lib/game-bridge/types';
import { PlaceholderIcon } from '../../../shared/ui/placeholder-icon';
import { NextLevelPreview } from './NextLevelPreview';

const TOWER_DISPLAY_NAMES: Record<HudTowerType, string> = {
  [TowerTypeId.SINGLE]: 'Archer Tower',
  [TowerTypeId.SPLASH]: 'Plague Tower',
  [TowerTypeId.FROST]: 'Frost Tower',
  [TowerTypeId.POISON]: 'Poison Tower',
  [TowerTypeId.CHAIN]: 'Chain Tower',
  [TowerTypeId.SUPPORT]: 'Support Tower',
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

  const { id, type, name, level, cost, combatStats } = selectedTower;
  const towerName = name ?? formatTowerType(type);
  const upgradeCost = getUpgradeCost(type, level);
  const maxed = isMaxLevel(type, level);
  const upgradeCheck = canAffordUpgrade(type, level, snapshot.gold);
  const sellValue = getSellValue(type, level, cost);

  const canUpgrade = upgradeCheck.allowed;
  const effectLines = mapTowerEffectsToLines(type, combatStats);
  const statLines = mapTowerStatsToLines(combatStats);
  const nextLevelStats = maxed ? null : getTowerStatsForLevel(type, level + 1);
  const nextLevelPreview = nextLevelStats
    ? mapTowerNextLevelPreview(type, combatStats, nextLevelStats, level + 1)
    : null;

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
    <section className={`ui-panel ${styles.panel}`} aria-label="Tower actions">
      <div className={styles.header}>
        <PlaceholderIcon label={towerName} faction={snapshot.selectedFaction} />
        <span className={styles.title}>{towerName}</span>
        <span className={styles.level}>Lv {level}</span>
        <button
          type="button"
          className={`ui-btn-small ui-btn-small--close ${styles.close}`}
          aria-label="Close tower panel"
          onClick={handleClose}
        >
          X
        </button>
      </div>

      <dl className={styles.stats}>
        {statLines.map((stat) => (
          <div key={stat.key} className={styles.stat}>
            <dt className={styles.statLabel} title={stat.name}>
              <span aria-hidden="true">{stat.shortLabel}</span>
              <span className={styles.visuallyHidden}>{stat.name}</span>
            </dt>
            <dd className={styles.statValue}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {effectLines.length > 0 && (
        <ul className={styles.effects} aria-label="Tower effects">
          {effectLines.map((line) => (
            <li key={line.key} className={styles.effectRow}>
              <span className={styles.effectLabel}>{line.label}</span>
              <span className={styles.effectValue}>{line.value}</span>
            </li>
          ))}
        </ul>
      )}

      {nextLevelPreview && <NextLevelPreview preview={nextLevelPreview} />}

      <div className={styles.buttons}>
        {maxed ? (
          <div className={styles.maxLabel}>MAX LEVEL</div>
        ) : (
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.actionBtn}`}
            disabled={!canUpgrade}
            aria-label={`Upgrade tower to level ${level + 1}`}
            onClick={handleUpgrade}
          >
            <span>Upgrade</span>
            {upgradeCost !== null && <span className={styles.btnCost}>${upgradeCost}</span>}
          </button>
        )}

        <button
          type="button"
          className={`fantasy-button fantasy-button--ember fantasy-button--compact ${styles.actionBtn}`}
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
