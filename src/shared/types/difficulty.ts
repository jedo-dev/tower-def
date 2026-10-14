/**
 * Difficulty ids are chosen on the setup screen and carried through the game
 * bridge, so they live in `shared`; `entities/difficulty` re-exports this enum
 * and owns the display config built on it.
 */
export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  NIGHTMARE = 'NIGHTMARE',
}
