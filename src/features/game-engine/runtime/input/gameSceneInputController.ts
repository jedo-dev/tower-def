import type Phaser from 'phaser';
import type { ScreenPoint } from '../camera/cameraViewMapping';
import { screenDistance, wheelDeltaToZoomMultiplier } from './boardGestures';
import {
  dispatchBoardTap,
  syncHoveredCellFromPointer,
  type InputControllerConfig,
  type InputControllerDependencies,
  type InputControllerState,
} from './inputControllerCore';
import { handleTouchDown, handleTouchMove, handleTouchUp } from './gameSceneTouchGestures';

export {
  canProcessUserAction,
  createInputControllerState,
  markUserActionProcessed,
  syncHoveredCellFromPointer,
  type BoardTapOutcome,
  type InputControllerConfig,
  type InputControllerDependencies,
  type InputControllerState,
} from './inputControllerCore';

/**
 * Board pointer input, shared by mouse and touch. Mouse: left click builds at
 * once at fit zoom, or on release (unless it dragged) when zoomed in or with
 * Shift held; middle button and those drags pan; wheel zooms at the cursor;
 * right click sells. Touch is in gameSceneTouchGestures.
 */

function handleMouseMove(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
  screen: ScreenPoint,
): void {
  const drag = state.activeMouseDrag;
  if (drag) {
    if (!drag.isPanning && screenDistance(drag.start, screen) > config.panStartThresholdPx) {
      drag.isPanning = true;
    }
    if (drag.isPanning) {
      deps.panCameraBy({ x: screen.x - drag.last.x, y: screen.y - drag.last.y });
      drag.last = screen;
      return;
    }
    drag.last = screen;
  }

  syncHoveredCellFromPointer(deps, pointer);
  deps.updateBuildPreview();
}

export function handlePointerMove(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
): void {
  const screen = deps.toPointerScreenPoint(pointer);
  if (pointer.wasTouch) {
    handleTouchMove(state, deps, config, pointer, screen);
    return;
  }
  handleMouseMove(state, deps, config, pointer, screen);
}

export function handlePointerDown(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pointer: Phaser.Input.Pointer,
): void {
  const screen = deps.toPointerScreenPoint(pointer);
  if (pointer.wasTouch) {
    handleTouchDown(state, deps, pointer, screen);
    return;
  }

  if (pointer.button === 1) {
    state.activeMouseDrag = {
      start: screen,
      last: screen,
      isPanning: true,
      placesOnRelease: false,
    };
    return;
  }

  if (pointer.button === 0) {
    if (deps.isCameraZoomed() || deps.hasPanModifier(pointer)) {
      state.activeMouseDrag = {
        start: screen,
        last: screen,
        isPanning: false,
        placesOnRelease: true,
      };
      return;
    }
    deps.onBoardTap(pointer);
    return;
  }

  if (pointer.button === 2) {
    syncHoveredCellFromPointer(deps, pointer);
    deps.trySellTowerAtHoveredCell();
  }
}

export function handlePointerUp(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
): void {
  const screen = deps.toPointerScreenPoint(pointer);
  if (pointer.wasTouch) {
    handleTouchUp(state, deps, config, pointer, screen);
    return;
  }

  const drag = state.activeMouseDrag;
  if (!drag) {
    return;
  }
  state.activeMouseDrag = null;
  if (drag.placesOnRelease && !drag.isPanning) {
    dispatchBoardTap(state, deps, config, pointer, screen);
  }
}

/** Mouse wheel zooms around the cursor. */
export function handleWheel(
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
  deltaY: number,
): void {
  deps.zoomCameraByAt(
    wheelDeltaToZoomMultiplier(deltaY, config.wheelZoomSensitivity),
    deps.toPointerScreenPoint(pointer),
  );
}

export function handleGameOut(
  state: InputControllerState,
  deps: InputControllerDependencies,
): void {
  state.activeTouchGesture = null;
  state.activePinch = null;
  state.activeMouseDrag = null;
  state.touchPointsById.clear();
  deps.clearHoveredCell();
  deps.updateHoveredCellDebugRegistry();
  deps.updateBuildPreview();
}
