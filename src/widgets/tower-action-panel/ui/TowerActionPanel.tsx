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
  getTowerStatsForCurveLevel,
  getUpgradeCost,
  isMaxLevel,
  toTowerUpgradeCurveRef,
  tryResolveBuildableTowerById,
} from '../../../entities/tower';
import { mapTowerEffectsToLines } from '../model/mapTowerEffectsToLines';
import { mapTowerNextLevelPreview } from '../model/mapTowerNextLevelPreview';
import { mapTowerStatsToLines } from '../model/mapTowerStatsToLines';
import type { HudTowerType } from '../../../shared/lib/game-bridge/types';
import { TowerIcon } from '../../../shared/ui/tower-icon';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import { mapTowerBranchState } from '../model/mapTowerBranchState';
import { NextLevelPreview } from './NextLevelPreview';
import { TowerDevelopAction } from './TowerDevelopAction';

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

  const { id, type, name, buildableTowerId, level, cost, combatStats } = selectedTower;
  const towerName = name ?? formatTowerType(type);
  // Cost, cap, sell value and preview all follow the tower's resolved curve:
  // its authored levels 1-3, then the branch its type took (grades 4-7).
  const curve = toTowerUpgradeCurveRef(type, buildableTowerId);
  // The curve ref carries the id only when it names an authored race tower.
  const raceTowerId = curve.buildableTowerId;
  const towerSpriteKey =
    raceTowerId === undefined ? undefined : tryResolveBuildableTowerById(raceTowerId)?.spriteKey;
  const choices = snapshot.towerBranchChoices;
  const upgradeCost = getUpgradeCost(curve, level, choices);
  const maxed = isMaxLevel(curve, level, choices);
  const upgradeCheck = canAffordUpgrade(curve, level, snapshot.gold, choices);
  const sellValue = getSellValue(curve, level, cost, choices);

  const canUpgrade = upgradeCheck.allowed;
  const effectLines = mapTowerEffectsToLines(type, combatStats);
  const statLines = mapTowerStatsToLines(combatStats);
  // Deltas compare two levels of the curve the tower upgrades along (its
  // authored one, else the archetype's), not the live stats an aura buffs.
  const currentLevelStats =
    getTowerStatsForCurveLevel(type, buildableTowerId, level, choices) ?? combatStats;
  const nextLevelStats = maxed
    ? null
    : getTowerStatsForCurveLevel(type, buildableTowerId, level + 1, choices);
  const branchState = mapTowerBranchState(selectedTower, snapshot.gold, choices);
  const { chosenBranch, develop } = branchState;
  const nextLevelPreview = nextLevelStats
    ? mapTowerNextLevelPreview(type, currentLevelStats, nextLevelStats, level + 1)
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
        <TowerIcon
          towerId={raceTowerId}
          spriteKey={towerSpriteKey}
          label={towerName}
          faction={snapshot.selectedFaction}
        />
        <span className={styles.title}>{towerName}</span>
        {chosenBranch && (
          <span className={styles.branch} aria-label={`Branch: ${chosenBranch.name}`} role="note">
            <BranchGlyph
              glyph={chosenBranch.glyph}
              branchId={chosenBranch.id}
              title={chosenBranch.name}
            />
          </span>
        )}
        <span className={styles.level} aria-label={`Level ${level} of ${branchState.maxGrade}`}>
          Lv {level}/{branchState.maxGrade}
        </span>
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
        {develop ? (
          <TowerDevelopAction key={id} towerId={id} towerName={towerName} develop={develop} />
        ) : maxed ? (
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
