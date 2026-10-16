import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import type { GameSceneState } from './gameSceneState';
import type { GameSceneCore } from './sceneQueries';

export function playSceneSound(state: GameSceneState, soundId: SoundId): void {
  state.soundManager?.play(soundId);
}

export function ensureBaseAmbientPlaying(state: GameSceneState): void {
  if (!state.soundManager?.isPlaying('ambient.map')) {
    state.soundManager?.play('ambient.map');
  }
}

/** Back to the calm map ambient: the build phase, game over and restarts. */
export function returnToBaseAmbient(state: GameSceneState): void {
  state.soundManager?.stopSound('ambient.tension');
  ensureBaseAmbientPlaying(state);
}

/** A wave is under way: the tension track layers over the map ambient. */
export function playWaveAmbient(state: GameSceneState): void {
  ensureBaseAmbientPlaying(state);
  if (!state.soundManager?.isPlaying('ambient.tension')) {
    state.soundManager?.play('ambient.tension');
  }
}

export function handleGameOverUpdated({ scene, state }: GameSceneCore, isGameOver: boolean): void {
  state.runState.isGameOver = isGameOver;
  scene.registry.set('phase.game.over', isGameOver);
  if (isGameOver) {
    returnToBaseAmbient(state);
  }
}
