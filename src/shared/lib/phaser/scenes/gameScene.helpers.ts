import type { CreepEntity } from '../../../../entities/creep';
import type { UnitConfig } from '../../../../entities/unit';
import type { HudFactionType } from '../../game-bridge/types';
import type { CreepRenderState, HudWaveQueueItem } from './gameScene.types';

export function mapEnemyFactionToHudFaction(faction: string): HudFactionType {
  if (faction === 'ORC' || faction === 'HUMAN' || faction === 'ELF') {
    return faction.toLowerCase() as HudFactionType;
  }

  return 'undead';
}

export function mapEntityToWaveQueueType(creep: CreepEntity): HudWaveQueueItem['type'] {
  void creep;
  return 'ghoul';
}

export function mapUnitToCreepType(unit: UnitConfig): 'basic' {
  void unit;
  return 'basic';
}

export function buildHudWaveQueue(activeCreeps: CreepRenderState[]): HudWaveQueueItem[] {
  return activeCreeps
    .map((creep, index) => {
      if (creep.entity.status !== 'alive') {
        return null;
      }

      const creepType = mapEntityToWaveQueueType(creep.entity);
      return {
        type: creepType,
        index,
      };
    })
    .filter((creep): creep is HudWaveQueueItem => creep !== null);
}
