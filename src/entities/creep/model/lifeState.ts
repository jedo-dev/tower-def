import type { CreepEntity, CreepLifeState } from './types';

export function isCreepAlive(creep: CreepEntity): boolean {
  return creep.lifeState === 'alive' && creep.status === 'alive';
}

export function isCreepDead(creep: CreepEntity): boolean {
  return creep.lifeState === 'dead' || creep.status === 'dead' || creep.hp <= 0;
}

export function setCreepLifeState(
  creep: CreepEntity,
  lifeState: CreepLifeState,
): CreepEntity {
  if (lifeState === 'alive') {
    return {
      ...creep,
      lifeState: 'alive',
      status: creep.status === 'dead' ? 'alive' : creep.status,
    };
  }

  return {
    ...creep,
    lifeState: 'dead',
    status: 'dead',
    hp: Math.max(creep.hp, 0),
  };
}
