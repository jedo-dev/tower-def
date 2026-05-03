import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

export type HudViewModel = {
  phaseLabel: string;
  selectedTowerLabel: string;
  modeLabel: string;
  isStartWaveDisabled: boolean;
  isArcherSelected: boolean;
};

export function mapHudSnapshotToViewModel(snapshot: GameHudSnapshot): HudViewModel {
  const phaseLabel = snapshot.phase === 'game-over' ? 'Game Over' : snapshot.phase;
  const selectedTowerLabel = snapshot.selectedTowerType === null ? 'None' : 'Archer';
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

