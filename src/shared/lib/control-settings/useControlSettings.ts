import { useSyncExternalStore } from 'react';
import {
  getControlSettings,
  subscribeControlSettings,
  type ControlSettings,
} from './controlSettingsStore';

/** Subscribes a component to the control settings store (event-driven, no polling). */
export function useControlSettings(): ControlSettings {
  return useSyncExternalStore(subscribeControlSettings, getControlSettings, getControlSettings);
}
