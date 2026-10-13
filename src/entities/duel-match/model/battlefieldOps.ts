import type { GridPosition } from '../../../shared/types/pathfinding';
import { calculateWaveRoutes, type WaveRoutes } from '../../../shared/lib/pathfinding/waveRoutes';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import type { TowerEntity } from '../../tower/model/types';
import type { DuelMatchState } from './types';
import type { AddCreepEntry, BattlefieldLeakResult, BattlefieldState } from './battlefield';

export function createBattlefieldState(
  grid: BattlefieldState['grid'],
  routes: WaveRoutes,
): BattlefieldState {
  return {
    grid,
    towers: [],
    creeps: [],
    path: [...routes.small],
    routes,
    leakedCount: 0,
  };
}

/** Recomputes both wave routes (and the planner path) from the current grid. */
export function refreshBattlefieldRoutes(battlefield: BattlefieldState): BattlefieldState {
  const routes = calculateWaveRoutes(battlefield.grid);
  return { ...battlefield, routes, path: [...routes.small] };
}

/** Fixes the opponent field's routes for the wave that is about to start. */
export function refreshOpponentRoutesForWaveStart(state: DuelMatchState): DuelMatchState {
  return {
    ...state,
    opponent: {
      ...state.opponent,
      battlefield: refreshBattlefieldRoutes(state.opponent.battlefield),
    },
  };
}

/** Adds the tower and walls off every cell of its footprint. */
export function addTower(battlefield: BattlefieldState, tower: TowerEntity): BattlefieldState {
  return {
    ...battlefield,
    towers: [...battlefield.towers, tower],
    grid: withFootprintOccupancy(battlefield.grid, tower.position, TOWER_FOOTPRINT, true),
  };
}

export function removeTower(battlefield: BattlefieldState, towerId: string): BattlefieldState {
  const tower = battlefield.towers.find((t) => t.id === towerId);
  if (!tower) {
    return battlefield;
  }

  return {
    ...battlefield,
    towers: battlefield.towers.filter((t) => t.id !== towerId),
    grid: withFootprintOccupancy(battlefield.grid, tower.position, TOWER_FOOTPRINT, false),
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
    sizeClass: entry.sizeClass,
    status: 'alive' as const,
    position: { x: entry.entrance.x, y: entry.entrance.y },
    pathIndex: 0,
    ...(entry.sender === undefined ? {} : { sender: entry.sender }),
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
