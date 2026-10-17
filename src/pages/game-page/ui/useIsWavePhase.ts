import { useSyncExternalStore } from 'react';
import {
  getGameHudSnapshot,
  subscribeGameHudSnapshot,
} from '../../../shared/lib/game-bridge/bridge';

function readIsWavePhase(): boolean {
  return getGameHudSnapshot().phase === 'wave';
}

/**
 * True while a wave runs. Reads the HUD snapshot the bridge publishes, but
 * the page only re-renders when the boolean flips: once when the wave starts
 * and once when it settles, never on gold or lives changes mid-wave.
 */
export function useIsWavePhase(): boolean {
  return useSyncExternalStore(subscribeGameHudSnapshot, readIsWavePhase, readIsWavePhase);
}
