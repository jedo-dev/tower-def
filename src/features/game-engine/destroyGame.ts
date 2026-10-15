import { resetGameBridgeState } from '../../shared/lib/game-bridge/bridge';

export type DestroyableGame = {
  canvas: HTMLCanvasElement | null;
  destroy: (removeCanvas: boolean) => void;
};

/**
 * Tears a game down, detaches its canvas and forgets its bridge state right away.
 *
 * `Phaser.Game.destroy` is deferred to the game's next step, and a game whose
 * loop has not started (or whose tab is hidden, so requestAnimationFrame is
 * paused) keeps its canvas in the host until then. A game created in the same
 * host meanwhile (React StrictMode remount, new setup) would sit below that
 * stale canvas and measure its bounds there, so pointer mapping and the
 * visible board drift apart. Detaching now keeps one canvas per host.
 *
 * The bridge snapshot is reset for the same reason: until the new scene
 * publishes, the game page would otherwise render the old match's outcome
 * overlay, gold and battlefield view.
 */
export function destroyGame(game: DestroyableGame): void {
  game.destroy(true);
  game.canvas?.remove();
  resetGameBridgeState();
}
