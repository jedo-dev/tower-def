import { recordTowerBranchChoice } from '../../../../entities/duel-match';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import type { TowerCommandDeps } from '../../runtime/build/gameSceneTowerCommands';
import type { CreatureTalentCommandDeps } from '../../runtime/duel/creatureTalentCommands';
import type { SendCreepCommandDeps } from '../../runtime/duel/gameSceneSendCommand';
import { markRoutePreviewLayoutChanged } from '../../runtime/grid/buildRoutePreviewRuntime';
import {
  drawGridCell,
  redrawOccupancyOverlay,
  refreshBuildPhasePathTiles,
  updateBuildPreview,
} from './boardRenderController';
import {
  getBuildRuntimeDeps,
  getBuildRuntimeState,
  markUserActionProcessed,
} from './buildRuntimeAdapter';
import type { GameSceneContext } from './gameSceneContext';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import {
  canPerformBuildActions,
  isMatchOver,
  setPlayerGold,
  syncDuelPlayerGoldFromWallet,
  type GameSceneCore,
} from './sceneQueries';

/** Build, sell, upgrade and branch commands on the player's towers. */
export function createTowerCommandDeps(context: GameSceneContext): TowerCommandDeps {
  const { scene, state } = context;
  return {
    scene,
    playerField: state.playerField,
    getBuildRuntimeState: () => getBuildRuntimeState(state),
    getBuildRuntimeDeps: () => getBuildRuntimeDeps(context),
    isPlayerViewActive: () => state.activeBattlefieldView === 'player',
    canManageTowers: () => !state.runState.isGameOver && canPerformBuildActions(state),
    getHoveredCell: () => state.hoveredCell,
    getGridModel: () => state.gridModel,
    getBuilderFactionId: () => state.selectedBuilderFactionId,
    getPlayerGold: () => state.runState.playerGold,
    getTowerBranchChoices: () => state.duelMatchState.player.towerBranchChoices,
    onTowerBranchChosen: (buildableTowerId, branchId) => {
      state.duelMatchState = recordTowerBranchChoice(
        state.duelMatchState,
        'player',
        buildableTowerId,
        branchId,
      );
    },
    onGoldUpdated: (nextGold) => setPlayerGold(context, nextGold),
    onRefundRecorded: (refundAmount) => {
      scene.registry.set('economy.lastSellRefund', refundAmount);
    },
    playSound: (soundId: SoundId) => state.soundManager?.play(soundId),
    soundRouter: context.soundRouter,
    markUserActionProcessed: () => markUserActionProcessed(context),
    onHudChanged: () => publishHudSnapshot(state),
    drawGridCell: (cell) => {
      // Tower commands redraw exactly the cells whose occupancy they changed.
      markRoutePreviewLayoutChanged(state.routePreview);
      state.arePathTilesStale = true;
      drawGridCell(context, cell);
    },
    // Every build/sell ends here once its cells are redrawn: one path refresh
    // and one occupancy overlay redraw per command.
    updateBuildPreview: () => {
      redrawOccupancyOverlay(context);
      refreshBuildPhasePathTiles(context);
      updateBuildPreview(context);
    },
  };
}

export function createSendCreepCommandDeps(core: GameSceneCore): SendCreepCommandDeps {
  const { state } = core;
  return {
    syncDuelPlayerGoldFromWallet: () => syncDuelPlayerGoldFromWallet(state),
    getDuelMatchState: () => state.duelMatchState,
    setDuelMatchState: (nextState) => {
      state.duelMatchState = nextState;
    },
    isMatchOver: () => isMatchOver(state),
    canPerformBuildActions: () => canPerformBuildActions(state),
    getBuilderFactionId: () => state.selectedBuilderFactionId,
    onGoldUpdated: (nextGold) => setPlayerGold(core, nextGold),
    onHudChanged: () => publishHudSnapshot(state),
  };
}

export function createCreatureTalentCommandDeps(core: GameSceneCore): CreatureTalentCommandDeps {
  const { state } = core;
  return {
    getDuelMatchState: () => state.duelMatchState,
    setDuelMatchState: (nextState) => {
      state.duelMatchState = nextState;
    },
    isMatchOver: () => isMatchOver(state),
    getBuilderFactionId: () => state.selectedBuilderFactionId,
    playSound: (soundId: SoundId) => state.soundManager?.play(soundId),
    onHudChanged: () => publishHudSnapshot(state),
  };
}
