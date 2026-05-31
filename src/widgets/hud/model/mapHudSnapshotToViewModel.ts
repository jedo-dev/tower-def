import type { BattlefieldView, GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

export type HudViewModel = {
  phaseLabel: string;
  selectedTowerLabel: string;
  modeLabel: string;
  isStartWaveDisabled: boolean;
  isArcherSelected: boolean;
};

export type BattlefieldViewToggleViewModel = {
  isVisible: boolean;
  isOpponentActive: boolean;
  label: string;
  ariaLabel: string;
  nextView: BattlefieldView;
};

export function mapHudSnapshotToViewModel(snapshot: GameHudSnapshot): HudViewModel {
  const phaseLabel = snapshot.phase === 'game-over' ? 'Game Over' : snapshot.phase;
  const selectedTowerLabel = snapshot.selectedTowerType === null ? 'None' : snapshot.selectedTowerType === 'splash' ? 'Plague' : 'Archer';
  const modeLabel = snapshot.selectedTowerType === null ? 'Sell (placeholder)' : 'Build (placeholder)';
  const isWaveActive = snapshot.phase === 'wave';

  return {
    phaseLabel,
    selectedTowerLabel,
    modeLabel,
    isStartWaveDisabled: isWaveActive || !snapshot.canStartWave,
    isArcherSelected: snapshot.selectedTowerType === 'archer',
  };
}

export function mapBattlefieldViewToggleToViewModel(
  snapshot: GameHudSnapshot,
  activeView: BattlefieldView,
): BattlefieldViewToggleViewModel {
  const isOpponentActive = activeView === 'opponent';

  return {
    isVisible: snapshot.phase === 'wave',
    isOpponentActive,
    label: isOpponentActive ? 'Mine' : 'Enemy',
    ariaLabel: isOpponentActive ? 'Show player battlefield' : 'Show opponent battlefield',
    nextView: isOpponentActive ? 'player' : 'opponent',
  };
}

