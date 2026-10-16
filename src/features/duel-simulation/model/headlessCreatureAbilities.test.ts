import { describe, expect, it } from 'vitest';
import {
  addTower,
  createInitialDuelMatchState,
  refreshBattlefieldRoutes,
  type BattlefieldState,
} from '../../../entities/duel-match';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../../entities/tower';
import { resolveUnitConfigById, type UnitConfig } from '../../../entities/unit';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { canPlaceFootprint } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { CreatureAbilities } from '../../../shared/types/creatureAbilities';
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

// Headless duel integration of the creature abilities that settle a wave:
// leak lives, leak gold for the sender and the defender's kill penalty.

function emptyBoard(): BattlefieldState {
  return createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC).player.battlefield;
}

/** Single towers along both sides of the straight default route. */
function guardedBoard(): BattlefieldState {
  let battlefield = emptyBoard();
  const route = battlefield.routes.small;
  for (let index = 2; index < route.length - 2; index += 2) {
    for (const rowOffset of [-3, 3]) {
      const anchor = { x: route[index].x, y: route[index].y + rowOffset };
      if (canPlaceFootprint(battlefield.grid, anchor, TOWER_FOOTPRINT)) {
        battlefield = addTower(battlefield, {
          id: `test:tower:${anchor.x}:${anchor.y}`,
          position: anchor,
          cost: 0,
          type: TowerTypeId.SINGLE,
          level: TOWER_BASE_LEVEL,
          combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE] },
        });
      }
    }
  }
  return refreshBattlefieldRoutes(battlefield);
}

function unitWith(abilities: CreatureAbilities, health?: number): UnitConfig {
  return {
    ...resolveUnitConfigById('undead_skeleton'),
    abilities,
    ...(health === undefined ? {} : { health }),
  };
}

function runWave(
  battlefield: BattlefieldState,
  baselineUnits: readonly UnitConfig[],
  sentUnits: readonly UnitConfig[],
): HeadlessBattlefield {
  const field = createHeadlessBattlefield({
    battlefield,
    waveNumber: 1,
    baselineUnits,
    sentUnits,
    sender: 'opponent',
    timing: DUEL_SIMULATION_TIMING,
  });
  const stepper = createHeadlessStepper(field, DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC);
  let ticks = 0;
  while (!isHeadlessBattlefieldResolved(field) && ticks < DuelSimulationDefaults.MAX_WAVE_TICKS) {
    stepper.step(DuelSimulationDefaults.TICK_MS);
    ticks += 1;
  }
  return field;
}

describe('headless creature ability settlement', () => {
  it('weights leaks by leakLivesTaken and pays the sender its leak gold', () => {
    const heavy = unitWith({ leakLivesTaken: 3, leakGoldToSender: 4 });
    const field = runWave(emptyBoard(), [heavy, resolveUnitConfigById('undead_skeleton')], [heavy]);

    expect(field.leaks).toBe(3);
    expect(field.leakedLives).toBe(7);
    expect(field.sentLeaks).toBe(1);
    expect(field.sentLeakedLives).toBe(3);
    // The baseline heavy leaked too, but only a sent creep pays its sender.
    expect(field.leakGoldToSender).toBe(4);
  });

  it('sums the kill penalty of every creature the defender kills', () => {
    const fragile = unitWith({ killGoldPenaltyToDefender: 5 }, 1);
    const field = runWave(guardedBoard(), [fragile, fragile], []);

    expect(field.kills).toBe(2);
    expect(field.killGoldPenalty).toBe(10);
  });

  it('settles a creature without abilities as one life and no gold', () => {
    const plain = resolveUnitConfigById('undead_skeleton');
    const field = runWave(emptyBoard(), [plain], [plain]);

    expect(field.leakedLives).toBe(field.leaks);
    expect(field.sentLeakedLives).toBe(field.sentLeaks);
    expect(field.leakGoldToSender).toBe(0);
    expect(field.killGoldPenalty).toBe(0);
  });
});
