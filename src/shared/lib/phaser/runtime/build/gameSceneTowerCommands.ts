import type Phaser from 'phaser';
import {
  canAffordUpgrade,
  createInitialTowerCombatRuntime,
  getTowerStatsForLevel,
  getUpgradeCost,
} from '../../../../../entities/tower';
import { spendGold } from '../../../../../entities/player-resources';
import type { GridCell, GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import type { RaceId } from '../../../../types/content-ids';
import { publishGameEvent } from '../../../game-bridge/bridge';
import type { SelectedTowerSnapshot } from '../../../game-bridge/types';
import { SELL_REFUND_RATIO } from '../../scenes/gameScene.constants';
import type { SoundId } from '../../sound/audio.types';
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
  getPlayerLives: () => number;
  onGoldUpdated: (nextGold: number) => void;
  onRefundRecorded: (refundAmount: number) => void;
  playSound: (soundId: SoundId) => void;
  markUserActionProcessed: () => void;
  onHudChanged: () => void;
  drawGridCell: (cell: GridCell) => void;
  updateBuildPreview: () => void;
};

function toSelectedTowerSnapshot(tower: BattlefieldRenderState['towers'][number]): SelectedTowerSnapshot {
  return {
    id: tower.entity.id,
    type: tower.entity.type,
    level: tower.entity.level,
    position: { x: tower.entity.position.x, y: tower.entity.position.y },
    cost: tower.entity.cost,
    combatStats: { ...tower.entity.combatStats },
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
  if (!result.success || !result.changedCell || !result.placedTower || !result.towerType) {
    deps.playSound('combat.invalid_build');
    return;
  }

  const towerSprite =
    result.towerType === 'splash'
      ? createPlacedPlagueSprite(deps.scene, result.placedTower.position)
      : createPlacedArcherSprite(deps.scene, result.placedTower.position, deps.getBuilderFactionId());
  deps.playerField.towers.push({
    entity: result.placedTower,
    runtime: createInitialTowerCombatRuntime(),
    sprite: towerSprite,
  });
  deps.onGoldUpdated(result.playerGold);
  deps.playSound('combat.successful_build');
  deps.playSound('economy.gold_spent');
  deps.markUserActionProcessed();
  deps.onHudChanged();

  deps.drawGridCell(result.changedCell);
  deps.updateBuildPreview();
}

export function trySellTowerAtHoveredCell(deps: TowerCommandDeps): void {
  if (!deps.isPlayerViewActive()) {
    return;
  }

  const result = trySellTowerAtHoveredCellRuntime(
    deps.getBuildRuntimeState(),
    deps.getBuildRuntimeDeps(),
  );
  if (!result.success || !result.changedCell || !result.removedTowerId) {
    return;
  }

  deps.playerField.towers = deps.playerField.towers.filter((tower) => {
    const shouldKeep = tower.entity.id !== result.removedTowerId;
    if (!shouldKeep) {
      playBoneArcherSellAnimation(tower);
    }
    return shouldKeep;
  });
  deps.onRefundRecorded(result.refundAmount);
  deps.playSound('combat.sell_tower');
  deps.playSound('economy.refund');
  deps.markUserActionProcessed();
  deps.onHudChanged();
  publishGameEvent('selected-tower', { tower: null });

  deps.drawGridCell(result.changedCell);
  deps.updateBuildPreview();
}

export function trySelectTowerAtHoveredCell(deps: TowerCommandDeps): boolean {
  const hoveredCell = deps.getHoveredCell();
  if (!hoveredCell || !deps.getGridModel()) {
    return false;
  }

  const tower = deps.playerField.towers.find(
    (candidate) =>
      candidate.entity.position.x === hoveredCell.x &&
      candidate.entity.position.y === hoveredCell.y,
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
    deps.playSound('combat.invalid_build');
    return;
  }

  const upgradeCost = getUpgradeCost(entity.type, entity.level);
  if (upgradeCost === null || upgradeCost <= 0) {
    return;
  }

  const nextLevel = entity.level + 1;
  const nextStats = getTowerStatsForLevel(entity.type, nextLevel);
  if (!nextStats) {
    return;
  }

  const spendResult = spendGold(
    { gold: deps.getPlayerGold(), lives: deps.getPlayerLives() },
    upgradeCost,
  );
  if (!spendResult.spent) {
    deps.playSound('combat.invalid_build');
    return;
  }

  entity.level = nextLevel;
  entity.combatStats = { ...nextStats };
  deps.onGoldUpdated(spendResult.resources.gold);
  deps.playSound('ui.success');
  deps.playSound('economy.gold_spent');
  deps.onHudChanged();

  publishGameEvent('selected-tower', { tower: toSelectedTowerSnapshot(tower) });
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
  playBoneArcherSellAnimation(tower);

  const refundAmount = Math.floor(tower.entity.cost * SELL_REFUND_RATIO);
  deps.onGoldUpdated(deps.getPlayerGold() + refundAmount);
  deps.onRefundRecorded(refundAmount);

  const cell = deps.getGridModel()?.cells.find(
    (c) => c.x === tower.entity.position.x && c.y === tower.entity.position.y,
  );
  if (cell) {
    cell.isOccupied = false;
    cell.isWalkable = true;
    deps.drawGridCell(cell);
  }

  deps.playSound('combat.sell_tower');
  deps.playSound('economy.refund');
  deps.onHudChanged();
  publishGameEvent('selected-tower', { tower: null });
  deps.updateBuildPreview();
}
