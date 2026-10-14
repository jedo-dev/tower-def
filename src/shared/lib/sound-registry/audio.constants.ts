import type { SoundClipDefinition, SoundId, SoundPlaybackConfig } from './audio.types';
import { isAudioAssetPlayable } from './audioFormatSupport';
import { COMBAT_SOUND_CLIPS } from './registry/combatSounds';
import {
  AMBIENT_SOUND_CLIPS,
  ECONOMY_SOUND_CLIPS,
  SYSTEM_SOUND_CLIPS,
} from './registry/feedbackSounds';
import { UI_SOUND_CLIPS } from './registry/uiSounds';

export { EFFECT_APPLY_SOUND_COOLDOWN_MS } from './registry/combatSounds';
export { SFX_ASSET_ROOT } from './registry/defineClip';

/**
 * Every playable clip. One id, one file: which tower or creature plays which
 * clip is decided by the sound profiles in `src/content/audio`, never here.
 */
export const SOUND_CLIPS: Record<SoundId, SoundClipDefinition> = {
  ...UI_SOUND_CLIPS,
  ...SYSTEM_SOUND_CLIPS,
  ...ECONOMY_SOUND_CLIPS,
  ...COMBAT_SOUND_CLIPS,
  ...AMBIENT_SOUND_CLIPS,
};

export const SOUND_REGISTRY: Record<SoundId, SoundPlaybackConfig> = SOUND_CLIPS;

export const SOUND_ASSET_PATHS: Record<SoundId, string> = Object.fromEntries(
  Object.entries(SOUND_CLIPS).map(([soundId, clip]) => [soundId, clip.assetPath]),
) as Record<SoundId, string>;

/**
 * Absolute URL a clip is fetched from. Every player (menu and game) resolves
 * clips through here, so the session clip cache sees one key per file. A clip
 * with a fallback container is served from it when the browser cannot play
 * the primary one (Safari and iOS have no OGG Vorbis).
 */
export function resolveSoundClipUrl(
  soundId: SoundId,
  isPlayable: (assetPath: string) => boolean = isAudioAssetPlayable,
): string {
  const { assetPath, fallbackAssetPath } = SOUND_CLIPS[soundId];
  const chosen = fallbackAssetPath && !isPlayable(assetPath) ? fallbackAssetPath : assetPath;
  return `/${chosen}`;
}

/**
 * Sounds whose files are not authored yet. The preloader skips them, so a
 * pending asset stays silent instead of failing a request every session.
 * Remove an id from this list the moment its file lands.
 */
export const PENDING_SOUND_ASSETS: readonly SoundId[] = [];

export const AUDIO_CONSTANTS = {
  MAX_SIMULTANEOUS_SOUNDS: 12,
  MAX_SIMULTANEOUS_SAME_CATEGORY: 6,
  DEFAULT_MASTER_VOLUME: 0.7,
  MOBILE_UNLOCK_DEBOUNCE_MS: 500,
  CLEANUP_CHECK_INTERVAL_MS: 500,
  POOL_SIZE: 8,
} as const;
