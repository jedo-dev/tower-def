import { createRetryableLazy } from '../../shared/lib/lazy-component/createRetryableLazy';
import type { GamePageProps } from './GamePage';

/**
 * The game screen in its own chunk: the Phaser engine and the battlefield UI
 * download only when a match starts, so the menus load without them.
 */
export const gamePageChunk = createRetryableLazy<GamePageProps>(() =>
  import('./GamePage').then((module) => module.GamePage),
);

/**
 * A failed download throws to the surrounding Error Boundary; its recover
 * action calls this so starting a match again retries the download.
 */
export const resetGamePageLoad: () => void = gamePageChunk.resetFailedLoad;
