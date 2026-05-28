import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import type {
  AddCreepEntry,
  BattlefieldLeakResult,
  BattlefieldState,
} from './battlefield';

export function createBattlefieldState(
  grid: BattlefieldState['grid'],
  path: GridPosition[],
): BattlefieldState {
  return {
    grid,
    towers: [],
    creeps: [],
    path,
  };
}

export function addTower(
  battlefield: BattlefieldState,
  tower: TowerEntity,
): BattlefieldState {
  return {
    ...battlefield,
    towers: [...battlefield.towers, tower],
    grid: {
      ...battlefield.grid,
      cells: battlefield.grid.cells.map((cell) =>
        cell.x === tower.position.x && cell.y === tower.position.y
          ? { ...cell, isOccupied: true }
          : cell,
      ),
    },
  };
}

export function removeTower(
  battlefield: BattlefieldState,
  towerId: string,
): BattlefieldState {
  const tower = battlefield.towers.find((t) => t.id === towerId);
  if (!tower) {
    return battlefield;
  }

  return {
    ...battlefield,
    towers: battlefield.towers.filter((t) => t.id !== towerId),
    grid: {
      ...battlefield.grid,
      cells: battlefield.grid.cells.map((cell) =>
        cell.x === tower.position.x && cell.y === tower.position.y
          ? { ...cell, isOccupied: false }
          : cell,
      ),
    },
  };
}

export function addCreeps(
  battlefield: BattlefieldState,
  entries: AddCreepEntry[],
): BattlefieldState {
  const newCreeps = entries.map((entry) => ({
    id: entry.id,
    type: entry.typeId,
    hp: entry.hp,
    lifeState: 'alive' as const,
    speed: entry.speed,
    status: 'alive' as const,
    position: { x: entry.entrance.x, y: entry.entrance.y },
    pathIndex: 0,
  }));

  return {
    ...battlefield,
    creeps: [...battlefield.creeps, ...newCreeps],
  };
}

export function markDeadCreeps(battlefield: BattlefieldState): BattlefieldState {
  return {
    ...battlefield,
    creeps: battlefield.creeps.map((creep) =>
      creep.hp <= 0 && creep.lifeState === 'alive'
        ? { ...creep, lifeState: 'dead' as const, status: 'dead' as const }
        : creep,
    ),
  };
}

export function removeDeadCreeps(battlefield: BattlefieldState): BattlefieldState {
  return {
    ...battlefield,
    creeps: battlefield.creeps.filter((creep) => creep.lifeState !== 'dead'),
  };
}

export function markLeakedCreeps(
  battlefield: BattlefieldState,
  exitPosition: GridPosition,
): BattlefieldState {
  return {
    ...battlefield,
    creeps: battlefield.creeps.map((creep) =>
      creep.lifeState === 'alive' &&
      creep.position.x === exitPosition.x &&
      creep.position.y === exitPosition.y
        ? { ...creep, status: 'escaped' as const }
        : creep,
    ),
  };
}

export function removeLeakedCreeps(battlefield: BattlefieldState): BattlefieldLeakResult {
  const leaked = battlefield.creeps.filter((creep) => creep.status === 'escaped');
  return {
    battlefield: {
      ...battlefield,
      creeps: battlefield.creeps.filter((creep) => creep.status !== 'escaped'),
    },
    leakedCount: leaked.length,
  };
}

export function countAliveCreeps(battlefield: BattlefieldState): number {
  return battlefield.creeps.filter((creep) => creep.lifeState === 'alive').length;
}

export function countLeakedCreeps(battlefield: BattlefieldState): number {
  return battlefield.creeps.filter((creep) => creep.status === 'escaped').length;
}
