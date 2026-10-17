import type {
  CoreSoundId,
  ElfSoundId,
  HumanSoundId,
  OrcSoundId,
  RaceSoundGroupId,
  SoundId,
  UndeadSoundId,
} from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';

/** Every clip except the two authored ambience loops is generated. */
export type GeneratedSoundId = Exclude<SoundId, `ambient.${string}`>;

/** Generated race-neutral ids. */
export type CoreGeneratedSoundId = Exclude<CoreSoundId, `ambient.${string}`>;

/** Recipes for one core id family (e.g. every `ui.*`). */
export type SfxRecipeGroup<TPrefix extends string> = Record<
  Extract<CoreGeneratedSoundId, `${TPrefix}.${string}`>,
  SfxRecipe
>;

type RaceSoundIdByGroup = {
  undead: UndeadSoundId;
  orc: OrcSoundId;
  human: HumanSoundId;
  elf: ElfSoundId;
};

/** Recipes for every id of one race (`src/shared/types/sound-ids/<race>.ts`). */
export type RaceSfxRecipeGroup<TRace extends RaceSoundGroupId> = Record<
  RaceSoundIdByGroup[TRace],
  SfxRecipe
>;
