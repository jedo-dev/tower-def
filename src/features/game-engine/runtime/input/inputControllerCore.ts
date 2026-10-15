import type Phaser from 'phaser';
import type { ScreenPoint, WorldPoint } from '../camera/cameraViewMapping';
import type { PointerGridTarget } from '../grid/gameSceneGridPreviewRuntime';
import { isDoubleTap, type TapRecord } from './boardGestures';

export type InputTouchGesture = {
  pointerId: number;
  startedAtMs: number;
  start: ScreenPoint;
  last: ScreenPoint;
  soldByLongPress: boolean;
  /** Became a pan or joined a pinch: lifting the finger is not a tap. */
  isCameraGesture: boolean;
};

export type InputPinchGesture = {
  firstPointerId: number;
  secondPointerId: number;
  startDistance: number;
  startZoomFactor: number;
  lastCentre: ScreenPoint;
};

export type InputMouseDrag = {
  start: ScreenPoint;
  last: ScreenPoint;
  isPanning: boolean;
  /** Left button held zoomed in or with the pan modifier: the click lands on release unless it panned. */
  placesOnRelease: boolean;
};

export type InputControllerState = {
  activeTouchGesture: InputTouchGesture | null;
  activePinch: InputPinchGesture | null;
  activeMouseDrag: InputMouseDrag | null;
  /** Live touch points by pointer id, so a second finger can start a pinch. */
  touchPointsById: Map<number, ScreenPoint>;
  /** The last tap that reached the board, for double-tap zoom reset. */
  lastBoardTap: TapRecord | null;
  lastActionAtMs: number;
};

export type InputControllerConfig = {
  actionCooldownMs: number;
  touchTapMinDurationMs: number;
  touchTapMaxDurationMs: number;
  touchTapMaxMovePx: number;
  touchLongPressMinDurationMs: number;
  panStartThresholdPx: number;
  doubleTapMaxIntervalMs: number;
  doubleTapMaxMovePx: number;
  wheelZoomSensitivity: number;
};

/**
 * What a tap did once it reached the board. Only a plain board tap (nothing
 * selected, nothing built) can pair up into the double-tap zoom reset.
 */
export type BoardTapOutcome = 'selected-tower' | 'build-tap' | 'board-tap';

export type InputControllerDependencies = {
  nowMs: () => number;
  /** Canvas position of the pointer, re-based onto the live canvas offset. */
  toPointerScreenPoint: (pointer: Phaser.Input.Pointer) => ScreenPoint;
  /** World position under the pointer on screen now (camera and canvas aware). */
  toPointerWorldPoint: (pointer: Phaser.Input.Pointer) => WorldPoint;
  toPointerTarget: (worldX: number, worldY: number) => PointerGridTarget | null;
  setHoveredTarget: (target: PointerGridTarget | null) => void;
  clearHoveredCell: () => void;
  updateHoveredCellDebugRegistry: () => void;
  updateBuildPreview: () => void;
  /** A tap or click that reached the board; the scene selects, builds or arms a build. */
  onBoardTap: (pointer: Phaser.Input.Pointer) => BoardTapOutcome;
  trySellTowerAtHoveredCell: () => void;
  isCameraZoomed: () => boolean;
  getCameraZoomFactor: () => number;
  setCameraZoomFactorAt: (factor: number, focus: ScreenPoint) => void;
  zoomCameraByAt: (multiplier: number, focus: ScreenPoint) => void;
  panCameraBy: (dragDelta: ScreenPoint) => void;
  resetCameraZoom: () => void;
  /** Shift held: a left-button drag pans even at fit zoom. */
  hasPanModifier: (pointer: Phaser.Input.Pointer) => boolean;
};

export function createInputControllerState(): InputControllerState {
  return {
    activeTouchGesture: null,
    activePinch: null,
    activeMouseDrag: null,
    touchPointsById: new Map(),
    lastBoardTap: null,
    lastActionAtMs: Number.NEGATIVE_INFINITY,
  };
}

export function canProcessUserAction(
  state: InputControllerState,
  nowMs: number,
  cooldownMs: number,
): boolean {
  return nowMs - state.lastActionAtMs >= cooldownMs;
}

export function markUserActionProcessed(state: InputControllerState, nowMs: number): void {
  state.lastActionAtMs = nowMs;
}

/**
 * A plain touch tap emits no pointermove, so the hovered cell would stay stale
 * (or null) and the tap would land on the previous cell. Resync it from the
 * pointer before any down/up action.
 */
export function syncHoveredCellFromPointer(
  deps: InputControllerDependencies,
  pointer: Phaser.Input.Pointer,
): WorldPoint {
  const worldPoint = deps.toPointerWorldPoint(pointer);
  deps.setHoveredTarget(deps.toPointerTarget(worldPoint.x, worldPoint.y));
  deps.updateHoveredCellDebugRegistry();
  return worldPoint;
}

/** Routes a tap to the board; two quick board taps reset the zoom. */
export function dispatchBoardTap(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
  screen: ScreenPoint,
): void {
  const outcome = deps.onBoardTap(pointer);
  if (outcome !== 'board-tap') {
    state.lastBoardTap = null;
    return;
  }

  const tap: TapRecord = { atMs: deps.nowMs(), x: screen.x, y: screen.y };
  if (isDoubleTap(state.lastBoardTap, tap, config)) {
    state.lastBoardTap = null;
    deps.resetCameraZoom();
    return;
  }
  state.lastBoardTap = tap;
}
