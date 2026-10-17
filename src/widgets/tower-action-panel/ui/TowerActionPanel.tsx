import { TowerTypeId } from '../../../shared/types/content-ids';
import { memo, useId } from 'react';
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
import { mapTowerSheetStatTiles } from '../model/mapTowerSheetStats';
import { useEscapeToClose } from '../model/useEscapeToClose';
import type { HudTowerType } from '../../../shared/lib/game-bridge/types';
import { TowerIcon } from '../../../shared/ui/tower-icon';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import { mapTowerBranchState } from '../model/mapTowerBranchState';
import { NextLevelPreview } from './NextLevelPreview';
import { TowerDevelopAction } from './TowerDevelopAction';
import { TowerSheetStats } from './TowerSheetStats';

const TOWER_DISPLAY_NAMES: Record<HudTowerType, string> = {
  [TowerTypeId.SINGLE]: 'Archer Tower',
  [TowerTypeId.SPLASH]: 'Plague Tower',
  [TowerTypeId.FROST]: 'Frost Tower',
  [TowerTypeId.POISON]: 'Poison Tower',
  [TowerTypeId.CHAIN]: 'Chain Tower',
  [TowerTypeId.SUPPORT]: 'Support Tower',
};

const UPGRADE_BLOCKED_REASON = 'Not enough gold';
/** Grade 3 of a tower with branches: the curve goes on only through Develop. */
const DEVELOP_HINT = 'develop a branch for Lv 4-7';

function formatTowerType(type: HudTowerType): string {
  return TOWER_DISPLAY_NAMES[type] ?? type;
}

function closeTowerSheet(): void {
  clearSelectedTower();
}

/**
 * The selected tower as a bottom sheet. The page renders it in the dock slot
 * under the HUD, where it replaces the build and send controls while open; it
 * only ever shows the tower's actions, never runtime state of its own.
 */
function TowerActionPanelComponent() {
  const selectedTower = useSelectedTower();
  const snapshot = useGameHudSnapshot();
  const upgradeReasonId = useId();
  useEscapeToClose(selectedTower !== null, closeTowerSheet);

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
  // Deltas compare two levels of the curve the tower upgrades along (its
  // authored one, else the archetype's), not the live stats an aura buffs.
  const currentLevelStats =
    getTowerStatsForCurveLevel(type, buildableTowerId, level, choices) ?? combatStats;
  const nextLevelStats = maxed
    ? null
    : getTowerStatsForCurveLevel(type, buildableTowerId, level + 1, choices);
  const branchState = mapTowerBranchState(selectedTower, snapshot.gold, choices);
  const { chosenBranch, develop } = branchState;
  const hasBranches = selectedTower.availableBranches.length > 0;
  const nextLevelPreview = nextLevelStats
    ? mapTowerNextLevelPreview(type, currentLevelStats, nextLevelStats, level + 1)
    : null;
  const statTiles = mapTowerSheetStatTiles(combatStats, nextLevelStats, nextLevelPreview);

  function handleUpgrade(): void {
    sendGameCommand('upgrade-tower', { towerId: id });
  }

  function handleSell(): void {
    sendGameCommand('sell-tower', { towerId: id });
  }

  return (
    <section className={`ui-panel ${styles.sheet}`} aria-label="Tower actions" data-tower-sheet="">
      <span className={styles.handle} aria-hidden="true" />

      <div className={styles.header}>
        <span className={styles.portrait}>
          <TowerIcon
            towerId={raceTowerId}
            spriteKey={towerSpriteKey}
            label={towerName}
            faction={snapshot.selectedFaction}
          />
        </span>
        <div className={styles.identity}>
          <h2 className={styles.title}>{towerName}</h2>
          <div className={styles.meta}>
            <span className={styles.level} aria-label={`Level ${level} of ${branchState.maxGrade}`}>
              Lv {level}/{branchState.maxGrade}
            </span>
            {chosenBranch ? (
              <span
                className={styles.branch}
                aria-label={`Branch: ${chosenBranch.name}`}
                role="note"
              >
                <BranchGlyph
                  glyph={chosenBranch.glyph}
                  branchId={chosenBranch.id}
                  title={chosenBranch.name}
                />
                <span className={styles.branchName} aria-hidden="true">
                  {chosenBranch.name}
                </span>
              </span>
            ) : (
              hasBranches && <span className={styles.branch}>No branch yet</span>
            )}
            {effectLines.length > 0 && (
              <ul className={styles.effects} aria-label="Tower effects">
                {effectLines.map((line) => (
                  <li key={line.key} className={styles.effectItem}>
                    <span className={styles.effectLabel}>{line.label}</span> {line.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          className={`ui-btn-small ui-btn-small--close ${styles.close}`}
          aria-label="Close tower panel"
          onClick={closeTowerSheet}
        >
          X
        </button>
      </div>

      <TowerSheetStats tiles={statTiles} />

      {nextLevelPreview ? (
        <NextLevelPreview preview={nextLevelPreview} />
      ) : (
        develop && (
          <p className={styles.next}>
            <span className={styles.nextLabel}>NEXT</span> · {DEVELOP_HINT}
          </p>
        )
      )}

      <div className={styles.footer}>
        {develop ? (
          <TowerDevelopAction key={id} towerId={id} towerName={towerName} develop={develop} />
        ) : (
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald ${styles.actionBtn} ${styles.upgradeBtn}`}
            disabled={!canUpgrade}
            aria-label={maxed ? 'Tower is at max level' : `Upgrade tower to level ${level + 1}`}
            aria-describedby={!maxed && !canUpgrade ? upgradeReasonId : undefined}
            onClick={handleUpgrade}
          >
            {maxed || upgradeCost === null ? (
              <span className={styles.actionLabel}>MAX LEVEL</span>
            ) : (
              <span className={styles.actionLabel}>Upgrade ${upgradeCost}</span>
            )}
            {!maxed && !canUpgrade && (
              <span id={upgradeReasonId} className={styles.actionReason}>
                {UPGRADE_BLOCKED_REASON}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          className={`fantasy-button fantasy-button--danger ${styles.actionBtn} ${styles.sellBtn}`}
          aria-label={`Sell tower for ${sellValue} gold`}
          onClick={handleSell}
        >
          <span className={styles.actionLabel}>Sell +${sellValue}</span>
        </button>
      </div>
    </section>
  );
}

export const TowerActionPanel = memo(TowerActionPanelComponent);
