import { useSyncExternalStore } from 'react';
import { getActiveBattlefieldView, onGameEvent } from './bridge';
import type { BattlefieldView } from './types';

let currentBattlefieldView: BattlefieldView = getActiveBattlefieldView();

function getBattlefieldViewSnapshot(): BattlefieldView {
  return currentBattlefieldView;
}

function subscribeBattlefieldView(onStoreChange: () => void): () => void {
  return onGameEvent('battlefield-view-changed', (payload) => {
    currentBattlefieldView = payload.activeView;
    onStoreChange();
  });
}

export function useBattlefieldView(): BattlefieldView {
  return useSyncExternalStore(
    subscribeBattlefieldView,
    getBattlefieldViewSnapshot,
    getBattlefieldViewSnapshot,
  );
}
