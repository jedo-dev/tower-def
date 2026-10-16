import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONTROL_SETTINGS_STORAGE_KEY,
  parseStoredControlSettings,
  readStoredControlSettings,
  writeStoredControlSettings,
  type ControlSettingsStorage,
} from './controlSettingsPersistence';
import {
  DEFAULT_CONTROL_SETTINGS,
  getControlSettings,
  hydrateControlSettings,
  resetControlSettingsForTests,
  setControlSettings,
  subscribeControlSettings,
} from './controlSettingsStore';

function createFakeStorage(initial: Record<string, string> = {}): ControlSettingsStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

afterEach(() => {
  resetControlSettingsForTests();
});

describe('control settings persistence', () => {
  it('parses a stored value and rejects malformed data', () => {
    expect(parseStoredControlSettings('{"confirmPlacementWithSecondTap":false}')).toEqual({
      confirmPlacementWithSecondTap: false,
    });
    expect(parseStoredControlSettings(null)).toBeNull();
    expect(parseStoredControlSettings('not json')).toBeNull();
    expect(parseStoredControlSettings('{"confirmPlacementWithSecondTap":"yes"}')).toBeNull();
    expect(parseStoredControlSettings('[]')).toBeNull();
  });

  it('treats a missing or throwing storage as absent', () => {
    const throwing: ControlSettingsStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredControlSettings(null)).toBeNull();
    expect(readStoredControlSettings(throwing)).toBeNull();
    expect(writeStoredControlSettings(null, DEFAULT_CONTROL_SETTINGS)).toBe(false);
    expect(writeStoredControlSettings(throwing, DEFAULT_CONTROL_SETTINGS)).toBe(false);
  });
});

describe('control settings store', () => {
  it('confirms placement with a second tap by default', () => {
    expect(getControlSettings()).toEqual({ confirmPlacementWithSecondTap: true });
  });

  it('hydrates from storage and writes changes back through it', () => {
    const storage = createFakeStorage({
      [CONTROL_SETTINGS_STORAGE_KEY]: '{"confirmPlacementWithSecondTap":false}',
    });
    const listener = vi.fn();
    subscribeControlSettings(listener);

    expect(hydrateControlSettings(storage).confirmPlacementWithSecondTap).toBe(false);
    setControlSettings({ confirmPlacementWithSecondTap: true });

    expect(getControlSettings().confirmPlacementWithSecondTap).toBe(true);
    expect(JSON.parse(storage.data.get(CONTROL_SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({
      confirmPlacementWithSecondTap: true,
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('falls back to the defaults on corrupt storage', () => {
    const storage = createFakeStorage({ [CONTROL_SETTINGS_STORAGE_KEY]: '{"nope":1}' });
    expect(hydrateControlSettings(storage)).toEqual(DEFAULT_CONTROL_SETTINGS);
  });
});
