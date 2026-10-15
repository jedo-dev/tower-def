import { useSyncExternalStore } from 'react';
import { getAudioSettings, subscribeAudioSettings, type AudioSettings } from './audioSettingsStore';

/** Subscribes a component to the audio settings store (event-driven, no polling). */
export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(subscribeAudioSettings, getAudioSettings, getAudioSettings);
}
