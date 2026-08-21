import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../creep';
import { RaceId } from '../../../shared/types/content-ids';
import { addCreeps, addTower, markLeakedCreeps } from './battlefieldOps';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from './state';
import type { DuelMatchState } from './types';
import {
  canPlayerInteractWithVisibleBattlefield,
  createVisibleBattlefieldSnapshot,
  type BattlefieldPlayerInteraction,
} from './battlefieldView';

function createTestTower() {
  return {
    id: 'computer:tower:2:4',
    position: { x: 2, y: 4 },
    cost: 50,
    type: 'single' as const,
    level: 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

function createStateWithOpponentRuntime(): DuelMatchState {
  const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
  const withTower = addTower(state.opponent.battlefield, createTestTower());
  const withCreep = addCreeps(withTower, [
    {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'player_send_1',
      typeId: 'basic',
      hp: 100,
      speed: 1,
      entrance: DEFAULT_ENTRANCE,
    },
    {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'player_send_leak_1',
      typeId: 'basic',
      hp: 100,
      speed: 1,
      entrance: DEFAULT_EXIT,
    },
  ]);
  const withLeak = markLeakedCreeps(withCreep, DEFAULT_EXIT);

  return {
    ...state,
    opponent: {
      ...state.opponent,
      hp: 17,
      battlefield: withLeak,
    },
  };
}

describe('entities/duel-match/battlefieldView', () => {
  it('creates an opponent battlefield snapshot with route, towers, sent creeps, leaks, and HP', () => {
    const state = createStateWithOpponentRuntime();

    const snapshot = createVisibleBattlefieldSnapshot(state, 'opponent');

    expect(snapshot.view).toBe('opponent');
    expect(snapshot.isReadOnly).toBe(true);
    expect(snapshot.hp).toBe(17);
    expect(snapshot.gridCells).toBe(state.opponent.battlefield.grid.cells);
    expect(snapshot.path).toBe(state.opponent.battlefield.path);
    expect(snapshot.towers).toHaveLength(1);
    expect(snapshot.towers[0].id).toBe('computer:tower:2:4');
    expect(snapshot.creeps.map((creep) => creep.id)).toEqual([
      'player_send_1',
      'player_send_leak_1',
    ]);
    expect(snapshot.leakedCreepCount).toBe(1);
  });

  it('keeps player battlefield snapshots interactive for player commands', () => {
    const state = createStateWithOpponentRuntime();

    const snapshot = createVisibleBattlefieldSnapshot(state, 'player');

    expect(snapshot.view).toBe('player');
    expect(snapshot.isReadOnly).toBe(false);
    expect(snapshot.hp).toBe(state.player.hp);
    expect(snapshot.towers).toBe(state.player.battlefield.towers);
  });

  it('rejects build, upgrade, sell, and selection interactions on opponent snapshots', () => {
    const state = createStateWithOpponentRuntime();
    const snapshot = createVisibleBattlefieldSnapshot(state, 'opponent');
    const interactions: readonly BattlefieldPlayerInteraction[] = [
      'build',
      'upgrade',
      'sell',
      'select',
    ];

    for (const interaction of interactions) {
      expect(canPlayerInteractWithVisibleBattlefield(snapshot, interaction)).toBe(false);
    }
  });

  it('allows build, upgrade, sell, and selection interactions on player snapshots', () => {
    const state = createStateWithOpponentRuntime();
    const snapshot = createVisibleBattlefieldSnapshot(state, 'player');
    const interactions: readonly BattlefieldPlayerInteraction[] = [
      'build',
      'upgrade',
      'sell',
      'select',
    ];

    for (const interaction of interactions) {
      expect(canPlayerInteractWithVisibleBattlefield(snapshot, interaction)).toBe(true);
    }
  });
});
