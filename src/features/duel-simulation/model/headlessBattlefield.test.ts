import { describe, expect, it } from 'vitest';
import {
  addTower,
  createInitialDuelMatchState,
  refreshBattlefieldRoutes,
  type BattlefieldState,
} from '../../../entities/duel-match';
import {
  TOWER_BASE_LEVEL,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../entities/tower';
import { getUnitsByFaction } from '../../../entities/unit';
import { generateWaveUnits } from '../../../entities/wave';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { canPlaceFootprint } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
import { createSeededRandom } from '../../../shared/lib/random/createSeededRandom';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import {
  DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC,
  DUEL_SIMULATION_TIMING,
  DuelSimulationDefaults,
} from './duelSimulationConfig';
import {
  createHeadlessBattlefield,
  createHeadlessStepper,
  isHeadlessBattlefieldResolved,
  type HeadlessBattlefield,
} from './headlessBattlefield';

/** Tower anchors sit this many rows above and below the straight route. */
const TOWER_ROW_OFFSETS = [-3, 3] as const;
const TOWER_EVERY_ROUTE_CELLS = 2;
const WAVE_NUMBER = 1;

function createTower(type: TowerTypeId, x: number, y: number): TowerEntity {
  return {
    id: `test:tower:${x}:${y}`,
    position: { x, y },
    cost: 0,
    type,
    level: TOWER_BASE_LEVEL,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[type] },
  };
}

/** Lines both sides of the straight default route with towers of `types`, alternating. */
function createFixedBoard(types: readonly TowerTypeId[]): BattlefieldState {
  let battlefield = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC).player.battlefield;
  const route = battlefield.routes.small;

  for (let index = 2; index < route.length - 2; index += TOWER_EVERY_ROUTE_CELLS) {
    for (const rowOffset of TOWER_ROW_OFFSETS) {
      const anchor = { x: route[index].x, y: route[index].y + rowOffset };
      if (!canPlaceFootprint(battlefield.grid, anchor, TOWER_FOOTPRINT)) {
        continue;
      }
      const type = types[battlefield.towers.length % types.length];
      battlefield = addTower(battlefield, createTower(type, anchor.x, anchor.y));
    }
  }

  return refreshBattlefieldRoutes(battlefield);
}

function runWave(battlefield: BattlefieldState): { field: HeadlessBattlefield; ticks: number } {
  const baselineUnits = generateWaveUnits({
    waveNumber: WAVE_NUMBER,
    factionUnits: [...getUnitsByFaction(RaceId.UNDEAD)],
    random: createSeededRandom(7),
  });
  const field = createHeadlessBattlefield({
    battlefield,
    waveNumber: WAVE_NUMBER,
    baselineUnits,
    sentUnits: baselineUnits.slice(0, 2),
    sender: 'opponent',
    timing: DUEL_SIMULATION_TIMING,
  });
  const stepper = createHeadlessStepper(field, DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC);

  let ticks = 0;
  while (!isHeadlessBattlefieldResolved(field) && ticks < DuelSimulationDefaults.MAX_WAVE_TICKS) {
    stepper.step(DuelSimulationDefaults.TICK_MS);
    ticks += 1;
  }
  return { field, ticks };
}

describe('features/duel-simulation/headlessBattlefield', () => {
  it('lets every creep leak on an empty board', () => {
    const empty = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC).player.battlefield;
    const { field, ticks } = runWave(empty);

    expect(isHeadlessBattlefieldResolved(field)).toBe(true);
    expect(ticks).toBeLessThan(DuelSimulationDefaults.MAX_WAVE_TICKS);
    expect(field.kills).toBe(0);
    expect(field.leaks).toBe(field.creeps.length);
    expect(field.sentLeaks).toBe(2);
  });

  it('kills creeps with single, splash, frost, poison and chain towers', () => {
    const board = createFixedBoard([
      TowerTypeId.SINGLE,
      TowerTypeId.SPLASH,
      TowerTypeId.FROST,
      TowerTypeId.POISON,
      TowerTypeId.CHAIN,
    ]);
    const { field } = runWave(board);

    expect(board.towers.length).toBeGreaterThan(4);
    expect(isHeadlessBattlefieldResolved(field)).toBe(true);
    expect(field.kills).toBeGreaterThan(0);
    expect(field.kills + field.leaks).toBe(field.creeps.length);
  });

  it('replays the same wave identically', () => {
    const board = createFixedBoard([TowerTypeId.SINGLE, TowerTypeId.FROST]);
    const first = runWave(board);
    const second = runWave(board);

    expect(second.ticks).toBe(first.ticks);
    expect(second.field.kills).toBe(first.field.kills);
    expect(second.field.creeps.map((creep) => creep.entity)).toEqual(
      first.field.creeps.map((creep) => creep.entity),
    );
  });

  it('does not touch the towers of the battlefield it was built from', () => {
    const board = createFixedBoard([TowerTypeId.SINGLE, TowerTypeId.SUPPORT]);
    const before = structuredClone(board.towers);
    runWave(board);

    expect(board.towers).toEqual(before);
  });
});
