/**
 * Public surface of the Phaser engine slice. Only the game canvas widget
 * imports it; pulling it in statically drags the Phaser chunk along, so the
 * menus must never reach this barrel (see `app/menuBundle.node.test.ts`).
 */
export { createGameConfig } from './createGameConfig';
export { destroyGame } from './destroyGame';
