import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { GameEventMap } from '../../../../shared/lib/game-bridge/types';
import { setBattlefieldRenderStateVisible } from '../../runtime/battlefield/battlefieldRenderState';
import { rebuildOpponentBattlefieldRenderState } from '../../runtime/battlefield/battlefieldSpriteFactory';
import { syncSideScenery } from '../../runtime/battlefield/sideScenery';
import type { SideSceneryBoardSize } from '../../runtime/battlefield/sideSceneryLayout';
import { syncCreepListAdornments } from '../../runtime/creep/creepAdornments';
import { GRID_PIXEL_HEIGHT, GRID_PIXEL_WIDTH, TERRAIN_RENDER_DEPTH } from '../gameScene.constants';
import { getPlayerPathRoute, showPathRoute } from './boardRenderController';
import type { GameSceneState } from './gameSceneState';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { getVisibleBuilderFactionId, type GameSceneCore } from './sceneQueries';

const SIDE_SCENERY_BOARD_SIZE: SideSceneryBoardSize = {
  width: GRID_PIXEL_WIDTH,
  height: GRID_PIXEL_HEIGHT,
};
/** Under the ground tiles, so the strips' grid overlap stays hidden. */
const SIDE_SCENERY_RENDER_DEPTH = TERRAIN_RENDER_DEPTH - 10;

export function applyBattlefieldViewVisibility(state: GameSceneState): void {
  const showOpponent = state.activeBattlefieldView === 'opponent';
  setBattlefieldRenderStateVisible(state.playerField, !showOpponent);
  setBattlefieldRenderStateVisible(state.opponentField, showOpponent);
  // Last pass of the frame: adornments follow the moved, now visible or hidden sprites.
  syncCreepListAdornments(state.playerField.creeps);
  syncCreepListAdornments(state.opponentField.creeps);
}

export function syncOpponentBattlefieldRenderStateFromDuel({ scene, state }: GameSceneCore): void {
  rebuildOpponentBattlefieldRenderState(
    scene,
    state.opponentField,
    state.duelMatchState.opponent,
    state.activeBattlefieldView === 'opponent',
  );
}

/**
 * Mirrors the opponent Phaser render state back into the duel match state,
 * so round resolution and computer decisions observe up-to-date creeps.
 */
export function syncOpponentDuelCreepsFromField(state: GameSceneState): void {
  state.duelMatchState = {
    ...state.duelMatchState,
    opponent: {
      ...state.duelMatchState.opponent,
      battlefield: {
        ...state.duelMatchState.opponent.battlefield,
        creeps: state.opponentField.creeps.map((creep) => ({ ...creep.entity })),
      },
    },
  };
}

export function renderVisibleBattlefield(core: GameSceneCore): void {
  const { state } = core;
  const showOpponent = state.activeBattlefieldView === 'opponent';
  // The opponent field is built once per wave; rebuilding it on every view
  // toggle would drop escaped creeps (losing their leak damage) and reset
  // tower cooldowns, granting a free volley per toggle.
  if (
    showOpponent &&
    state.opponentField.creeps.length === 0 &&
    state.opponentField.towers.length === 0
  ) {
    syncOpponentBattlefieldRenderStateFromDuel(core);
  }

  applyBattlefieldViewVisibility(state);

  const visiblePath = showOpponent
    ? state.duelMatchState.opponent.battlefield.routes.small
    : getPlayerPathRoute(state);
  if (!showOpponent) state.arePathTilesStale = false;
  showPathRoute(core, visiblePath);
  syncVisibleSideScenery(core);
}

/** Frames the board with the side scenery of the field in view (tower-def-jsl). */
export function syncVisibleSideScenery({ scene, state }: GameSceneCore): void {
  syncSideScenery(scene, state.sideScenery, {
    raceId: getVisibleBuilderFactionId(state),
    board: SIDE_SCENERY_BOARD_SIZE,
    depth: SIDE_SCENERY_RENDER_DEPTH,
  });
}

export function handleBattlefieldViewChanged(
  core: GameSceneCore,
  payload: GameEventMap['battlefield-view-changed'],
): void {
  if (!payload.accepted) {
    return;
  }

  core.state.activeBattlefieldView = payload.activeView;
  if (payload.activeView !== 'player') {
    // The opponent view is read-only: close the player's tower actions.
    publishGameEvent('selected-tower', { tower: null });
    core.state.pendingPlacementAnchor = null;
  }
  renderVisibleBattlefield(core);
  publishHudSnapshot(core.state);
}
