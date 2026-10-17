import { createGameSoundRouter, type GameSoundRouter } from '../../runtime/audio/gameSoundRouting';
import { recordSentCreepDeath } from '../../runtime/duel/sentCreepOutcomeTally';
import type { GameSceneWiringHost } from '../gameSceneRuntimeWiring';
import { syncOpponentDuelCreepsFromField } from './battlefieldViewController';
import { refreshBuildState } from './boardRenderController';
import type { GameSceneContext } from './gameSceneContext';
import type { GameSceneState } from './gameSceneState';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { handleGameOverUpdated } from './sceneAudio';
import { getComputerSendWaveUnits } from './sceneQueries';

/** Tower and creature sounds, resolved through the race sound profiles. */
export function createSceneSoundRouter(state: GameSceneState): GameSoundRouter {
  return createGameSoundRouter(
    (soundId) => state.soundManager?.play(soundId),
    () => state.selectedBuilderFactionId,
  );
}

/** The scene surface the wave, movement, combat and duel runtime wiring calls. */
export function createWiringHost(context: GameSceneContext): GameSceneWiringHost {
  const { scene, state } = context;
  return {
    scene,
    runState: state.runState,
    playerField: state.playerField,
    opponentField: state.opponentField,
    creepAdornmentPool: state.creepAdornmentPool,
    floatingLabelPool: state.floatingLabelPool,
    getSoundManager: () => state.soundManager,
    soundRouter: context.soundRouter,
    getDuelMatchState: () => state.duelMatchState,
    setDuelMatchState: (nextState) => {
      state.duelMatchState = nextState;
    },
    getComputerSendWaveUnits: () => getComputerSendWaveUnits(state),
    gameNowMs: () => state.gameClock.nowMs,
    refreshBuildState: () => refreshBuildState(context),
    publishHudSnapshot: () => publishHudSnapshot(state),
    handleGameOverUpdated: (isGameOver) => handleGameOverUpdated(context, isGameOver),
    syncOpponentDuelCreepsFromField: () => syncOpponentDuelCreepsFromField(state),
    recordSentCreepDeath: (field, creep) =>
      recordSentCreepDeath(state.sentCreepDeaths, field, creep),
  };
}
