import type { SfxRecipe } from '../sfxRecipe.types';
import { COMBAT_RECIPES } from './combatRecipes';
import { ECONOMY_RECIPES, SYSTEM_RECIPES } from './feedbackRecipes';
import { ELF_RECIPES, HUMAN_RECIPES } from './humanElfRecipes';
import type { GeneratedSoundId } from './recipeGroups';
import { UI_RECIPES } from './uiRecipes';
import { ORC_RECIPES, UNDEAD_RECIPES } from './undeadOrcRecipes';

export type { GeneratedSoundId } from './recipeGroups';

/**
 * One recipe per generated clip. The type requires every non-ambient sound id,
 * so registering a clip without a recipe does not compile.
 */
export const SFX_RECIPES: Record<GeneratedSoundId, SfxRecipe> = {
  ...UI_RECIPES,
  ...SYSTEM_RECIPES,
  ...ECONOMY_RECIPES,
  ...COMBAT_RECIPES,
  ...UNDEAD_RECIPES,
  ...ORC_RECIPES,
  ...HUMAN_RECIPES,
  ...ELF_RECIPES,
};

export const GENERATED_SOUND_IDS = Object.keys(SFX_RECIPES) as GeneratedSoundId[];
