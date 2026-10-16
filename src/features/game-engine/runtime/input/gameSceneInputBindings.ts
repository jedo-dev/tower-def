import type Phaser from 'phaser';
import type { GameAudioManager } from '../../sound/GameAudioManager';

export type ScenePointerHandlers = {
  onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  onPointerUp: (pointer: Phaser.Input.Pointer) => void;
  /** Mouse wheel over the canvas; `deltaY` in pixels, positive away from the user. */
  onWheel: (pointer: Phaser.Input.Pointer, deltaY: number) => void;
  onGameOut: () => void;
};

type WheelListener = (
  pointer: Phaser.Input.Pointer,
  currentlyOver: unknown,
  deltaX: number,
  deltaY: number,
) => void;

/**
 * Wires pointer events to the scene handlers. Returns a teardown that removes
 * all listeners.
 */
export function registerScenePointerHandlers(
  scene: Phaser.Scene,
  handlers: ScenePointerHandlers,
): () => void {
  const onWheel: WheelListener = (pointer, _currentlyOver, _deltaX, deltaY) =>
    handlers.onWheel(pointer, deltaY);
  scene.input.on('pointermove', handlers.onPointerMove);
  scene.input.on('wheel', onWheel);
  scene.input.on('pointerdown', handlers.onPointerDown);
  scene.input.on('pointerup', handlers.onPointerUp);
  scene.input.on('gameout', handlers.onGameOut);
  return () => {
    scene.input.off('pointermove', handlers.onPointerMove);
    scene.input.off('wheel', onWheel);
    scene.input.off('pointerdown', handlers.onPointerDown);
    scene.input.off('pointerup', handlers.onPointerUp);
    scene.input.off('gameout', handlers.onGameOut);
  };
}

/**
 * Unlocks audio on the first pointer/keyboard interaction (mobile autoplay
 * policies) and keeps re-asserting the unlock on later pointer interactions.
 * Returns a teardown for the persistent pointer listener.
 */
export function registerSceneAudioUnlock(
  scene: Phaser.Scene,
  getSoundManager: () => GameAudioManager | null,
  ensureBaseAmbientPlaying: () => void,
): () => void {
  const unlockAudio = () => {
    getSoundManager()?.unlock();
    ensureBaseAmbientPlaying();
  };

  scene.input.once('pointerdown', unlockAudio);
  scene.input.keyboard?.once('keydown', unlockAudio);

  const handleInteraction = () => {
    const soundManager = getSoundManager();
    if (!soundManager) {
      return;
    }
    soundManager.unlock();
    ensureBaseAmbientPlaying();
  };

  scene.input.on('pointerdown', handleInteraction);
  return () => {
    scene.input.off('pointerdown', handleInteraction);
  };
}
