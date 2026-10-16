// Reads and writes the user control settings in a key/value storage (normally
// `localStorage`). Storage can be missing (SSR, Telegram Web App restrictions)
// or throw (private mode, quota), so every access is guarded and a failure
// simply falls back to the in-memory defaults.

export const CONTROL_SETTINGS_STORAGE_KEY = 'tower-def.control-settings.v1';

/** The storage subset the persistence layer needs (a `Storage` satisfies it). */
export type ControlSettingsStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type PersistedControlSettings = {
  confirmPlacementWithSecondTap: boolean;
};

/** Validates a parsed JSON value; anything malformed yields `null`. */
export function parseStoredControlSettings(raw: string | null): PersistedControlSettings | null {
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
  if (typeof candidate.confirmPlacementWithSecondTap !== 'boolean') {
    return null;
  }
  return { confirmPlacementWithSecondTap: candidate.confirmPlacementWithSecondTap };
}

export function readStoredControlSettings(
  storage: ControlSettingsStorage | null,
): PersistedControlSettings | null {
  if (!storage) {
    return null;
  }
  try {
    return parseStoredControlSettings(storage.getItem(CONTROL_SETTINGS_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Returns whether the write succeeded; a throwing storage is treated as absent. */
export function writeStoredControlSettings(
  storage: ControlSettingsStorage | null,
  settings: PersistedControlSettings,
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(CONTROL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** `window.localStorage`, or `null` where access itself throws or is undefined. */
export function getBrowserControlSettingsStorage(): ControlSettingsStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
