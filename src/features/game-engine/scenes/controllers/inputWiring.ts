import type Phaser from 'phaser';
import type { BoardZoomAction } from '../../../../shared/lib/game-bridge/types';
import { trySellTowerAtHoveredCell } from '../../runtime/build/gameSceneTowerCommands';
import {
  getBoardViewportCentre,
  getBoardZoomFactor,
  isBoardCameraZoomed,
  panBoardCamera,
  resetBoardCamera,
  resolvePointerScreenPoint,
  resolvePointerWorldPoint,
  setBoardCameraZoomFactorAt,
  zoomBoardCameraByAt,
} from '../../runtime/camera/gameSceneCameraRuntime';
import { toPointerGridTarget } from '../../runtime/grid/gameSceneGridPreviewRuntime';
import {
  handleGameOut as handleGameOutRuntime,
  handlePointerDown as handlePointerDownRuntime,
  handlePointerMove as handlePointerMoveRuntime,
  handlePointerUp as handlePointerUpRuntime,
  handleWheel as handleWheelRuntime,
  type InputControllerDependencies,
} from '../../runtime/input/gameSceneInputController';
import { BOARD_ZOOM_KEY_STEP_FACTOR } from '../gameScene.constants';
import { INPUT_CONTROLLER_CONFIG } from '../gameScene.runtimeConfigs';
import { handleBoardTap } from './boardTapController';
import { updateBuildPreview } from './boardRenderController';
import type { GameSceneContext } from './gameSceneContext';
import { getBoardCamera, type GameSceneCore } from './sceneQueries';

export function createInputControllerDeps(context: GameSceneContext): InputControllerDependencies {
  const { scene, state } = context;
  return {
    nowMs: () => scene.time.now,
    toPointerScreenPoint: (pointer) => resolvePointerScreenPoint(scene, pointer),
    toPointerWorldPoint: (pointer) =>
      resolvePointerWorldPoint(scene, getBoardCamera(context), pointer),
    toPointerTarget: (worldX, worldY) => toPointerGridTarget(worldX, worldY),
    setHoveredTarget: (target) => {
      state.hoveredCell = target?.cell ?? null;
      state.hoveredBuildAnchor = target?.buildAnchor ?? null;
    },
    clearHoveredCell: () => {
      state.hoveredCell = null;
      state.hoveredBuildAnchor = null;
    },
    updateHoveredCellDebugRegistry: () => undefined,
    updateBuildPreview: () => updateBuildPreview(context),
    onBoardTap: (pointer) => handleBoardTap(context, pointer),
    trySellTowerAtHoveredCell: () => trySellTowerAtHoveredCell(context.towerCommandDeps),
    isCameraZoomed: () => isBoardCameraZoomed(getBoardCamera(context)),
    getCameraZoomFactor: () => getBoardZoomFactor(getBoardCamera(context)),
    setCameraZoomFactorAt: (factor, focus) =>
      setBoardCameraZoomFactorAt(scene, getBoardCamera(context), factor, focus),
    zoomCameraByAt: (multiplier, focus) =>
      zoomBoardCameraByAt(scene, getBoardCamera(context), multiplier, focus),
    panCameraBy: (dragDelta) => panBoardCamera(scene, getBoardCamera(context), dragDelta),
    resetCameraZoom: () => resetBoardCamera(scene, getBoardCamera(context)),
    hasPanModifier: (pointer) => {
      // The harness emits plain pointer objects without a DOM event.
      const event: { shiftKey?: boolean } | undefined = pointer.event;
      return event?.shiftKey === true;
    },
  };
}

export function handlePointerMove(context: GameSceneContext, pointer: Phaser.Input.Pointer): void {
  const { state } = context;
  if (!pointer.wasTouch) {
    // Back on a mouse: the preview follows the cursor again.
    state.isLastPointerTouch = false;
    state.pendingPlacementAnchor = null;
  }
  handlePointerMoveRuntime(
    state.inputControllerState,
    context.inputControllerDeps,
    INPUT_CONTROLLER_CONFIG,
    pointer,
  );
}

export function handlePointerDown(context: GameSceneContext, pointer: Phaser.Input.Pointer): void {
  context.state.isLastPointerTouch = pointer.wasTouch;
  handlePointerDownRuntime(
    context.state.inputControllerState,
    context.inputControllerDeps,
    pointer,
  );
}

export function handlePointerUp(context: GameSceneContext, pointer: Phaser.Input.Pointer): void {
  handlePointerUpRuntime(
    context.state.inputControllerState,
    context.inputControllerDeps,
    INPUT_CONTROLLER_CONFIG,
    pointer,
  );
}

export function handleWheel(
  context: GameSceneContext,
  pointer: Phaser.Input.Pointer,
  deltaY: number,
): void {
  handleWheelRuntime(context.inputControllerDeps, INPUT_CONTROLLER_CONFIG, pointer, deltaY);
}

export function handleGameOut(context: GameSceneContext): void {
  handleGameOutRuntime(context.state.inputControllerState, context.inputControllerDeps);
}

export function handleZoomBoardCommand(core: GameSceneCore, action: BoardZoomAction): void {
  const camera = getBoardCamera(core);
  if (action === 'reset') {
    resetBoardCamera(core.scene, camera);
    return;
  }
  const multiplier = action === 'in' ? BOARD_ZOOM_KEY_STEP_FACTOR : 1 / BOARD_ZOOM_KEY_STEP_FACTOR;
  zoomBoardCameraByAt(core.scene, camera, multiplier, getBoardViewportCentre(camera));
}
