import type { GridPosition } from '../../../shared/types/pathfinding';

export type TowerId = string;

export type TowerType = 'archer' | 'splash';

export type TowerEntity = {
  id: TowerId;
  position: GridPosition;
  cost: number;
  type: TowerType;
};
