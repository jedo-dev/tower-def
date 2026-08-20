import {
  builderFactions,
  type BuilderFactionConfig,
} from '../../../../entities/builder-faction';
import type { CreepEntity } from '../../../../entities/creep';
import { buildableTowers, type BuildableTowerConfig } from '../../../../entities/tower';
import { getUnitsByFaction, undeadUnits, type UnitConfig } from '../../../../entities/unit';
import { GRID_DIMENSIONS } from '../../../constants/grid';
import { TowerCombatConfig } from '../../../constants/tower';
import { RaceId } from '../../../types/content-ids';
import type { GridPosition } from '../../../types/pathfinding';
import type { HudFactionType, MatchOutcomeStatus } from '../../game-bridge/types';
import { BONE_ARCHER_TOWER_CONFIG, PLAGUE_TOWER_CONFIG } from './gameScene.constants';
import type { CreepRenderState, HudWaveQueueItem, PendingWaveSpawn } from './gameScene.types';

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

export function buildHudWaveQueueWithPending(
  activeCreeps: CreepRenderState[],
  pendingWaveSpawns: readonly PendingWaveSpawn[],
): HudWaveQueueItem[] {
  const queue = buildHudWaveQueue(activeCreeps);

  for (const spawn of pendingWaveSpawns) {
    if (spawn.unit.id.includes('ghoul')) {
      queue.push({ type: 'ghoul', index: queue.length });
      continue;
    }
    if (spawn.unit.id.includes('crypt_fiend')) {
      queue.push({ type: 'crypt_fiend', index: queue.length });
      continue;
    }
    if (spawn.unit.id.includes('gargoyle')) {
      queue.push({ type: 'gargoyle', index: queue.length });
      continue;
    }
    queue.push({ type: 'skeleton', index: queue.length });
  }

  return queue;
}

export function mapUnitIdToHudCreepType(unitId: string): HudWaveQueueItem['type'] {
  if (
    unitId.includes('ghoul') ||
    unitId.includes('grunt') ||
    unitId.includes('footman') ||
    unitId.includes('huntress')
  ) {
    return 'ghoul';
  }
  if (
    unitId.includes('crypt_fiend') ||
    unitId.includes('troll') ||
    unitId.includes('rifleman') ||
    unitId.includes('dryad')
  ) {
    return 'crypt_fiend';
  }
  if (
    unitId.includes('gargoyle') ||
    unitId.includes('rider') ||
    unitId.includes('engine') ||
    unitId.includes('chimera')
  ) {
    return 'gargoyle';
  }
  return 'skeleton';
}

export function buildHudSendQueue(sendQueue: readonly string[]): HudWaveQueueItem[] {
  return sendQueue.map((unitId, index) => ({
    type: mapUnitIdToHudCreepType(unitId),
    index,
  }));
}

export function mapHudFactionToRaceId(faction: HudFactionType): RaceId {
  switch (faction) {
    case 'orc':
      return RaceId.ORC;
    case 'human':
      return RaceId.HUMAN;
    case 'elf':
      return RaceId.ELF;
    case 'undead':
      return RaceId.UNDEAD;
  }
}

export function mapRaceIdToHudFaction(raceId: RaceId): HudFactionType {
  switch (raceId) {
    case RaceId.ORC:
      return 'orc';
    case RaceId.HUMAN:
      return 'human';
    case RaceId.ELF:
      return 'elf';
    case RaceId.UNDEAD:
      return 'undead';
  }
}

export function resolveMatchOutcomeStatus(
  isMatchOver: boolean,
  playerHp: number,
  opponentHp: number,
): MatchOutcomeStatus {
  if (!isMatchOver) {
    return 'active';
  }
  const isPlayerDead = playerHp <= 0;
  const isOpponentDead = opponentHp <= 0;
  if (isPlayerDead && isOpponentDead) {
    return 'draw';
  }
  return isOpponentDead ? 'player-won' : 'player-lost';
}

export function toCellCenter(position: GridPosition): { x: number; y: number } {
  return {
    x: position.x * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
    y: position.y * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
  };
}

export function toGridCellKey(position: GridPosition): string {
  return `${position.x}:${position.y}`;
}

export function toTowerId(position: GridPosition): string {
  return `tower:${position.x}:${position.y}`;
}

export function resolveTowerRangeCells(selectedTowerType: 'archer' | 'splash' | null): number {
  const towerType = selectedTowerType ?? 'archer';
  if (towerType === 'splash') {
    return TowerCombatConfig.SPLASH_RANGE_CELLS;
  }
  return TowerCombatConfig.ARCHER_RANGE_CELLS;
}

export function resolveFactionUnits(raceId: RaceId): UnitConfig[] {
  const factionUnits = getUnitsByFaction(raceId);
  return factionUnits.length > 0 ? [...factionUnits] : [...undeadUnits];
}

export function resolveBuilderFaction(builderFactionId: RaceId): BuilderFactionConfig {
  const faction = builderFactions.find((candidate) => candidate.id === builderFactionId);
  return faction ?? builderFactions[0];
}

export function resolveBuildableTowerConfig(
  builderFactionId: RaceId,
  towerType: 'archer' | 'splash',
): BuildableTowerConfig | null {
  const factionTower = buildableTowers.find(
    (tower) => tower.faction === builderFactionId && tower.towerType === towerType,
  );
  if (factionTower) {
    return factionTower;
  }

  return towerType === 'splash' ? PLAGUE_TOWER_CONFIG : BONE_ARCHER_TOWER_CONFIG;
}
