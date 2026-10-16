import type Phaser from 'phaser';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import { resolvePlacementTap } from '../../runtime/build/placementConfirmation';
import {
  tryPlaceTowerAtHoveredCell,
  trySelectTowerAtHoveredCell,
} from '../../runtime/build/gameSceneTowerCommands';
import {
  syncHoveredCellFromPointer,
  type BoardTapOutcome,
} from '../../runtime/input/gameSceneInputController';
import { updateBuildPreview } from './boardRenderController';
import type { GameSceneContext } from './gameSceneContext';
import { canPerformBuildActions, confirmsTouchPlacement, type GameSceneCore } from './sceneQueries';

/**
 * A tap or click that reached the board: a tower under it is selected,
 * otherwise the selection closes and the tap goes to building.
 */
export function handleBoardTap(
  context: GameSceneContext,
  pointer: Phaser.Input.Pointer,
): BoardTapOutcome {
  const { state } = context;
  syncHoveredCellFromPointer(context.inputControllerDeps, pointer);
  if (trySelectTowerAtHoveredCell(context.towerCommandDeps)) {
    clearPendingPlacement(context);
    return 'selected-tower';
  }
  if (state.hoveredCell) {
    publishGameEvent('selected-tower', { tower: null });
  }

  const isBuildTap = state.activeBattlefieldView === 'player' && canPerformBuildActions(state);
  if (isBuildTap && confirmsTouchPlacement(state)) {
    handleTwoTapPlacement(context);
  } else {
    state.pendingPlacementAnchor = null;
    tryPlaceTowerAtHoveredCell(context.towerCommandDeps);
  }
  return isBuildTap ? 'build-tap' : 'board-tap';
}

function clearPendingPlacement(core: GameSceneCore): void {
  if (!core.state.pendingPlacementAnchor) {
    return;
  }
  core.state.pendingPlacementAnchor = null;
  updateBuildPreview(core);
}

/** First tap arms the hovered block; a second tap on it builds (a refusal keeps it armed). */
function handleTwoTapPlacement(context: GameSceneContext): void {
  const { state } = context;
  if (!state.hoveredBuildAnchor) {
    return;
  }
  const decision = resolvePlacementTap(state.pendingPlacementAnchor, state.hoveredBuildAnchor);
  if (decision.kind === 'arm') {
    state.pendingPlacementAnchor = decision.anchor;
    state.soundManager?.play('ui.click');
    updateBuildPreview(context);
    return;
  }

  const towersBefore = state.playerField.towers.length;
  tryPlaceTowerAtHoveredCell(context.towerCommandDeps);
  if (state.playerField.towers.length > towersBefore) {
    state.pendingPlacementAnchor = null;
    updateBuildPreview(context);
  }
}
