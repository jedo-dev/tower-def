export type DestroyableGame = {
  canvas: HTMLCanvasElement | null;
  destroy: (removeCanvas: boolean) => void;
};

/**
 * Tears a game down and detaches its canvas right away.
 *
 * `Phaser.Game.destroy` is deferred to the game's next step, and a game whose
 * loop has not started (or whose tab is hidden, so requestAnimationFrame is
 * paused) keeps its canvas in the host until then. A game created in the same
 * host meanwhile (React StrictMode remount, new setup) would sit below that
 * stale canvas and measure its bounds there, so pointer mapping and the
 * visible board drift apart. Detaching now keeps one canvas per host.
 */
export function destroyGame(game: DestroyableGame): void {
  game.destroy(true);
  game.canvas?.remove();
}
