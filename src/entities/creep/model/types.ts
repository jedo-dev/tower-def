import type { GridPosition } from '../../../shared/types/pathfinding';

export type CreepId = string;

export type CreepType = 'basic';

export type CreepLifeState = 'alive' | 'dead';

export type CreepStatus = CreepLifeState | 'escaped';

export type CreepEntity = {
  id: CreepId;
  type: CreepType;
  hp: number;
  lifeState: CreepLifeState;
  speed: number;
  status: CreepStatus;
  position: GridPosition;
  pathIndex: number;
};
