import type { SoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';

/** Every clip except the two authored ambience loops is generated. */
export type GeneratedSoundId = Exclude<SoundId, `ambient.${string}`>;

export type RaceSoundSuffix = 'undead' | 'orc' | 'human' | 'elf';

/** Recipes for one id family, race-specific ids excluded (e.g. every `ui.*`). */
export type SfxRecipeGroup<TPrefix extends string> = Record<
  Exclude<Extract<GeneratedSoundId, `${TPrefix}.${string}`>, `${string}.${RaceSoundSuffix}`>,
  SfxRecipe
>;

/** Recipes for one race's timbre set (e.g. every `*.orc` id). */
export type RaceSfxRecipeGroup<TRace extends RaceSoundSuffix> = Record<
  Extract<GeneratedSoundId, `${string}.${TRace}`>,
  SfxRecipe
>;
