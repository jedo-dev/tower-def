import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { CreepEntity } from '../../creep/model/types';
import type { TowerEntity } from '../../tower/model/types';

export type BattlefieldState = {
  grid: GridModel;
  towers: TowerEntity[];
  creeps: CreepEntity[];
  path: GridPosition[];
};

export type AddCreepEntry = {
  id: string;
  typeId: string;
  hp: number;
  speed: number;
  entrance: GridPosition;
};

export type BattlefieldLeakResult = {
  battlefield: BattlefieldState;
  leakedCount: number;
};
