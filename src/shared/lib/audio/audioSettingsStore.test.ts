import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUDIO_SETTINGS_STORAGE_KEY,
  parseStoredAudioSettings,
  readStoredAudioSettings,
  writeStoredAudioSettings,
  type AudioSettingsStorage,
} from './audioSettingsPersistence';
import {
  DEFAULT_AMBIENT_VOLUME,
  DEFAULT_SFX_VOLUME,
  getAmbientUserScale,
  getAudioSettings,
  getEffectiveAmbientVolume,
  getEffectiveSfxVolume,
  getSfxUserScale,
  hydrateAudioSettings,
  resetAudioSettingsForTests,
  setAudioSettings,
  subscribeAudioSettings,
  toggleAudioMuted,
} from './audioSettingsStore';

function createFakeStorage(initial: Record<string, string> = {}): AudioSettingsStorage & {
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
  resetAudioSettingsForTests();
});

describe('audio settings persistence', () => {
  it('round-trips settings through a fake storage under the versioned key', () => {
    const storage = createFakeStorage();
    hydrateAudioSettings(storage);

    setAudioSettings({ sfxVolume: 0.6, ambientVolume: 0.3 });
    toggleAudioMuted();

    expect(storage.data.has(AUDIO_SETTINGS_STORAGE_KEY)).toBe(true);
    const rehydrated = createFakeStorage(Object.fromEntries(storage.data));
    resetAudioSettingsForTests();
    expect(hydrateAudioSettings(rehydrated)).toEqual({
      sfxVolume: 0.6,
      ambientVolume: 0.3,
      isMuted: true,
    });
  });

  it('falls back to the defaults on corrupt or malformed stored data', () => {
    const corruptValues = [
      '{not json',
      '"a string"',
      'null',
      '[]',
      JSON.stringify({ sfxVolume: 'loud', ambientVolume: 0.2, isMuted: false }),
      JSON.stringify({ sfxVolume: 1.5, ambientVolume: 0.2, isMuted: false }),
      JSON.stringify({ sfxVolume: 0.5, ambientVolume: -0.1, isMuted: false }),
      JSON.stringify({ sfxVolume: 0.5, ambientVolume: 0.2 }),
    ];
    for (const raw of corruptValues) {
      expect(parseStoredAudioSettings(raw)).toBeNull();
      const storage = createFakeStorage({ [AUDIO_SETTINGS_STORAGE_KEY]: raw });
      expect(hydrateAudioSettings(storage)).toEqual({
        sfxVolume: DEFAULT_SFX_VOLUME,
        ambientVolume: DEFAULT_AMBIENT_VOLUME,
        isMuted: false,
      });
    }
  });

  it('works without any storage and when the storage throws', () => {
    expect(hydrateAudioSettings(null).sfxVolume).toBe(DEFAULT_SFX_VOLUME);
    setAudioSettings({ sfxVolume: 0.9 });
    expect(getAudioSettings().sfxVolume).toBe(0.9);

    const throwing: AudioSettingsStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readStoredAudioSettings(throwing)).toBeNull();
    expect(
      writeStoredAudioSettings(throwing, { sfxVolume: 0.1, ambientVolume: 0.1, isMuted: false }),
    ).toBe(false);
    expect(hydrateAudioSettings(throwing).sfxVolume).toBe(DEFAULT_SFX_VOLUME);
    expect(() => setAudioSettings({ ambientVolume: 0.4 })).not.toThrow();
    expect(getAudioSettings().ambientVolume).toBe(0.4);
  });

  it('writes every change through once hydrated', () => {
    const storage = createFakeStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    hydrateAudioSettings(storage);

    setAudioSettings({ sfxVolume: 0.25 });
    setAudioSettings({ ambientVolume: 0.5 });

    expect(setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.data.get(AUDIO_SETTINGS_STORAGE_KEY) ?? '')).toEqual({
      sfxVolume: 0.25,
      ambientVolume: 0.5,
      isMuted: false,
    });
  });
});

describe('mute semantics', () => {
  it('silences both categories while keeping the slider values', () => {
    hydrateAudioSettings(createFakeStorage());
    setAudioSettings({ sfxVolume: 0.4, ambientVolume: 0.3 });

    toggleAudioMuted();

    expect(getAudioSettings()).toMatchObject({ sfxVolume: 0.4, ambientVolume: 0.3, isMuted: true });
    expect(getEffectiveSfxVolume()).toBe(0);
    expect(getEffectiveAmbientVolume()).toBe(0);
    expect(getSfxUserScale()).toBe(0);
    expect(getAmbientUserScale()).toBe(0);

    toggleAudioMuted();

    expect(getAudioSettings().isMuted).toBe(false);
    expect(getEffectiveSfxVolume()).toBe(0.4);
    expect(getEffectiveAmbientVolume()).toBe(0.3);
    expect(getSfxUserScale()).toBeCloseTo(2);
    expect(getAmbientUserScale()).toBeCloseTo(2);
  });

  it('notifies subscribers on mute, change and hydration', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAudioSettings(listener);

    toggleAudioMuted();
    setAudioSettings({ sfxVolume: 0.1 });
    hydrateAudioSettings(null);
    unsubscribe();
    setAudioSettings({ sfxVolume: 0.2 });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ isMuted: true });
  });
});
