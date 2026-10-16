import type Phaser from 'phaser';
import type { ScreenPoint } from '../camera/cameraViewMapping';
import {
  isTapGesture,
  measurePinch,
  resolvePinchZoomFactor,
  screenDistance,
} from './boardGestures';
import {
  dispatchBoardTap,
  syncHoveredCellFromPointer,
  type InputControllerConfig,
  type InputControllerDependencies,
  type InputControllerState,
  type InputPinchGesture,
} from './inputControllerCore';

/**
 * Touch side of the board input: one finger taps, long-presses to sell, or
 * pans once zoomed in; two fingers pinch to zoom around their midpoint.
 */

export function handleTouchDown(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pointer: Phaser.Input.Pointer,
  screen: ScreenPoint,
): void {
  state.touchPointsById.set(pointer.id, screen);
  if (state.touchPointsById.size === 2) {
    startPinch(state, deps, pointer.id);
    return;
  }
  if (state.touchPointsById.size > 2) {
    return;
  }
  syncHoveredCellFromPointer(deps, pointer);
  state.activeTouchGesture = {
    pointerId: pointer.id,
    startedAtMs: deps.nowMs(),
    start: screen,
    last: screen,
    soldByLongPress: false,
    isCameraGesture: false,
  };
}

function startPinch(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pointerId: number,
): void {
  const points = Array.from(state.touchPointsById.entries());
  const first = points.find(([id]) => id !== pointerId);
  const second = state.touchPointsById.get(pointerId);
  if (!first || !second) {
    return;
  }

  const sample = measurePinch(first[1], second);
  state.activePinch = {
    firstPointerId: first[0],
    secondPointerId: pointerId,
    startDistance: sample.distance,
    startZoomFactor: deps.getCameraZoomFactor(),
    lastCentre: sample.centre,
  };
  if (state.activeTouchGesture) {
    state.activeTouchGesture.isCameraGesture = true;
  }
}

function updatePinch(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pinch: InputPinchGesture,
): void {
  const first = state.touchPointsById.get(pinch.firstPointerId);
  const second = state.touchPointsById.get(pinch.secondPointerId);
  if (!first || !second) {
    return;
  }

  const sample = measurePinch(first, second);
  deps.setCameraZoomFactorAt(
    resolvePinchZoomFactor(pinch.startZoomFactor, pinch.startDistance, sample.distance),
    sample.centre,
  );
  deps.panCameraBy({
    x: sample.centre.x - pinch.lastCentre.x,
    y: sample.centre.y - pinch.lastCentre.y,
  });
  pinch.lastCentre = sample.centre;
}

export function handleTouchMove(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
  screen: ScreenPoint,
): void {
  if (state.touchPointsById.has(pointer.id)) {
    state.touchPointsById.set(pointer.id, screen);
  }
  if (state.activePinch) {
    updatePinch(state, deps, state.activePinch);
    return;
  }

  const gesture = state.activeTouchGesture;
  if (!gesture || gesture.pointerId !== pointer.id) {
    return;
  }

  const moveDistance = screenDistance(gesture.start, screen);
  if (
    !gesture.isCameraGesture &&
    deps.isCameraZoomed() &&
    moveDistance > config.panStartThresholdPx
  ) {
    gesture.isCameraGesture = true;
  }
  if (gesture.isCameraGesture) {
    deps.panCameraBy({ x: screen.x - gesture.last.x, y: screen.y - gesture.last.y });
    gesture.last = screen;
    return;
  }
  gesture.last = screen;

  syncHoveredCellFromPointer(deps, pointer);
  deps.updateBuildPreview();

  const durationMs = deps.nowMs() - gesture.startedAtMs;
  if (
    !gesture.soldByLongPress &&
    moveDistance <= config.touchTapMaxMovePx &&
    durationMs >= config.touchLongPressMinDurationMs
  ) {
    deps.trySellTowerAtHoveredCell();
    gesture.soldByLongPress = true;
  }
}

export function handleTouchUp(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
  screen: ScreenPoint,
): void {
  state.touchPointsById.delete(pointer.id);
  const pinch = state.activePinch;
  if (pinch) {
    if (pinch.firstPointerId === pointer.id || pinch.secondPointerId === pointer.id) {
      // The remaining finger needs a fresh press to tap or pan again.
      state.activePinch = null;
      state.activeTouchGesture = null;
    }
    return;
  }

  const gesture = state.activeTouchGesture;
  if (!gesture || gesture.pointerId !== pointer.id) {
    return;
  }
  state.activeTouchGesture = null;
  if (gesture.isCameraGesture || gesture.soldByLongPress) {
    return;
  }

  const durationMs = deps.nowMs() - gesture.startedAtMs;
  if (isTapGesture(durationMs, screenDistance(gesture.start, screen), config)) {
    dispatchBoardTap(state, deps, config, pointer, screen);
  }
}
