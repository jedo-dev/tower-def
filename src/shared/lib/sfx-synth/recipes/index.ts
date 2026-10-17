import type { SoundGroupId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { COMBAT_RECIPES } from './combatRecipes';
import { ELF_RECIPES } from './elfRecipes';
import { ECONOMY_RECIPES, SYSTEM_RECIPES } from './feedbackRecipes';
import { HUMAN_RECIPES } from './humanRecipes';
import { ORC_RECIPES } from './orcRecipes';
import type { GeneratedSoundId } from './recipeGroups';
import { UI_RECIPES } from './uiRecipes';
import { UNDEAD_RECIPES } from './undeadRecipes';

export type { GeneratedSoundId } from './recipeGroups';

/**
 * Recipes per authoring group: the race-neutral core and one file per race,
 * so `npm run gen:sfx -- --race <group>` renders one group alone.
 */
export const SFX_RECIPES_BY_GROUP: Record<
  SoundGroupId,
  Readonly<Partial<Record<GeneratedSoundId, SfxRecipe>>>
> = {
  core: { ...UI_RECIPES, ...SYSTEM_RECIPES, ...ECONOMY_RECIPES, ...COMBAT_RECIPES },
  undead: UNDEAD_RECIPES,
  orc: ORC_RECIPES,
  human: HUMAN_RECIPES,
  elf: ELF_RECIPES,
};

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

/** The generated ids of one group, in recipe order. */
export function getGeneratedSoundIdsOfGroup(group: SoundGroupId): GeneratedSoundId[] {
  return Object.keys(SFX_RECIPES_BY_GROUP[group]) as GeneratedSoundId[];
}
