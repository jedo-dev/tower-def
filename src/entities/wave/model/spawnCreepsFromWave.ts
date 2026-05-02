import type { CreepEntity } from '../../creep';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { WaveConfig } from './types';

const DEFAULT_CREEP_HP = 100;
const DEFAULT_CREEP_SPEED = 1;

function createCreepId(waveId: string, creepTypeId: string, spawnIndex: number): string {
  return `${waveId}:${creepTypeId}:${spawnIndex}`;
}

export function spawnCreepsFromWave(
  wave: WaveConfig,
  entrance: GridPosition,
): CreepEntity[] {
  const creeps: CreepEntity[] = [];
  let spawnIndex = 0;

  for (const spawn of wave.spawns) {
    for (let countIndex = 0; countIndex < spawn.count; countIndex += 1) {
      creeps.push({
        id: createCreepId(wave.id, spawn.creepTypeId, spawnIndex),
        type: spawn.creepTypeId,
        hp: DEFAULT_CREEP_HP,
        lifeState: 'alive',
        speed: DEFAULT_CREEP_SPEED,
        status: 'alive',
        position: { x: entrance.x, y: entrance.y },
        pathIndex: 0,
      });

      spawnIndex += 1;
    }
  }

  return creeps;
}
