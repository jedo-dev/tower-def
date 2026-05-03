import { useSyncExternalStore } from 'react';
import { getGameHudSnapshot, subscribeGameHudSnapshot } from './bridge';
import type { GameHudSnapshot } from './types';

export function useGameHudSnapshot(): GameHudSnapshot {
  return useSyncExternalStore(subscribeGameHudSnapshot, getGameHudSnapshot, getGameHudSnapshot);
}

