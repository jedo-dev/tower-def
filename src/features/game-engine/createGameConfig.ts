import Phaser from 'phaser';
import {
  bindCanvasResolutionToGame,
  measureCanvasResolution,
} from './runtime/camera/canvasResolutionRuntime';
import { GameScene } from './scenes/GameScene';

export function createGameConfig(container: HTMLDivElement): Phaser.Types.Core.GameConfig {
  // Booted at its final backing size, so the first frame is already sharp.
  const initialResolution = measureCanvasResolution(container);

  return {
    type: Phaser.AUTO,
    parent: container,
    width: initialResolution.backingWidth,
    height: initialResolution.backingHeight,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    backgroundColor: '#1a1f2c',
    scene: [GameScene],
    scale: {
      // Single scaling pipeline: the canvas resolution runtime sizes the
      // backing store to CSS size x device pixel ratio (Phaser 4 has no
      // resolution option, and RESIZE mode would pin it to the CSS size);
      // registerResponsiveCamera re-fits the world zoom on each RESIZE event.
      mode: Phaser.Scale.NONE,
    },
    callbacks: {
      postBoot: (game) => bindCanvasResolutionToGame(game, container),
    },
  };
}
