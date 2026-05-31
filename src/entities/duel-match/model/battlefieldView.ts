import type { BattlefieldView } from '../../../shared/lib/game-bridge/types';
import type { CreepEntity } from '../../creep/model/types';
import type { TowerEntity } from '../../tower/model/types';
import type { GridCell } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { DuelMatchState } from './types';

export type BattlefieldPlayerInteraction = 'build' | 'upgrade' | 'sell' | 'select';

export type VisibleBattlefieldSnapshot = {
  view: BattlefieldView;
  isReadOnly: boolean;
  hp: number;
  gridCells: readonly GridCell[];
  path: readonly GridPosition[];
  towers: readonly TowerEntity[];
  creeps: readonly CreepEntity[];
  leakedCreepCount: number;
};

export function createVisibleBattlefieldSnapshot(
  state: DuelMatchState,
  view: BattlefieldView,
): VisibleBattlefieldSnapshot {
  const duelist = view === 'player' ? state.player : state.opponent;
  const battlefield = duelist.battlefield;

  return {
    view,
    isReadOnly: view === 'opponent',
    hp: duelist.hp,
    gridCells: battlefield.grid.cells,
    path: battlefield.path,
    towers: battlefield.towers,
    creeps: battlefield.creeps,
    leakedCreepCount: battlefield.creeps.filter((creep) => creep.status === 'escaped').length,
  };
}

export function canPlayerInteractWithVisibleBattlefield(
  snapshot: VisibleBattlefieldSnapshot,
  interaction: BattlefieldPlayerInteraction,
): boolean {
  void interaction;
  return !snapshot.isReadOnly;
}
