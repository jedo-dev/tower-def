import {
  createCreepAbilityRuntime,
  type CreepEntity,
  type CreepSenderSide,
  type CreepType,
} from '../../../../entities/creep';
import type { UnitConfig } from '../../../../entities/unit';
import { scaleHealthForWave } from '../../../../entities/wave';
import { getRemainingRouteDistance } from '../../../../shared/lib/pathfinding/routeProgress';
import type { WaveRoute } from '../../../../shared/lib/pathfinding/waveRoutes';
import type { PendingWaveSpawn } from '../../scenes/gameScene.types';

// Renderer-free core of wave spawning: the spawn schedule and the creep entity
// a spawn turns into. The Phaser wave runtime adds the sprite; the headless
// duel simulation uses the entity as is.

export type WaveSpawnTiming = {
  firstSpawnAtMs: number;
  spawnIntervalMs: number;
};

/**
 * One spawn per unit, evenly spaced: baseline units first, then the units the
 * other side sent, tagged with their `sender`.
 */
export function scheduleWaveSpawns(
  baselineUnits: readonly UnitConfig[],
  sentUnits: readonly UnitConfig[],
  sender: CreepSenderSide,
  timing: WaveSpawnTiming,
): PendingWaveSpawn[] {
  const waveUnits = [...baselineUnits, ...sentUnits];
  return waveUnits.map((unit, index) => ({
    unit,
    sequenceIndex: index,
    spawnAtMs: timing.firstSpawnAtMs + index * timing.spawnIntervalMs,
    ...(index >= baselineUnits.length ? { sender } : {}),
  }));
}

export type ReadyWaveSpawns = {
  ready: PendingWaveSpawn[];
  pending: PendingWaveSpawn[];
};

/** Splits the schedule into spawns due at `nowMs` and those still waiting. */
export function takeReadyWaveSpawns(
  spawns: readonly PendingWaveSpawn[],
  nowMs: number,
): ReadyWaveSpawns {
  return {
    ready: spawns.filter((spawn) => spawn.spawnAtMs <= nowMs),
    pending: spawns.filter((spawn) => spawn.spawnAtMs > nowMs),
  };
}

/**
 * The creep a spawn becomes, standing on the first cell of its route, with its
 * health grown to the wave it spawns in.
 */
export function createWaveCreepEntity(
  spawn: PendingWaveSpawn,
  waveNumber: number,
  route: WaveRoute,
  creepType: CreepType,
): CreepEntity {
  const spawnHp = scaleHealthForWave(spawn.unit.health, waveNumber);
  const routeDistance = getRemainingRouteDistance(route, 0, 1);
  const { abilities } = spawn.unit;

  return {
    id: `wave:creep:${waveNumber}:${spawn.sequenceIndex}`,
    type: creepType,
    hp: spawnHp,
    maxHp: spawnHp,
    lifeState: 'alive',
    speed: spawn.unit.speed,
    physicalArmor: spawn.unit.physicalArmor,
    magicalArmor: spawn.unit.magicalArmor,
    moveType: spawn.unit.moveType,
    sizeClass: spawn.unit.sizeClass,
    status: 'alive',
    position: { x: route[0].x, y: route[0].y },
    pathIndex: 0,
    remainingRouteDistance: routeDistance,
    ...(spawn.sender === undefined ? {} : { sender: spawn.sender }),
    ...(abilities === undefined
      ? {}
      : { abilities, ...createCreepAbilityRuntime(abilities, routeDistance) }),
  };
}
