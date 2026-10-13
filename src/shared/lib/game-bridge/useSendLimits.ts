import { useSyncExternalStore } from 'react';
import { onGameEvent } from './bridge';
import type { CreepSendLimitsSnapshot } from './types';

let currentPlayerSendLimits: CreepSendLimitsSnapshot | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function subscribeSendLimits(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getPlayerSendLimitsSnapshot(): CreepSendLimitsSnapshot | null {
  return currentPlayerSendLimits;
}

// Subscribed at module load so a publish made before the panel mounts
// (scene create) is not lost.
onGameEvent('send-limits-updated', (payload) => {
  if (payload.owner !== 'player') {
    return;
  }
  currentPlayerSendLimits = payload;
  emitChange();
});

/** The player's send capacity for the current wave, or null before the scene publishes it. */
export function usePlayerSendLimits(): CreepSendLimitsSnapshot | null {
  return useSyncExternalStore(
    subscribeSendLimits,
    getPlayerSendLimitsSnapshot,
    getPlayerSendLimitsSnapshot,
  );
}
