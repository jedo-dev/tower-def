// Reads and writes the user audio settings in a key/value storage (normally
// `localStorage`). Storage can be missing (SSR, Telegram Web App restrictions)
// or throw (private mode, quota), so every access is guarded and a failure
// simply falls back to the in-memory defaults.

export const AUDIO_SETTINGS_STORAGE_KEY = 'tower-def.audio-settings.v1';

/** The storage subset the persistence layer needs (a `Storage` satisfies it). */
export type AudioSettingsStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type PersistedAudioSettings = {
  sfxVolume: number;
  ambientVolume: number;
  isMuted: boolean;
};

function isVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Validates a parsed JSON value; anything malformed yields `null`. */
export function parseStoredAudioSettings(raw: string | null): PersistedAudioSettings | null {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (
    !isVolume(candidate.sfxVolume) ||
    !isVolume(candidate.ambientVolume) ||
    typeof candidate.isMuted !== 'boolean'
  ) {
    return null;
  }
  return {
    sfxVolume: candidate.sfxVolume,
    ambientVolume: candidate.ambientVolume,
    isMuted: candidate.isMuted,
  };
}

export function readStoredAudioSettings(
  storage: AudioSettingsStorage | null,
): PersistedAudioSettings | null {
  if (!storage) {
    return null;
  }
  try {
    return parseStoredAudioSettings(storage.getItem(AUDIO_SETTINGS_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Returns whether the write succeeded; a throwing storage is treated as absent. */
export function writeStoredAudioSettings(
  storage: AudioSettingsStorage | null,
  settings: PersistedAudioSettings,
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** `window.localStorage`, or `null` where access itself throws or is undefined. */
export function getBrowserAudioSettingsStorage(): AudioSettingsStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
