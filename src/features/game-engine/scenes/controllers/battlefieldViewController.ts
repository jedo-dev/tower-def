import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { GameEventMap } from '../../../../shared/lib/game-bridge/types';
import { setBattlefieldRenderStateVisible } from '../../runtime/battlefield/battlefieldRenderState';
import { rebuildOpponentBattlefieldRenderState } from '../../runtime/battlefield/battlefieldSpriteFactory';
import { syncCreepListAdornments } from '../../runtime/creep/creepAdornments';
import { getPlayerPathRoute, showPathRoute } from './boardRenderController';
import type { GameSceneState } from './gameSceneState';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import type { GameSceneCore } from './sceneQueries';

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
