import { BuilderFaction, DEFAULT_BUILDER_FACTION } from '../../../entities/builder-faction';
import { Difficulty, DEFAULT_DIFFICULTY } from '../../../entities/difficulty';
import { EnemyFaction, DEFAULT_ENEMY_FACTION } from '../../../entities/enemy-faction';

/** The wizard picks a player makes once and expects to find again. */
export type SetupSelection = {
  builderRace: BuilderFaction;
  enemyFaction: EnemyFaction;
  difficulty: Difficulty;
};

const DEFAULT_SETUP_SELECTION: SetupSelection = {
  builderRace: DEFAULT_BUILDER_FACTION,
  enemyFaction: DEFAULT_ENEMY_FACTION,
  difficulty: DEFAULT_DIFFICULTY,
};

/**
 * Session memory only: a module variable survives leaving and re-opening
 * the wizard (and a finished match), and resets on reload. Persisting picks
 * across sessions belongs to the save system, which is out of MVP scope.
 */
let rememberedSelection: SetupSelection = DEFAULT_SETUP_SELECTION;

export function readSetupSelection(): SetupSelection {
  return rememberedSelection;
}

export function rememberSetupSelection(change: Partial<SetupSelection>): void {
  rememberedSelection = { ...rememberedSelection, ...change };
}

/** Test seam: forget the picks so each case starts from the defaults. */
export function resetSetupSelectionMemory(): void {
  rememberedSelection = DEFAULT_SETUP_SELECTION;
}
