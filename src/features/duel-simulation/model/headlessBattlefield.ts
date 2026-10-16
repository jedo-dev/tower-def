import { getCreepLeakLives, type CreepEntity, type CreepSenderSide } from '../../../entities/creep';
import { getKillGoldPenalty, type BattlefieldState } from '../../../entities/duel-match';
import {
  createInitialTowerCombatRuntime,
  createTowersWithAuras,
  getTowerKillBonusGold,
  type TowerCombatRuntime,
  type TowerEntity,
} from '../../../entities/tower';
import type { UnitConfig } from '../../../entities/unit';
import { UnitMoveType } from '../../../shared/types/content-ids';
import { selectWaveRoute, type WaveRoutes } from '../../../shared/lib/pathfinding/waveRoutes';
import {
  resolveTowerAttacks,
  tickFieldCreepEffects,
  type TowerCombatHooks,
} from '../../game-engine/runtime/combat/towerCombatCore';
import { getCreepVisualMetrics } from '../../game-engine/runtime/creep/creepVisualMetrics';
import {
  walkCreepsAlongRoutes,
  type MutablePoint,
  type RouteWalkMotion,
} from '../../game-engine/runtime/movement/routeWalk';
import {
  createWaveCreepEntity,
  hasReadyWaveSpawn,
  scheduleWaveSpawns,
  takeReadyWaveSpawns,
} from '../../game-engine/runtime/wave/waveSpawnCore';
import {
  mapUnitToCreepType,
  toCellCenter,
  writeCellCenter,
} from '../../game-engine/scenes/gameScene.helpers';
import type { PendingWaveSpawn } from '../../game-engine/scenes/gameScene.types';
import type { DuelSimulationTiming } from './duelSimulationConfig';

// One duel battlefield during a wave, without a renderer. Every step is a
// runtime core the game scene runs too:
//   spawns    waveSpawnCore      (schedule + creep entity; the scene adds a sprite)
//   movement  routeWalk          (per-size and air routes; the scene moves a sprite)
//   combat    towerCombatCore    (targeting, single/splash/chain, on-hit effects)
//   effects   towerCombatCore    (damage over time, expiry)
// Positions live in plain points where the scene keeps sprites; nothing here
// draws, plays sounds or fades corpses.

export type HeadlessCreep = {
  entity: CreepEntity;
  footprintCenterOffsetPx: number;
  positionPx: MutablePoint;
};

export type HeadlessTower = {
  entity: TowerEntity;
  runtime: TowerCombatRuntime;
};

export type HeadlessBattlefield = {
  /** Routes fixed for this wave, one per footprint. */
  routes: WaveRoutes;
  towers: HeadlessTower[];
  /** Every creep spawned this wave, alive, dead or escaped. */
  creeps: HeadlessCreep[];
  pendingSpawns: PendingWaveSpawn[];
  waveNumber: number;
  elapsedMs: number;
  kills: number;
  /** Extra gold kills by aura-buffed towers earned (`goldPerKill`), on top of the bounty. */
  killBonusGold: number;
  leaks: number;
  /** Leaks of creeps the other side sent; they steal lives for the sender. */
  sentLeaks: number;
  /** Leaks of air creeps, which fly the straight air route over the maze. */
  airLeaks: number;
  /** Lives the leaks take (`leakLivesTaken`, one per leak by default). */
  leakedLives: number;
  /** Lives the sent creeps' leaks take; what steals lives for the sender. */
  sentLeakedLives: number;
  /** Gold the sender earns from its leaked creeps (`leakGoldToSender`). */
  leakGoldToSender: number;
  /** Gold the defender loses for its kills (`killGoldPenaltyToDefender`). */
  killGoldPenalty: number;
};

export type HeadlessWaveInput = {
  battlefield: BattlefieldState;
  waveNumber: number;
  baselineUnits: readonly UnitConfig[];
  /** Units the other side sent to this battlefield. */
  sentUnits: readonly UnitConfig[];
  /** The side that sent `sentUnits`. */
  sender: CreepSenderSide;
  timing: DuelSimulationTiming;
};

/** Tower copies with their aura bonuses applied, so the duel state stays untouched. */
function createHeadlessTowers(towers: readonly TowerEntity[]): HeadlessTower[] {
  return createTowersWithAuras(towers).map((entity) => ({
    entity,
    runtime: createInitialTowerCombatRuntime(),
  }));
}

export function createHeadlessBattlefield(input: HeadlessWaveInput): HeadlessBattlefield {
  return {
    routes: input.battlefield.routes,
    towers: createHeadlessTowers(input.battlefield.towers),
    creeps: [],
    pendingSpawns: scheduleWaveSpawns(input.baselineUnits, input.sentUnits, input.sender, {
      firstSpawnAtMs: input.timing.firstSpawnDelayMs,
      spawnIntervalMs: input.timing.spawnIntervalMs,
    }),
    waveNumber: input.waveNumber,
    elapsedMs: 0,
    kills: 0,
    killBonusGold: 0,
    leaks: 0,
    sentLeaks: 0,
    airLeaks: 0,
    leakedLives: 0,
    sentLeakedLives: 0,
    leakGoldToSender: 0,
    killGoldPenalty: 0,
  };
}

const HEADLESS_MOTION: RouteWalkMotion<HeadlessCreep> = {
  writeCellCenter,
  baseMoveSpeedPxPerSec: 0,
  readPositionPx: (creep, out) => {
    out.x = creep.positionPx.x;
    out.y = creep.positionPx.y;
  },
  commitMove: (creep, position) => {
    creep.positionPx.x = position.x;
    creep.positionPx.y = position.y;
  },
};

function noop(): void {}

/** Combat hooks with no visuals: only kills are counted. */
function createHeadlessCombatHooks(
  field: HeadlessBattlefield,
): TowerCombatHooks<HeadlessCreep, HeadlessTower> {
  return {
    toCellCenter,
    onCreepHit: noop,
    onTargetStruck: noop,
    onDamageDealt: noop,
    onEffectApplied: noop,
    onEffectsTicked: noop,
    onCreepKilled: (creep, killer) => {
      field.kills += 1;
      field.killGoldPenalty += getKillGoldPenalty(creep.entity);
      if (killer) {
        field.killBonusGold += getTowerKillBonusGold(killer.entity);
      }
    },
    onTowerFired: noop,
  };
}

function spawnReadyCreeps(field: HeadlessBattlefield): void {
  // Between spawns the schedule stays as is: no per-step copy of it.
  if (!hasReadyWaveSpawn(field.pendingSpawns, field.elapsedMs)) {
    return;
  }
  const { ready, pending } = takeReadyWaveSpawns(field.pendingSpawns, field.elapsedMs);
  field.pendingSpawns = pending;

  for (const spawn of ready) {
    const route = selectWaveRoute(field.routes, spawn.unit);
    if (route.length === 0) {
      // Nothing to walk (a sealed ground route): the creep cannot spawn.
      continue;
    }
    const start = toCellCenter(route[0]);
    const { footprintCenterOffsetPx } = getCreepVisualMetrics(spawn.unit.sizeClass);
    field.creeps.push({
      entity: createWaveCreepEntity(spawn, field.waveNumber, route, mapUnitToCreepType(spawn.unit)),
      footprintCenterOffsetPx,
      positionPx: { x: start.x + footprintCenterOffsetPx, y: start.y + footprintCenterOffsetPx },
    });
  }
}

function markEscaped(field: HeadlessBattlefield, creep: HeadlessCreep): void {
  if (creep.entity.status === 'escaped') {
    return;
  }
  creep.entity.status = 'escaped';
  const lives = getCreepLeakLives(creep.entity);
  field.leaks += 1;
  field.leakedLives += lives;
  if (creep.entity.sender !== undefined) {
    field.sentLeaks += 1;
    field.sentLeakedLives += lives;
    field.leakGoldToSender += creep.entity.abilities?.leakGoldToSender ?? 0;
  }
  if (creep.entity.moveType === UnitMoveType.AIR) {
    field.airLeaks += 1;
  }
}

export type HeadlessStepper = {
  field: HeadlessBattlefield;
  step: (deltaMs: number) => void;
};

/**
 * Wraps a battlefield with its per-step pipeline, in the game scene's frame
 * order: spawns, movement, tower attacks, status effects. The step is used as
 * given: the scene's frame-hitch clamps exist for variable frame times and do
 * not apply to a fixed simulation step.
 */
export function createHeadlessStepper(
  field: HeadlessBattlefield,
  baseMoveSpeedPxPerSec: number,
): HeadlessStepper {
  const hooks = createHeadlessCombatHooks(field);
  const motion: RouteWalkMotion<HeadlessCreep> = { ...HEADLESS_MOTION, baseMoveSpeedPxPerSec };
  const onReachedExit = (creep: HeadlessCreep): void => markEscaped(field, creep);

  return {
    field,
    step: (deltaMs) => {
      field.elapsedMs += deltaMs;
      spawnReadyCreeps(field);
      walkCreepsAlongRoutes(field.creeps, field.routes, motion, deltaMs, onReachedExit);
      resolveTowerAttacks(field, hooks, deltaMs);
      tickFieldCreepEffects(field, hooks, deltaMs);
    },
  };
}

/** The wave is over on this field: everything spawned and nothing is still walking. */
export function isHeadlessBattlefieldResolved(field: HeadlessBattlefield): boolean {
  return (
    field.pendingSpawns.length === 0 &&
    field.creeps.every((creep) => creep.entity.status !== 'alive')
  );
}
