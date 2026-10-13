import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { CreepCombatTraits, CreepEntity, CreepSenderSide } from '../../creep/model/types';
import type { TowerEntity } from '../../tower/model/types';

export type BattlefieldState = {
  grid: GridModel;
  towers: TowerEntity[];
  creeps: CreepEntity[];
  path: GridPosition[];
  leakedCount: number;
};

export type AddCreepEntry = CreepCombatTraits & {
  id: string;
  typeId: CreepEntity['type'];
  hp: number;
  speed: number;
  entrance: GridPosition;
  /** The side that sent this creep; omitted for baseline wave creeps. */
  sender?: CreepSenderSide;
};

export type BattlefieldLeakResult = {
  battlefield: BattlefieldState;
  leakedCount: number;
};
