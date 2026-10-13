import type Phaser from 'phaser';
import type { WorldPoint } from '../camera/cameraViewMapping';
import type { PointerGridTarget } from '../grid/gameSceneGridPreviewRuntime';

export type InputTouchGesture = {
  startedAtMs: number;
  startX: number;
  startY: number;
  soldByLongPress: boolean;
};

export type InputControllerState = {
  activeTouchGesture: InputTouchGesture | null;
  lastActionAtMs: number;
};

export type InputControllerConfig = {
  actionCooldownMs: number;
  touchTapMinDurationMs: number;
  touchTapMaxDurationMs: number;
  touchTapMaxMovePx: number;
  touchLongPressMinDurationMs: number;
};

export type InputControllerDependencies = {
  nowMs: () => number;
  /** World position under the pointer on screen now (camera and canvas aware). */
  toPointerWorldPoint: (pointer: Phaser.Input.Pointer) => WorldPoint;
  toPointerTarget: (worldX: number, worldY: number) => PointerGridTarget | null;
  setHoveredTarget: (target: PointerGridTarget | null) => void;
  clearHoveredCell: () => void;
  updateHoveredCellDebugRegistry: () => void;
  updateBuildPreview: () => void;
  tryPlaceTowerAtHoveredCell: () => void;
  trySellTowerAtHoveredCell: () => void;
};

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

export function handlePointerMove(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
): void {
  const worldPoint = deps.toPointerWorldPoint(pointer);
  deps.setHoveredTarget(deps.toPointerTarget(worldPoint.x, worldPoint.y));
  deps.updateHoveredCellDebugRegistry();
  deps.updateBuildPreview();

  if (!pointer.primaryDown || !pointer.wasTouch || !state.activeTouchGesture) {
    return;
  }

  const durationMs = deps.nowMs() - state.activeTouchGesture.startedAtMs;
  const moveDistance = Math.hypot(
    worldPoint.x - state.activeTouchGesture.startX,
    worldPoint.y - state.activeTouchGesture.startY,
  );
  const isStillPressingCell = moveDistance <= config.touchTapMaxMovePx;

  if (
    !state.activeTouchGesture.soldByLongPress &&
    isStillPressingCell &&
    durationMs >= config.touchLongPressMinDurationMs
  ) {
    deps.trySellTowerAtHoveredCell();
    state.activeTouchGesture.soldByLongPress = true;
  }
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

export function handlePointerDown(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pointer: Phaser.Input.Pointer,
): void {
  const worldPoint = syncHoveredCellFromPointer(deps, pointer);
  if (pointer.wasTouch) {
    state.activeTouchGesture = {
      startedAtMs: deps.nowMs(),
      startX: worldPoint.x,
      startY: worldPoint.y,
      soldByLongPress: false,
    };
    return;
  }

  if (pointer.button === 0) {
    deps.tryPlaceTowerAtHoveredCell();
    return;
  }

  if (pointer.button === 2) {
    deps.trySellTowerAtHoveredCell();
  }
}

export function handlePointerUp(
  state: InputControllerState,
  deps: InputControllerDependencies,
  config: InputControllerConfig,
  pointer: Phaser.Input.Pointer,
): void {
  if (!pointer.wasTouch || !state.activeTouchGesture) {
    return;
  }

  const worldPoint = syncHoveredCellFromPointer(deps, pointer);
  const durationMs = deps.nowMs() - state.activeTouchGesture.startedAtMs;
  const moveDistance = Math.hypot(
    worldPoint.x - state.activeTouchGesture.startX,
    worldPoint.y - state.activeTouchGesture.startY,
  );
  const isTap =
    durationMs >= config.touchTapMinDurationMs &&
    durationMs <= config.touchTapMaxDurationMs &&
    moveDistance <= config.touchTapMaxMovePx;

  if (isTap && !state.activeTouchGesture.soldByLongPress) {
    deps.tryPlaceTowerAtHoveredCell();
  }

  state.activeTouchGesture = null;
}

export function handleGameOut(
  state: InputControllerState,
  deps: InputControllerDependencies,
): void {
  state.activeTouchGesture = null;
  deps.clearHoveredCell();
  deps.updateHoveredCellDebugRegistry();
  deps.updateBuildPreview();
}
