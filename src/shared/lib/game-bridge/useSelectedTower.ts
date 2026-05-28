import { useSyncExternalStore } from 'react';
import { onGameEvent } from './bridge';
import type { SelectedTowerSnapshot } from './types';

let currentSelectedTower: SelectedTowerSnapshot | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function subscribeSelectedTower(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSelectedTowerSnapshot(): SelectedTowerSnapshot | null {
  return currentSelectedTower;
}

let isEventSubscribed = false;

function ensureEventSubscription(): void {
  if (isEventSubscribed) {
    return;
  }
  isEventSubscribed = true;

  onGameEvent('selected-tower', (payload) => {
    currentSelectedTower = payload.tower;
    emitChange();
  });
}

export function useSelectedTower(): SelectedTowerSnapshot | null {
  ensureEventSubscription();
  return useSyncExternalStore(subscribeSelectedTower, getSelectedTowerSnapshot, getSelectedTowerSnapshot);
}

export function clearSelectedTower(): void {
  currentSelectedTower = null;
  emitChange();
}
