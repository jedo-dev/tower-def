// Framework-agnostic store for user control settings, shared by the React
// settings page and the Phaser input runtime (in-game). Once hydrated from a
// storage, every change is written back through it.

import {
  readStoredControlSettings,
  writeStoredControlSettings,
  type ControlSettingsStorage,
} from './controlSettingsPersistence';

export type ControlSettings = {
  /**
   * Touch placement: the first tap previews the tower block, a second tap on
   * the same block builds it. Mouse clicks always build at once.
   */
  confirmPlacementWithSecondTap: boolean;
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  confirmPlacementWithSecondTap: true,
};

let settings: ControlSettings = DEFAULT_CONTROL_SETTINGS;
let boundStorage: ControlSettingsStorage | null = null;

const listeners = new Set<(next: ControlSettings) => void>();

export function getControlSettings(): ControlSettings {
  return settings;
}

function notify(): void {
  listeners.forEach((listener) => listener(settings));
}

/**
 * Loads persisted settings (falling back to the defaults on missing or
 * corrupt data) and binds the storage so later changes are written through.
 */
export function hydrateControlSettings(storage: ControlSettingsStorage | null): ControlSettings {
  boundStorage = storage;
  const stored = readStoredControlSettings(storage);
  settings = stored ? { ...stored } : { ...DEFAULT_CONTROL_SETTINGS };
  notify();
  return settings;
}

export function setControlSettings(next: Partial<ControlSettings>): void {
  settings = { ...settings, ...next };
  writeStoredControlSettings(boundStorage, settings);
  notify();
}

/** Restores defaults and unbinds the storage; for test isolation only. */
export function resetControlSettingsForTests(): void {
  boundStorage = null;
  settings = { ...DEFAULT_CONTROL_SETTINGS };
  notify();
}

export function subscribeControlSettings(listener: (next: ControlSettings) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
