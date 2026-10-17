// Menu-side "listen" player: plays one registered clip on demand (e.g. the
// bestiary's sound buttons). Only one preview sounds at a time; a new press
// stops the previous clip and starts over, so repeated taps never stack.
// Clips come through the session clip cache, like every other menu sound,
// and honour the user's SFX volume and mute.

import { AUDIO_CONSTANTS, resolveSoundClipUrl, SOUND_CLIPS, type SoundId } from '../sound-registry';
import { logDevWarning } from '../logging/devLog';
import { getSfxUserScale } from './audioSettingsStore';
import { sessionAudioClipCache, type AudioClipCache } from './audioClipCache';

/** The subset of HTMLAudioElement a preview drives. */
export type PreviewAudioElement = {
  volume: number;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
};

export type SoundPreviewPlayer = {
  /** Stops any preview in progress and plays `soundId` once from the start. */
  play: (soundId: SoundId) => void;
  /** Silences the preview in progress, if any. */
  stop: () => void;
};

export type SoundPreviewDependencies = {
  cache: AudioClipCache;
  createAudio: (objectUrl: string) => PreviewAudioElement;
  /** The user's SFX scale: 0 while muted, 1 at the default slider. */
  getUserScale: () => number;
  resolveUrl: (soundId: SoundId) => string;
};

const DEFAULT_DEPENDENCIES: SoundPreviewDependencies = {
  cache: sessionAudioClipCache,
  createAudio: (objectUrl) => new Audio(objectUrl),
  getUserScale: getSfxUserScale,
  resolveUrl: (soundId) => resolveSoundClipUrl(soundId),
};

/** The volume the game plays `soundId` at, scaled by the user's SFX setting. */
export function previewVolume(soundId: SoundId, userScale: number): number {
  const volume = SOUND_CLIPS[soundId].volume * AUDIO_CONSTANTS.DEFAULT_MASTER_VOLUME * userScale;
  return Math.max(0, Math.min(1, volume));
}

export function createSoundPreviewPlayer(
  dependencies: SoundPreviewDependencies = DEFAULT_DEPENDENCIES,
): SoundPreviewPlayer {
  let current: PreviewAudioElement | null = null;
  // Each press takes a ticket; a clip that finishes loading after a newer
  // press (or a stop) is dropped instead of playing over it.
  let ticket = 0;

  const stop = (): void => {
    ticket += 1;
    if (current) {
      current.pause();
      current.currentTime = 0;
      current = null;
    }
  };

  const start = (soundId: SoundId, objectUrl: string, pressTicket: number): void => {
    if (pressTicket !== ticket) {
      return;
    }
    const volume = previewVolume(soundId, dependencies.getUserScale());
    if (volume <= 0) {
      return;
    }
    const audio = dependencies.createAudio(objectUrl);
    audio.volume = volume;
    current = audio;
    void audio.play().catch(() => undefined);
  };

  const play = (soundId: SoundId): void => {
    stop();
    if (!(soundId in SOUND_CLIPS) || dependencies.getUserScale() <= 0) {
      return;
    }
    const pressTicket = ticket;
    const url = dependencies.resolveUrl(soundId);
    const ready = dependencies.cache.peekObjectUrl(url);
    if (ready) {
      start(soundId, ready, pressTicket);
      return;
    }
    // The press itself is the user gesture, so the first listen loads the
    // clip and plays it as soon as it arrives.
    dependencies.cache.getObjectUrl(url).then(
      (objectUrl) => start(soundId, objectUrl, pressTicket),
      (error: unknown) => logDevWarning('audio', `Sound clip failed to load: ${url}`, error),
    );
  };

  return { play, stop };
}

/** The session's one preview player, shared by every menu screen. */
export const menuSoundPreview: SoundPreviewPlayer = createSoundPreviewPlayer();
