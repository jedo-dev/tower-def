import type { GridPosition } from '../../../shared/types/pathfinding';
import type { CreepTypeId } from '../../../shared/types/content-ids';

export type CreepId = string;

export type CreepType = CreepTypeId;

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
