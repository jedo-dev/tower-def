import type { GridPosition } from '../../../shared/types/pathfinding';

export type CreepId = string;

export type CreepType = 'basic';

export type CreepStatus = 'alive' | 'escaped' | 'dead';

export type CreepEntity = {
  id: CreepId;
  type: CreepType;
  hp: number;
  speed: number;
  status: CreepStatus;
  position: GridPosition;
  pathIndex: number;
};
