import { recalculateTowerAuras } from '../../../../entities/tower';
import { TowerAttackKind } from '../../../../shared/types/content-ids';
import { getTowerAttackKind, isTowerCoveringCell } from '../../../../entities/tower';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { getFootprintCells } from '../../../../shared/lib/grid/footprint';
import type Phaser from 'phaser';
import {
  canAffordUpgrade,
  createInitialTowerCombatRuntime,
  getTowerStatsForTowerLevel,
  tryResolveBuildableTowerById,
  getUpgradeCost,
} from '../../../../entities/tower';
import { spendGold } from '../../../../entities/player-resources';
import type { GridCell, GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import type { RaceId } from '../../../../shared/types/content-ids';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { SelectedTowerSnapshot } from '../../../../shared/lib/game-bridge/types';
import { SELL_REFUND_RATIO } from '../../scenes/gameScene.constants';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import { TowerSoundSlot } from '../../../../shared/types/sound-ids';
import type { GameSoundRouter } from '../audio/gameSoundRouting';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import {
  createPlacedArcherSprite,
  createPlacedPlagueSprite,
  playBoneArcherSellAnimation,
} from '../battlefield/battlefieldSpriteFactory';
import {
  tryPlaceTowerAtHoveredCell as tryPlaceTowerAtHoveredCellRuntime,
  trySellTowerAtHoveredCell as trySellTowerAtHoveredCellRuntime,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from './gameSceneBuildRuntime';

export type TowerCommandDeps = {
  scene: Phaser.Scene;
  playerField: BattlefieldRenderState;
  getBuildRuntimeState: () => BuildRuntimeState;
  getBuildRuntimeDeps: () => BuildRuntimeDeps;
  isPlayerViewActive: () => boolean;
  canManageTowers: () => boolean;
  getHoveredCell: () => GridPosition | null;
  getGridModel: () => GridModel | null;
  getBuilderFactionId: () => RaceId;
  getPlayerGold: () => number;
  onGoldUpdated: (nextGold: number) => void;
  onRefundRecorded: (refundAmount: number) => void;
  playSound: (soundId: SoundId) => void;
  /** Build, sell and upgrade sounds, resolved through the tower's sound profile. */
  soundRouter: GameSoundRouter;
  markUserActionProcessed: () => void;
  onHudChanged: () => void;
  drawGridCell: (cell: GridCell) => void;
  updateBuildPreview: () => void;
};

function toSelectedTowerSnapshot(
  tower: BattlefieldRenderState['towers'][number],
): SelectedTowerSnapshot {
  const authoredTower = tower.entity.buildableTowerId
    ? tryResolveBuildableTowerById(tower.entity.buildableTowerId)
    : undefined;

  return {
    id: tower.entity.id,
    type: tower.entity.type,
    ...(authoredTower ? { name: authoredTower.name } : {}),
    level: tower.entity.level,
    position: { x: tower.entity.position.x, y: tower.entity.position.y },
    cost: tower.entity.cost,
    combatStats: {
      ...tower.entity.combatStats,
      ...(tower.entity.combatStats.onHitEffects
        ? { onHitEffects: tower.entity.combatStats.onHitEffects.map((effect) => ({ ...effect })) }
        : {}),
    },
  };
}

export function tryPlaceTowerAtHoveredCell(deps: TowerCommandDeps): void {
  if (!deps.isPlayerViewActive()) {
    return;
  }

  const result = tryPlaceTowerAtHoveredCellRuntime(
    deps.getBuildRuntimeState(),
    deps.getBuildRuntimeDeps(),
  );
  if (!result.success || !result.placedTower || !result.towerType) {
    deps.playSound('ui.error');
    return;
  }

  const towerSprite =
    getTowerAttackKind(result.towerType) === TowerAttackKind.SPLASH
      ? createPlacedPlagueSprite(deps.scene, result.placedTower.position)
      : createPlacedArcherSprite(
          deps.scene,
          result.placedTower.position,
          deps.getBuilderFactionId(),
        );
  deps.playerField.towers.push({
    entity: result.placedTower,
    runtime: createInitialTowerCombatRuntime(),
    sprite: towerSprite,
  });
  refreshFieldAuras(deps.playerField);
  deps.onGoldUpdated(result.playerGold);
  deps.soundRouter.playTowerSound(result.placedTower, TowerSoundSlot.BUILD);
  deps.playSound('economy.gold_spent');
  deps.markUserActionProcessed();
  deps.onHudChanged();

  result.changedCells.forEach((cell) => deps.drawGridCell(cell));
  deps.updateBuildPreview();
}

/** Auras are derived state: recompute the whole field whenever it changes. */
function refreshFieldAuras(field: TowerCommandDeps['playerField']): void {
  recalculateTowerAuras(field.towers.map((tower) => tower.entity));
}

export function trySellTowerAtHoveredCell(deps: TowerCommandDeps): void {
  if (!deps.isPlayerViewActive()) {
    return;
  }

  const result = trySellTowerAtHoveredCellRuntime(
    deps.getBuildRuntimeState(),
    deps.getBuildRuntimeDeps(),
  );
  if (!result.success || !result.removedTowerId) {
    return;
  }

  deps.playerField.towers = deps.playerField.towers.filter((tower) => {
    const shouldKeep = tower.entity.id !== result.removedTowerId;
    if (!shouldKeep) {
      playBoneArcherSellAnimation(tower);
      deps.soundRouter.playTowerSound(tower.entity, TowerSoundSlot.SELL);
    }
    return shouldKeep;
  });
  refreshFieldAuras(deps.playerField);
  deps.onRefundRecorded(result.refundAmount);
  deps.playSound('economy.refund');
  deps.markUserActionProcessed();
  deps.onHudChanged();
  publishGameEvent('selected-tower', { tower: null });

  result.changedCells.forEach((cell) => deps.drawGridCell(cell));
  deps.updateBuildPreview();
}

/**
 * Selects the player tower standing on the hovered cell, whichever of its
 * cells it is. The opponent view is read-only: the player's towers sit under
 * the enemy board there, so a tap must not open their actions.
 */
export function trySelectTowerAtHoveredCell(deps: TowerCommandDeps): boolean {
  if (!deps.isPlayerViewActive()) {
    return false;
  }

  const hoveredCell = deps.getHoveredCell();
  if (!hoveredCell || !deps.getGridModel()) {
    return false;
  }

  const tower = deps.playerField.towers.find((candidate) =>
    isTowerCoveringCell(candidate.entity, hoveredCell),
  );
  if (!tower) {
    return false;
  }

  publishGameEvent('selected-tower', { tower: toSelectedTowerSnapshot(tower) });
  deps.playSound('ui.click');
  return true;
}

export function handleUpgradeTowerCommand(deps: TowerCommandDeps, towerId: string): void {
  if (!deps.canManageTowers()) {
    return;
  }

  const tower = deps.playerField.towers.find((t) => t.entity.id === towerId);
  if (!tower) {
    return;
  }

  const { entity } = tower;
  const upgradeCheck = canAffordUpgrade(entity.type, entity.level, deps.getPlayerGold());
  if (!upgradeCheck.allowed) {
    deps.playSound('ui.error');
    return;
  }

  const upgradeCost = getUpgradeCost(entity.type, entity.level);
  if (upgradeCost === null || upgradeCost <= 0) {
    return;
  }

  const nextLevel = entity.level + 1;
  const nextStats = getTowerStatsForTowerLevel(entity, nextLevel);
  if (!nextStats) {
    return;
  }

  const spendResult = spendGold({ gold: deps.getPlayerGold() }, upgradeCost);
  if (!spendResult.spent) {
    deps.playSound('ui.error');
    return;
  }

  entity.level = nextLevel;
  entity.combatStats = { ...nextStats };
  entity.baseCombatStats = { ...nextStats };
  refreshFieldAuras(deps.playerField);
  deps.onGoldUpdated(spendResult.resources.gold);
  deps.soundRouter.playTowerSound(entity, TowerSoundSlot.UPGRADE);
  deps.playSound('economy.gold_spent');
  deps.onHudChanged();

  publishGameEvent('selected-tower', { tower: toSelectedTowerSnapshot(tower) });
}

/** Frees every cell of the sold tower block and forgets what it cost. */
function freeTowerCells(deps: TowerCommandDeps, anchor: GridPosition): void {
  const buildState = deps.getBuildRuntimeState();
  buildState.placedTowerCostsByCellKey.delete(deps.getBuildRuntimeDeps().toGridCellKey(anchor));

  const gridModel = deps.getGridModel();
  if (!gridModel) {
    return;
  }

  for (const point of getFootprintCells(anchor, TOWER_FOOTPRINT)) {
    const cell = getCellAt(gridModel, point.x, point.y);
    if (cell) {
      cell.isOccupied = false;
      cell.isWalkable = true;
      deps.drawGridCell(cell);
    }
  }
}

export function handleSellTowerCommand(deps: TowerCommandDeps, towerId: string): void {
  if (!deps.canManageTowers()) {
    return;
  }

  const tower = deps.playerField.towers.find((t) => t.entity.id === towerId);
  if (!tower) {
    return;
  }

  deps.playerField.towers = deps.playerField.towers.filter((t) => t.entity.id !== towerId);
  refreshFieldAuras(deps.playerField);
  playBoneArcherSellAnimation(tower);

  const refundAmount = Math.floor(tower.entity.cost * SELL_REFUND_RATIO);
  deps.onGoldUpdated(deps.getPlayerGold() + refundAmount);
  deps.onRefundRecorded(refundAmount);

  freeTowerCells(deps, tower.entity.position);

  deps.soundRouter.playTowerSound(tower.entity, TowerSoundSlot.SELL);
  deps.playSound('economy.refund');
  deps.onHudChanged();
  publishGameEvent('selected-tower', { tower: null });
  deps.updateBuildPreview();
}
