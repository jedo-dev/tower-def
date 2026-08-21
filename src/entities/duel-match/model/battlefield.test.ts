import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../creep';
import { RaceId } from '../../../shared/types/content-ids';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { calculateWaveStartPath } from '../../wave/model/calculateWavePath';
import type { BattlefieldState, AddCreepEntry } from './battlefield';
import {
  addCreeps,
  addTower,
  countAliveCreeps,
  countLeakedCreeps,
  createBattlefieldState,
  markDeadCreeps,
  markLeakedCreeps,
  reconcileBattlefieldsForNextRound,
  removeDeadCreeps,
  removeLeakedCreeps,
  removeTower,
  routeQueuedSendsToBattlefields,
} from './battlefieldOps';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from './state';
import { sendCreep } from './lifecycle';
import { UnitTier } from '../../unit/model/types';

function createTestBattlefield(): BattlefieldState {
  const grid = createGridModel({ entrance: DEFAULT_ENTRANCE, exit: DEFAULT_EXIT });
  const path = calculateWaveStartPath(grid);
  return createBattlefieldState(grid, path);
}

function createTestTower(overrides?: { x?: number; y?: number; id?: string }) {
  return {
    id: overrides?.id ?? 'tower_1',
    position: { x: overrides?.x ?? 2, y: overrides?.y ?? 3 },
    cost: 50,
    type: 'archer' as const,
    level: 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

function createTestCreepEntry(overrides?: Partial<AddCreepEntry>): AddCreepEntry {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: overrides?.id ?? 'creep_1',
    typeId: overrides?.typeId ?? 'basic',
    hp: overrides?.hp ?? 100,
    speed: overrides?.speed ?? 1,
    entrance: overrides?.entrance ?? DEFAULT_ENTRANCE,
  };
}

describe('entities/duel-match/battlefield', () => {
  describe('createBattlefieldState', () => {
    it('creates empty battlefield with grid and path', () => {
      const battlefield = createTestBattlefield();
      expect(battlefield.grid).toBeDefined();
      expect(battlefield.towers).toEqual([]);
      expect(battlefield.creeps).toEqual([]);
      expect(battlefield.leakedCount).toBe(0);
      expect(battlefield.path.length).toBeGreaterThan(0);
    });

    it('grid has correct dimensions', () => {
      const battlefield = createTestBattlefield();
      expect(battlefield.grid.cols).toBe(10);
      expect(battlefield.grid.rows).toBe(15);
    });
  });

  describe('addTower', () => {
    it('adds tower to battlefield', () => {
      const battlefield = createTestBattlefield();
      const tower = createTestTower();
      const result = addTower(battlefield, tower);

      expect(result.towers).toHaveLength(1);
      expect(result.towers[0].id).toBe('tower_1');
    });

    it('marks cell as occupied', () => {
      const battlefield = createTestBattlefield();
      const tower = createTestTower({ x: 3, y: 5 });
      const result = addTower(battlefield, tower);

      const cell = result.grid.cells.find((c) => c.x === 3 && c.y === 5);
      expect(cell?.isOccupied).toBe(true);
    });

    it('does not modify original battlefield', () => {
      const battlefield = createTestBattlefield();
      const tower = createTestTower();
      addTower(battlefield, tower);

      expect(battlefield.towers).toHaveLength(0);
    });

    it('can add multiple towers', () => {
      let battlefield = createTestBattlefield();
      battlefield = addTower(battlefield, createTestTower({ id: 't1', x: 1, y: 1 }));
      battlefield = addTower(battlefield, createTestTower({ id: 't2', x: 2, y: 2 }));

      expect(battlefield.towers).toHaveLength(2);
    });
  });

  describe('removeTower', () => {
    it('removes tower by id', () => {
      let battlefield = createTestBattlefield();
      battlefield = addTower(battlefield, createTestTower({ id: 't1', x: 1, y: 1 }));
      battlefield = addTower(battlefield, createTestTower({ id: 't2', x: 2, y: 2 }));
      battlefield = removeTower(battlefield, 't1');

      expect(battlefield.towers).toHaveLength(1);
      expect(battlefield.towers[0].id).toBe('t2');
    });

    it('unmarks cell as occupied', () => {
      let battlefield = createTestBattlefield();
      battlefield = addTower(battlefield, createTestTower({ x: 3, y: 5 }));
      battlefield = removeTower(battlefield, 'tower_1');

      const cell = battlefield.grid.cells.find((c) => c.x === 3 && c.y === 5);
      expect(cell?.isOccupied).toBe(false);
    });

    it('returns same state if tower not found', () => {
      const battlefield = createTestBattlefield();
      const result = removeTower(battlefield, 'nonexistent');
      expect(result).toBe(battlefield);
    });
  });

  describe('addCreeps', () => {
    it('adds creeps at entrance position', () => {
      const battlefield = createTestBattlefield();
      const entries = [createTestCreepEntry({ id: 'c1' })];
      const result = addCreeps(battlefield, entries);

      expect(result.creeps).toHaveLength(1);
      expect(result.creeps[0].id).toBe('c1');
      expect(result.creeps[0].position).toEqual(DEFAULT_ENTRANCE);
    });

    it('adds multiple creeps', () => {
      const battlefield = createTestBattlefield();
      const entries = [
        createTestCreepEntry({ id: 'c1' }),
        createTestCreepEntry({ id: 'c2' }),
        createTestCreepEntry({ id: 'c3' }),
      ];
      const result = addCreeps(battlefield, entries);

      expect(result.creeps).toHaveLength(3);
    });

    it('creeps start alive with correct stats', () => {
      const battlefield = createTestBattlefield();
      const entries = [createTestCreepEntry({ hp: 150, speed: 1.5 })];
      const result = addCreeps(battlefield, entries);

      expect(result.creeps[0].lifeState).toBe('alive');
      expect(result.creeps[0].status).toBe('alive');
      expect(result.creeps[0].hp).toBe(150);
      expect(result.creeps[0].speed).toBe(1.5);
      expect(result.creeps[0].pathIndex).toBe(0);
    });

    it('preserves existing creeps', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [createTestCreepEntry({ id: 'c1' })]);
      battlefield = addCreeps(battlefield, [createTestCreepEntry({ id: 'c2' })]);

      expect(battlefield.creeps).toHaveLength(2);
    });
  });

  describe('markDeadCreeps', () => {
    it('marks creeps with hp <= 0 as dead', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', hp: 0 }),
        createTestCreepEntry({ id: 'c2', hp: -10 }),
        createTestCreepEntry({ id: 'c3', hp: 50 }),
      ]);
      battlefield = markDeadCreeps(battlefield);

      expect(battlefield.creeps[0].lifeState).toBe('dead');
      expect(battlefield.creeps[0].status).toBe('dead');
      expect(battlefield.creeps[1].lifeState).toBe('dead');
      expect(battlefield.creeps[2].lifeState).toBe('alive');
    });

    it('does not re-mark already dead creeps', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [createTestCreepEntry({ id: 'c1', hp: 0 })]);
      battlefield = markDeadCreeps(battlefield);
      battlefield = markDeadCreeps(battlefield);

      expect(battlefield.creeps).toHaveLength(1);
      expect(battlefield.creeps[0].lifeState).toBe('dead');
    });
  });

  describe('removeDeadCreeps', () => {
    it('removes dead creeps from battlefield', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', hp: 0 }),
        createTestCreepEntry({ id: 'c2', hp: 50 }),
      ]);
      battlefield = markDeadCreeps(battlefield);
      battlefield = removeDeadCreeps(battlefield);

      expect(battlefield.creeps).toHaveLength(1);
      expect(battlefield.creeps[0].id).toBe('c2');
    });

    it('keeps all creeps if none are dead', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', hp: 50 }),
        createTestCreepEntry({ id: 'c2', hp: 100 }),
      ]);
      battlefield = removeDeadCreeps(battlefield);

      expect(battlefield.creeps).toHaveLength(2);
    });
  });

  describe('markLeakedCreeps', () => {
    it('marks creeps at exit position as escaped', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', entrance: DEFAULT_EXIT }),
      ]);
      battlefield = markLeakedCreeps(battlefield, DEFAULT_EXIT);

      expect(battlefield.creeps[0].status).toBe('escaped');
    });

    it('does not mark creeps not at exit', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', entrance: DEFAULT_ENTRANCE }),
      ]);
      battlefield = markLeakedCreeps(battlefield, DEFAULT_EXIT);

      expect(battlefield.creeps[0].status).toBe('alive');
    });

    it('does not mark dead creeps as escaped', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', hp: 0, entrance: DEFAULT_EXIT }),
      ]);
      battlefield = markDeadCreeps(battlefield);
      battlefield = markLeakedCreeps(battlefield, DEFAULT_EXIT);

      expect(battlefield.creeps[0].status).toBe('dead');
    });
  });

  describe('removeLeakedCreeps', () => {
    it('removes escaped creeps and returns count', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', entrance: DEFAULT_EXIT }),
        createTestCreepEntry({ id: 'c2', entrance: DEFAULT_ENTRANCE }),
      ]);
      battlefield = markLeakedCreeps(battlefield, DEFAULT_EXIT);
      const result = removeLeakedCreeps(battlefield);

      expect(result.leakedCount).toBe(1);
      expect(result.battlefield.creeps).toHaveLength(1);
      expect(result.battlefield.creeps[0].id).toBe('c2');
    });

    it('returns zero count when no leaks', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', entrance: DEFAULT_ENTRANCE }),
      ]);
      const result = removeLeakedCreeps(battlefield);

      expect(result.leakedCount).toBe(0);
      expect(result.battlefield.creeps).toHaveLength(1);
    });
  });

  describe('countAliveCreeps', () => {
    it('counts only alive creeps', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', hp: 50 }),
        createTestCreepEntry({ id: 'c2', hp: 0 }),
        createTestCreepEntry({ id: 'c3', hp: 100 }),
      ]);
      battlefield = markDeadCreeps(battlefield);

      expect(countAliveCreeps(battlefield)).toBe(2);
    });

    it('returns zero for empty battlefield', () => {
      const battlefield = createTestBattlefield();
      expect(countAliveCreeps(battlefield)).toBe(0);
    });
  });

  describe('countLeakedCreeps', () => {
    it('counts only escaped creeps', () => {
      let battlefield = createTestBattlefield();
      battlefield = addCreeps(battlefield, [
        createTestCreepEntry({ id: 'c1', entrance: DEFAULT_EXIT }),
        createTestCreepEntry({ id: 'c2', entrance: DEFAULT_ENTRANCE }),
      ]);
      battlefield = markLeakedCreeps(battlefield, DEFAULT_EXIT);

      expect(countLeakedCreeps(battlefield)).toBe(1);
    });
  });

  describe('DuelMatchState battlefield integration', () => {
    it('player and opponent have separate battlefields', () => {
      const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

      expect(state.player.battlefield).toBeDefined();
      expect(state.opponent.battlefield).toBeDefined();
      expect(state.player.battlefield).not.toBe(state.opponent.battlefield);
    });

    it('both battlefields have independent grids', () => {
      const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      const playerGrid = state.player.battlefield.grid;
      const opponentGrid = state.opponent.battlefield.grid;

      expect(playerGrid).not.toBe(opponentGrid);
      expect(playerGrid.cols).toBe(opponentGrid.cols);
      expect(playerGrid.rows).toBe(opponentGrid.rows);
    });

    it('player sends spawn on opponent field (cross-spawn rule)', () => {
      const state = sendCreep(
        createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC),
        true,
        'undead_skeleton',
        UnitTier.TIER_1,
      ).state;

      const routedState = routeQueuedSendsToBattlefields(state);

      expect(routedState.opponent.battlefield.creeps).toHaveLength(1);
      expect(routedState.opponent.battlefield.creeps[0].id).toBe('player:send:1:0:undead_skeleton');
      expect(routedState.opponent.battlefield.creeps[0].position).toEqual(DEFAULT_ENTRANCE);
      expect(routedState.player.battlefield.creeps).toHaveLength(0);
      expect(state.opponent.battlefield.creeps).toHaveLength(0);
    });

    it('computer sends spawn on player field (cross-spawn rule)', () => {
      const state = sendCreep(
        createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC),
        false,
        'orc_grunt',
        UnitTier.TIER_1,
      ).state;

      const routedState = routeQueuedSendsToBattlefields(state);

      expect(routedState.player.battlefield.creeps).toHaveLength(1);
      expect(routedState.player.battlefield.creeps[0].id).toBe('opponent:send:1:0:orc_grunt');
      expect(routedState.player.battlefield.creeps[0].position).toEqual(DEFAULT_ENTRANCE);
      expect(routedState.opponent.battlefield.creeps).toHaveLength(0);
      expect(state.player.battlefield.creeps).toHaveLength(0);
    });

    it('routes both send queues without sharing creep arrays', () => {
      let state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      state = sendCreep(state, true, 'undead_skeleton', UnitTier.TIER_1).state;
      state = sendCreep(state, false, 'orc_grunt', UnitTier.TIER_1).state;

      const routedState = routeQueuedSendsToBattlefields(state);

      expect(routedState.player.battlefield.creeps.map((creep) => creep.id)).toEqual([
        'opponent:send:1:0:orc_grunt',
      ]);
      expect(routedState.opponent.battlefield.creeps.map((creep) => creep.id)).toEqual([
        'player:send:1:0:undead_skeleton',
      ]);
      expect(routedState.player.battlefield.creeps).not.toBe(routedState.opponent.battlefield.creeps);
    });

    it('tower placement on one battlefield does not affect the other', () => {
      let state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      const tower = createTestTower({ x: 2, y: 3 });

      const updatedPlayerBf = addTower(state.player.battlefield, tower);
      state = {
        ...state,
        player: { ...state.player, battlefield: updatedPlayerBf },
      };

      expect(state.player.battlefield.towers).toHaveLength(1);
      expect(state.opponent.battlefield.towers).toHaveLength(0);
    });

    it('leak counting is independent per battlefield', () => {
      const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

      const playerBfWithLeaks = addCreeps(state.player.battlefield, [
        createTestCreepEntry({ id: 'leak1', entrance: DEFAULT_EXIT }),
      ]);
      const markedPlayerBf = markLeakedCreeps(playerBfWithLeaks, DEFAULT_EXIT);
      const { battlefield: cleanPlayerBf, leakedCount } = removeLeakedCreeps(markedPlayerBf);

      expect(leakedCount).toBe(1);
      expect(cleanPlayerBf.creeps).toHaveLength(0);
      expect(cleanPlayerBf.leakedCount).toBe(1);
      expect(state.opponent.battlefield.creeps).toHaveLength(0);
      expect(state.opponent.battlefield.leakedCount).toBe(0);
    });
  });

  describe('reconcileBattlefieldsForNextRound', () => {
    it('clears player battlefield creeps owned by the live wave runtime', () => {
      let state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      state = sendCreep(state, false, 'orc_grunt', UnitTier.TIER_1).state;
      state = routeQueuedSendsToBattlefields(state);
      expect(state.player.battlefield.creeps).toHaveLength(1);

      const reconciled = reconcileBattlefieldsForNextRound(state);

      expect(reconciled.player.battlefield.creeps).toHaveLength(0);
    });

    it('prunes dead and escaped creeps from the opponent battlefield and keeps alive ones', () => {
      const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      let opponentBf = addCreeps(state.opponent.battlefield, [
        createTestCreepEntry({ id: 'alive1', entrance: DEFAULT_ENTRANCE }),
        createTestCreepEntry({ id: 'dead1', entrance: DEFAULT_ENTRANCE }),
        createTestCreepEntry({ id: 'leak1', entrance: DEFAULT_EXIT }),
      ]);
      opponentBf = {
        ...opponentBf,
        creeps: opponentBf.creeps.map((creep) =>
          creep.id === 'dead1' ? { ...creep, hp: 0 } : creep,
        ),
      };
      opponentBf = markDeadCreeps(opponentBf);
      opponentBf = markLeakedCreeps(opponentBf, DEFAULT_EXIT);
      const stateWithCreeps = {
        ...state,
        opponent: { ...state.opponent, battlefield: opponentBf },
      };

      const reconciled = reconcileBattlefieldsForNextRound(stateWithCreeps);

      expect(reconciled.opponent.battlefield.creeps.map((creep) => creep.id)).toEqual(['alive1']);
      expect(reconciled.opponent.battlefield.leakedCount).toBe(1);
    });

    it('does not grow battlefields across repeated rounds with sends', () => {
      let state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
      for (let round = 0; round < 5; round += 1) {
        state = sendCreep(state, false, 'orc_grunt', UnitTier.TIER_1).state;
        state = routeQueuedSendsToBattlefields(state);
        state = reconcileBattlefieldsForNextRound(state);
        state = {
          ...state,
          player: { ...state.player, sendQueue: [] },
          opponent: { ...state.opponent, sendQueue: [] },
        };
      }

      expect(state.player.battlefield.creeps).toHaveLength(0);
    });
  });
});
