import {
  DEFAULT_SOUND_CONFIG,
  type SoundCategory,
  type SoundClipDefinition,
  type SoundId,
  type SoundPlaybackConfig,
} from '../audio.types';

/** Root of every generated or authored sound effect, relative to `public/`. */
export const SFX_ASSET_ROOT = 'assets/audio/sfx';

/** Clips of one id family, e.g. every `ui.*` id. */
export type SoundClipGroup<TPrefix extends string> = Record<
  Extract<SoundId, `${TPrefix}.${string}`>,
  SoundClipDefinition
>;

/**
 * Declares one clip. `file` is relative to `SFX_ASSET_ROOT`, e.g.
 * `ui/ui_click_01.wav`; everything not overridden keeps the default config.
 */
export function defineClip(
  file: string,
  category: SoundCategory,
  overrides: Partial<SoundPlaybackConfig> = {},
): SoundClipDefinition {
  return {
    ...DEFAULT_SOUND_CONFIG,
    ...overrides,
    category,
    assetPath: `${SFX_ASSET_ROOT}/${file}`,
  };
}
