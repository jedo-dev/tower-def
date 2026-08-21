import type { GridPosition } from '../../../shared/types/pathfinding';
import { CreepTypeId } from '../../../shared/types/content-ids';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type { TowerEntity } from '../../tower/model/types';
import type { DuelMatchState } from './types';
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
    leakedCount: 0,
  };
}

function createSendCreepEntries(
  sender: 'player' | 'opponent',
  round: number,
  battlefield: BattlefieldState,
  unitIds: DuelMatchState['player']['sendQueue'],
): AddCreepEntry[] {
  const entrance = battlefield.path[0] ?? battlefield.grid.entrance;

  return unitIds.map((unitId, index) => {
    const unit = resolveUnitConfigById(unitId);
    return {
      id: `${sender}:send:${round}:${index}:${unit.id}`,
      typeId: CreepTypeId.BASIC,
      hp: unit.health,
      speed: unit.speed,
      armor: unit.armor,
      armorType: unit.armorType,
      moveType: unit.moveType,
      entrance,
    };
  });
}

export function routeQueuedSendsToBattlefields(state: DuelMatchState): DuelMatchState {
  const playerTargetEntries = createSendCreepEntries(
    'opponent',
    state.round + 1,
    state.player.battlefield,
    state.opponent.sendQueue,
  );
  const opponentTargetEntries = createSendCreepEntries(
    'player',
    state.round + 1,
    state.opponent.battlefield,
    state.player.sendQueue,
  );

  return {
    ...state,
    player: {
      ...state.player,
      battlefield: addCreeps(state.player.battlefield, playerTargetEntries),
    },
    opponent: {
      ...state.opponent,
      battlefield: addCreeps(state.opponent.battlefield, opponentTargetEntries),
    },
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
    armor: entry.armor,
    armorType: entry.armorType,
    moveType: entry.moveType,
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
      leakedCount: battlefield.leakedCount + leaked.length,
    },
    leakedCount: leaked.length,
  };
}

export function reconcileBattlefieldsForNextRound(state: DuelMatchState): DuelMatchState {
  const opponentWithoutDead = removeDeadCreeps(state.opponent.battlefield);
  const opponentLeakResult = removeLeakedCreeps(opponentWithoutDead);

  return {
    ...state,
    player: {
      ...state.player,
      // Player-side creeps are owned by the live wave runtime (spawned via
      // getAdditionalWaveUnits); keeping routed copies here double-counts them.
      battlefield: {
        ...state.player.battlefield,
        creeps: [],
      },
    },
    opponent: {
      ...state.opponent,
      battlefield: opponentLeakResult.battlefield,
    },
  };
}

export function countAliveCreeps(battlefield: BattlefieldState): number {
  return battlefield.creeps.filter((creep) => creep.lifeState === 'alive').length;
}

export function countLeakedCreeps(battlefield: BattlefieldState): number {
  return battlefield.creeps.filter((creep) => creep.status === 'escaped').length;
}
