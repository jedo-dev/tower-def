// Only the lazy entry is public: importing `GamePage` directly would pull the
// Phaser engine into whichever chunk imports it.
export { LazyGamePage } from './LazyGamePage';
export { resetGamePageLoad } from './gamePageChunk';
export type { GamePageProps } from './GamePage';
