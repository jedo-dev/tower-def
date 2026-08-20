// Framework-agnostic store for user audio settings, shared by the React UI
// sound player (menus) and the Phaser GameAudioManager (in-game).

export const DEFAULT_SFX_VOLUME = 0.2;
export const DEFAULT_AMBIENT_VOLUME = 0.15;

// A slider at its default keeps original loudness (scale 1); raising it can
// boost at most 2x to avoid clipping.
const MAX_USER_SCALE = 2;

export type AudioSettings = {
  sfxVolume: number;
  ambientVolume: number;
};

let settings: AudioSettings = {
  sfxVolume: DEFAULT_SFX_VOLUME,
  ambientVolume: DEFAULT_AMBIENT_VOLUME,
};

const listeners = new Set<(next: AudioSettings) => void>();

export function getAudioSettings(): AudioSettings {
  return settings;
}

export function setAudioSettings(next: Partial<AudioSettings>): void {
  settings = { ...settings, ...next };
  listeners.forEach((listener) => listener(settings));
}

export function subscribeAudioSettings(listener: (next: AudioSettings) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toUserScale(volume: number, defaultVolume: number): number {
  if (defaultVolume <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(MAX_USER_SCALE, volume / defaultVolume));
}

export function getSfxUserScale(): number {
  return toUserScale(settings.sfxVolume, DEFAULT_SFX_VOLUME);
}

export function getAmbientUserScale(): number {
  return toUserScale(settings.ambientVolume, DEFAULT_AMBIENT_VOLUME);
}
