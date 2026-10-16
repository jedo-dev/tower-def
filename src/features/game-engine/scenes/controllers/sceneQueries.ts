import type Phaser from 'phaser';
import { resolveQueuedSendUnits } from '../../../../entities/duel-match';
import type { UnitConfig } from '../../../../entities/unit';
import { getControlSettings } from '../../../../shared/lib/control-settings/controlSettingsStore';
import { RaceId, UnitMoveType } from '../../../../shared/types/content-ids';
import type { GridCell } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { canPerformBuildActions as canPerformBuildActionsByPhase } from '../../../wave-phase';
import { resolvePreviewAnchor } from '../../runtime/build/placementConfirmation';
import {
  createBoardCameraState,
  type BoardCameraState,
} from '../../runtime/camera/gameSceneCameraRuntime';
import { mapHudFactionToRaceId, resolveFactionUnits } from '../gameScene.helpers';
import type { GameSceneState } from './gameSceneState';

/** The scene plus its state: what every scene controller is handed. */
export type GameSceneCore = {
  readonly scene: Phaser.Scene;
  readonly state: GameSceneState;
};

export function canPerformBuildActions(state: GameSceneState): boolean {
  if (state.runState.isGameOver) {
    return false;
  }

  if (state.activeBattlefieldView !== 'player') {
    return false;
  }

  return canPerformBuildActionsByPhase(state.runState.wavePhaseState);
}

export function isMatchOver(state: GameSceneState): boolean {
  return state.runState.isGameOver || state.matchOutcomeStatus !== 'active';
}

/** The enemy faction chosen at setup: the roster the baseline wave rolls from. */
export function getBaselineRaceId(state: GameSceneState): RaceId {
  return mapHudFactionToRaceId(state.selectedFaction);
}

export function getSelectedFactionUnits(state: GameSceneState): UnitConfig[] {
  return resolveFactionUnits(getBaselineRaceId(state));
}

/** The baseline waves and the computer's sends both draw from the enemy roster. */
export function doesFacedRosterHaveAirCreeps(state: GameSceneState): boolean {
  return getSelectedFactionUnits(state).some((unit) => unit.moveType === UnitMoveType.AIR);
}

export function getComputerSendWaveUnits(state: GameSceneState): UnitConfig[] {
  return resolveQueuedSendUnits(state.duelMatchState.opponent);
}

export function getVisibleBuilderFactionId(state: GameSceneState): RaceId {
  return state.activeBattlefieldView === 'opponent'
    ? state.duelMatchState.opponent.raceId
    : state.selectedBuilderFactionId;
}

/**
 * Cells of the field currently on screen. The two grids share their size and
 * endpoints, so the same tile positions describe either one; what differs is
 * which cells are walled off. Drawing the player's occupancy under the
 * opponent's towers made the enemy field unreadable: its towers sat on bare
 * ground while the player's own tower bases showed through.
 */
export function getVisibleGridCells(state: GameSceneState): readonly GridCell[] {
  if (state.activeBattlefieldView === 'opponent') {
    return state.duelMatchState.opponent.battlefield.grid.cells;
  }

  return state.gridModel?.cells ?? [];
}

export function confirmsTouchPlacement(state: GameSceneState): boolean {
  return state.isLastPointerTouch && getControlSettings().confirmPlacementWithSecondTap;
}

/** The block the preview shows: the armed one on touch, else the hovered one. */
export function getPreviewAnchor(state: GameSceneState): GridPosition | null {
  return resolvePreviewAnchor({
    pendingAnchor: state.pendingPlacementAnchor,
    hoveredAnchor: state.hoveredBuildAnchor,
    confirmsTouchPlacement: confirmsTouchPlacement(state),
  });
}

export function getBoardCamera({ scene, state }: GameSceneCore): BoardCameraState {
  if (!state.boardCamera) {
    state.boardCamera = createBoardCameraState(scene);
  }
  return state.boardCamera;
}

export function syncDuelPlayerGoldFromWallet(state: GameSceneState): void {
  const playerGold = state.runState.playerGold;
  if (state.duelMatchState.player.gold === playerGold) {
    return;
  }
  state.duelMatchState = {
    ...state.duelMatchState,
    player: { ...state.duelMatchState.player, gold: playerGold },
  };
}

/** The scene wallet and its registry mirror move together. */
export function setPlayerGold({ scene, state }: GameSceneCore, nextGold: number): void {
  state.runState.playerGold = nextGold;
  scene.registry.set('economy.gold', nextGold);
}
