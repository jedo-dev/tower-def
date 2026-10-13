import { useSyncExternalStore } from 'react';
import { onGameEvent } from './bridge';

let currentOpponentFieldRemaining = 0;
const listeners = new Set<() => void>();

function subscribeOpponentFieldCreeps(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getOpponentFieldRemainingSnapshot(): number {
  return currentOpponentFieldRemaining;
}

// Subscribed at module load so a publish made before the widget mounts
// (scene create, wave start) is not lost.
onGameEvent('opponent-field-creeps-updated', (payload) => {
  if (payload.remaining === currentOpponentFieldRemaining) {
    return;
  }
  currentOpponentFieldRemaining = payload.remaining;
  listeners.forEach((listener) => listener());
});

/** Creeps the computer's field still has to resolve this wave; 0 before the scene publishes. */
export function useOpponentFieldRemainingCreeps(): number {
  return useSyncExternalStore(
    subscribeOpponentFieldCreeps,
    getOpponentFieldRemainingSnapshot,
    getOpponentFieldRemainingSnapshot,
  );
}
