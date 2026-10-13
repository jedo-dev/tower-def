import type { CreepEntity, CreepSenderSide, CreepType } from '../../../../../entities/creep';
import type { UnitConfig } from '../../../../../entities/unit';
import { getRemainingRouteDistance } from '../../../pathfinding/routeProgress';
import type { WaveRoute } from '../../../pathfinding/waveRoutes';
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

/** The creep a spawn becomes, standing on the first cell of its route. */
export function createWaveCreepEntity(
  spawn: PendingWaveSpawn,
  waveNumber: number,
  route: WaveRoute,
  creepType: CreepType,
): CreepEntity {
  return {
    id: `wave:creep:${waveNumber}:${spawn.sequenceIndex}`,
    type: creepType,
    hp: spawn.unit.health,
    lifeState: 'alive',
    speed: spawn.unit.speed,
    armor: spawn.unit.armor,
    armorType: spawn.unit.armorType,
    moveType: spawn.unit.moveType,
    sizeClass: spawn.unit.sizeClass,
    status: 'alive',
    position: { x: route[0].x, y: route[0].y },
    pathIndex: 0,
    remainingRouteDistance: getRemainingRouteDistance(route, 0, 1),
    ...(spawn.sender === undefined ? {} : { sender: spawn.sender }),
  };
}
