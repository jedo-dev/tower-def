import type Phaser from 'phaser';
import type { SoundId } from '../../../shared/lib/sound-registry/audio.types';
import {
  PENDING_SOUND_ASSETS,
  resolveSoundClipUrl,
  SOUND_ASSET_PATHS,
} from '../../../shared/lib/sound-registry/audio.constants';
import type { AudioClipCache, AudioClipDecoder } from '../../../shared/lib/audio/audioClipCache';
import { logDevWarning } from '../../../shared/lib/logging/devLog';

export type GameAudioClipPreloadOptions = {
  scene: Phaser.Scene;
  clipCache: AudioClipCache;
  /** False once the owning game is torn down; late clips are then dropped. */
  isActive: () => boolean;
  getAudioKey: (soundId: SoundId) => string;
};

/**
 * The Web Audio manager's decoder, or null when the game fell back to HTML5
 * audio (or no audio), whose clips only Phaser's own loader can prepare.
 */
export function resolveWebAudioDecoder(soundManager: unknown): AudioClipDecoder | null {
  const context = (soundManager as { context?: BaseAudioContext } | null)?.context;
  if (!context || typeof context.decodeAudioData !== 'function') {
    return null;
  }
  return (bytes) => context.decodeAudioData(bytes);
}

/**
 * Prepares every clip that has a file. Each id owns its file, so keys never
 * collide. With Web Audio, clips come from the session clip cache: each file
 * is fetched and decoded once per session and shared by every game instance
 * (a StrictMode remount, a restarted match), instead of each game's loader
 * downloading the whole set again. A clip still decoding is simply silent.
 */
export function preloadGameAudioClips(options: GameAudioClipPreloadOptions): void {
  const { scene, clipCache, isActive, getAudioKey } = options;
  const decode = resolveWebAudioDecoder(scene.sound);

  (Object.keys(SOUND_ASSET_PATHS) as SoundId[]).forEach((soundId) => {
    if (PENDING_SOUND_ASSETS.includes(soundId)) {
      return;
    }
    const key = getAudioKey(soundId);
    if (scene.cache.audio.exists(key)) {
      return;
    }
    const url = resolveSoundClipUrl(soundId);
    if (!decode) {
      scene.load.audio(key, [url]);
      return;
    }
    clipCache.decodeClip(url, decode).then(
      (buffer) => {
        if (isActive() && !scene.cache.audio.exists(key)) {
          scene.cache.audio.add(key, buffer);
        }
      },
      (error: unknown) => logDevWarning('audio', `Sound clip failed to load: ${url}`, error),
    );
  });
}
