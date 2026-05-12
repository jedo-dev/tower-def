import type Phaser from 'phaser';
import type { GridPosition } from '../../../../types/pathfinding';

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
  toGridCell: (worldX: number, worldY: number) => GridPosition | null;
  setHoveredCell: (cell: GridPosition | null) => void;
  clearHoveredCell: () => void;
  updateHoveredCellDebugRegistry: () => void;
  updateBuildPreview: () => void;
  tryPlaceTowerAtHoveredCell: () => void;
  trySellTowerAtHoveredCell: () => void;
};

export function canProcessUserAction(state: InputControllerState, nowMs: number, cooldownMs: number): boolean {
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
  deps.setHoveredCell(deps.toGridCell(pointer.worldX, pointer.worldY));
  deps.updateHoveredCellDebugRegistry();
  deps.updateBuildPreview();

  if (!pointer.primaryDown || !pointer.wasTouch || !state.activeTouchGesture) {
    return;
  }

  const durationMs = deps.nowMs() - state.activeTouchGesture.startedAtMs;
  const moveDistance = Math.hypot(
    pointer.worldX - state.activeTouchGesture.startX,
    pointer.worldY - state.activeTouchGesture.startY,
  );
  const isStillPressingCell = moveDistance <= config.touchTapMaxMovePx;

  if (
    !state.activeTouchGesture.soldByLongPress
    && isStillPressingCell
    && durationMs >= config.touchLongPressMinDurationMs
  ) {
    deps.trySellTowerAtHoveredCell();
    state.activeTouchGesture.soldByLongPress = true;
  }
}

export function handlePointerDown(
  state: InputControllerState,
  deps: InputControllerDependencies,
  pointer: Phaser.Input.Pointer,
): void {
  if (pointer.wasTouch) {
    state.activeTouchGesture = {
      startedAtMs: deps.nowMs(),
      startX: pointer.worldX,
      startY: pointer.worldY,
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

  const durationMs = deps.nowMs() - state.activeTouchGesture.startedAtMs;
  const moveDistance = Math.hypot(
    pointer.worldX - state.activeTouchGesture.startX,
    pointer.worldY - state.activeTouchGesture.startY,
  );
  const isTap =
    durationMs >= config.touchTapMinDurationMs
    && durationMs <= config.touchTapMaxDurationMs
    && moveDistance <= config.touchTapMaxMovePx;

  if (isTap && !state.activeTouchGesture.soldByLongPress) {
    deps.tryPlaceTowerAtHoveredCell();
  }

  state.activeTouchGesture = null;
}

export function handleGameOut(state: InputControllerState, deps: InputControllerDependencies): void {
  state.activeTouchGesture = null;
  deps.clearHoveredCell();
  deps.updateHoveredCellDebugRegistry();
  deps.updateBuildPreview();
}
