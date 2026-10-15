// Framework-agnostic store for user audio settings, shared by the React UI
// sound player (menus) and the Phaser GameAudioManager (in-game). Once
// hydrated from a storage, every change is written back through it.

import {
  readStoredAudioSettings,
  writeStoredAudioSettings,
  type AudioSettingsStorage,
} from './audioSettingsPersistence';

export const DEFAULT_SFX_VOLUME = 0.2;
export const DEFAULT_AMBIENT_VOLUME = 0.15;

// A slider at its default keeps original loudness (scale 1); raising it can
// boost at most 2x to avoid clipping.
const MAX_USER_SCALE = 2;

export type AudioSettings = {
  sfxVolume: number;
  ambientVolume: number;
  /** Silences every category while keeping the slider values. */
  isMuted: boolean;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  sfxVolume: DEFAULT_SFX_VOLUME,
  ambientVolume: DEFAULT_AMBIENT_VOLUME,
  isMuted: false,
};

let settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
let boundStorage: AudioSettingsStorage | null = null;

const listeners = new Set<(next: AudioSettings) => void>();

export function getAudioSettings(): AudioSettings {
  return settings;
}

function notify(): void {
  listeners.forEach((listener) => listener(settings));
}

/**
 * Loads persisted settings (falling back to the defaults on missing or
 * corrupt data) and binds the storage so later changes are written through.
 */
export function hydrateAudioSettings(storage: AudioSettingsStorage | null): AudioSettings {
  boundStorage = storage;
  const stored = readStoredAudioSettings(storage);
  settings = stored ? { ...stored } : { ...DEFAULT_AUDIO_SETTINGS };
  notify();
  return settings;
}

export function setAudioSettings(next: Partial<AudioSettings>): void {
  settings = { ...settings, ...next };
  writeStoredAudioSettings(boundStorage, settings);
  notify();
}

export function toggleAudioMuted(): void {
  setAudioSettings({ isMuted: !settings.isMuted });
}

/** Restores defaults and unbinds the storage; for test isolation only. */
export function resetAudioSettingsForTests(): void {
  boundStorage = null;
  settings = { ...DEFAULT_AUDIO_SETTINGS };
  notify();
}

export function subscribeAudioSettings(listener: (next: AudioSettings) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The ambient slider value, or 0 while muted; what the menu players use. */
export function getEffectiveAmbientVolume(): number {
  return settings.isMuted ? 0 : settings.ambientVolume;
}

/** The SFX slider value, or 0 while muted. */
export function getEffectiveSfxVolume(): number {
  return settings.isMuted ? 0 : settings.sfxVolume;
}

function toUserScale(volume: number, defaultVolume: number): number {
  if (defaultVolume <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(MAX_USER_SCALE, volume / defaultVolume));
}

export function getSfxUserScale(): number {
  return toUserScale(getEffectiveSfxVolume(), DEFAULT_SFX_VOLUME);
}

export function getAmbientUserScale(): number {
  return toUserScale(getEffectiveAmbientVolume(), DEFAULT_AMBIENT_VOLUME);
}
