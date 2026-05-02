import { isCreepDead } from './lifeState';
import type { CreepEntity } from './types';

export function filterActiveWaveCreeps(creeps: CreepEntity[]): CreepEntity[] {
  return creeps.filter((creep) => !isCreepDead(creep) && creep.status !== 'escaped');
}
