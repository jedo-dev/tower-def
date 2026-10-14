// Menu-side audio players. They read clips through the session clip cache, so
// the menu and the Phaser game share one download per clip, and the ambient
// player is created once per session (a StrictMode remount reuses it instead
// of starting a second download).

import { logDevWarning } from '../logging/devLog';
import type { FadeableAudio } from './ambientFader';
import { sessionAudioClipCache, type AudioClipCache } from './audioClipCache';
import { createDeferredSourceAudio } from './deferredSourceAudio';

let menuAmbient: FadeableAudio | null = null;

function reportClipFailure(url: string) {
  return (error: unknown) => logDevWarning('audio', `Sound clip failed to load: ${url}`, error);
}

/** The looping menu ambient player; one per session. */
export function getMenuAmbientAudio(
  url: string,
  cache: AudioClipCache = sessionAudioClipCache,
): FadeableAudio {
  if (menuAmbient) {
    return menuAmbient;
  }
  const element = new Audio();
  element.loop = true;
  menuAmbient = createDeferredSourceAudio(element, cache.getObjectUrl(url), reportClipFailure(url));
  return menuAmbient;
}

/** Starts loading clips the menu is about to play, so the first play is instant. */
export function prefetchMenuClips(
  urls: readonly string[],
  cache: AudioClipCache = sessionAudioClipCache,
): void {
  urls.forEach((url) => {
    cache.getObjectUrl(url).catch(reportClipFailure(url));
  });
}

/**
 * Plays a one-shot clip if it is already cached; otherwise starts loading it
 * and stays silent this time rather than firing a second network request.
 */
export function playMenuClip(
  url: string,
  volume: number,
  cache: AudioClipCache = sessionAudioClipCache,
): void {
  const objectUrl = cache.peekObjectUrl(url);
  if (!objectUrl) {
    cache.getObjectUrl(url).catch(reportClipFailure(url));
    return;
  }
  const audio = new Audio(objectUrl);
  audio.volume = volume;
  void audio.play().catch(() => undefined);
}
