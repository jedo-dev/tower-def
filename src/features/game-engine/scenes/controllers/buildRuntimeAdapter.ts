import { resolveTowerSellRefundRatio } from '../../../../entities/tower';
import { checkFootprintPlacementPath } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { isWaveActionAllowed } from '../../../wave-phase';
import {
  isBuildAnchorValid as isBuildAnchorValidRuntime,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from '../../runtime/build/gameSceneBuildRuntime';
import {
  canProcessUserAction as canProcessUserActionRuntime,
  markUserActionProcessed as markUserActionProcessedRuntime,
} from '../../runtime/input/gameSceneInputController';
import { DEFAULT_TOWER_COST, SELL_REFUND_RATIO } from '../gameScene.constants';
import { resolveBuildableTowerConfig, toGridCellKey, toTowerId } from '../gameScene.helpers';
import { INPUT_CONTROLLER_CONFIG } from '../gameScene.runtimeConfigs';
import type { GameSceneState } from './gameSceneState';
import type { GameSceneCore } from './sceneQueries';

/** The input cooldown shared by every board action (build, sell, select). */
export function canProcessUserAction({ scene, state }: GameSceneCore): boolean {
  return canProcessUserActionRuntime(
    state.inputControllerState,
    scene.time.now,
    INPUT_CONTROLLER_CONFIG.actionCooldownMs,
  );
}

export function markUserActionProcessed({ scene, state }: GameSceneCore): void {
  markUserActionProcessedRuntime(state.inputControllerState, scene.time.now);
}

export function getBuildRuntimeState(state: GameSceneState): BuildRuntimeState {
  return {
    gridModel: state.gridModel,
    hoveredCell: state.hoveredCell,
    hoveredBuildAnchor: state.hoveredBuildAnchor,
    playerGold: state.runState.playerGold,
    placedTowerCostsByCellKey: state.placedTowerCostsByCellKey,
  };
}

export function getBuildRuntimeDeps(core: GameSceneCore): BuildRuntimeDeps {
  const { state } = core;
  return {
    canPerformPlace: () =>
      state.activeBattlefieldView === 'player' &&
      canProcessUserAction(core) &&
      isWaveActionAllowed(state.runState.wavePhaseState, 'place-tower') &&
      !state.runState.isGameOver,
    resolvePlaceRejection: () => {
      if (state.activeBattlefieldView !== 'player') return 'opponent_view';
      if (state.runState.isGameOver) return 'match_over';
      if (!isWaveActionAllowed(state.runState.wavePhaseState, 'place-tower')) {
        return 'not_build_phase';
      }
      return null;
    },
    canPerformSell: () =>
      state.activeBattlefieldView === 'player' &&
      canProcessUserAction(core) &&
      isWaveActionAllowed(state.runState.wavePhaseState, 'sell-tower') &&
      !state.runState.isGameOver,
    selectedTowerType: state.selectedTowerType,
    resolveTowerCost: (towerType) => {
      const towerConfig = resolveBuildableTowerConfig(state.selectedBuilderFactionId, towerType);
      return towerConfig?.costGold ?? DEFAULT_TOWER_COST;
    },
    resolveBuildableTower: (towerType) =>
      resolveBuildableTowerConfig(state.selectedBuilderFactionId, towerType),
    toGridCellKey: (position) => toGridCellKey(position),
    toTowerId: (position) => toTowerId(position),
    checkFootprintPlacementPath: (grid, anchor, footprint) =>
      checkFootprintPlacementPath(grid, anchor, footprint),
    sellRefundRatio: SELL_REFUND_RATIO,
    resolveSellRefundRatio: (towerId) => {
      const tower = state.playerField.towers.find((candidate) => candidate.entity.id === towerId);
      return tower
        ? resolveTowerSellRefundRatio(tower.entity, SELL_REFUND_RATIO)
        : SELL_REFUND_RATIO;
    },
  };
}

export function isBuildAnchorValid(
  core: GameSceneCore,
  anchor: GridPosition,
  grid: GridModel,
): boolean {
  return isBuildAnchorValidRuntime(
    getBuildRuntimeState(core.state),
    getBuildRuntimeDeps(core),
    anchor,
    grid,
  );
}
