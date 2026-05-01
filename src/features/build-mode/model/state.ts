import type { TowerType } from '../../../entities/tower';
import type { BuildModeState } from './types';

export function createInitialBuildModeState(): BuildModeState {
  return {
    selectedTowerType: null,
  };
}

export function selectTowerType(
  state: BuildModeState,
  towerType: TowerType,
): BuildModeState {
  return {
    ...state,
    selectedTowerType: towerType,
  };
}

export function clearSelectedTowerType(state: BuildModeState): BuildModeState {
  return {
    ...state,
    selectedTowerType: null,
  };
}
