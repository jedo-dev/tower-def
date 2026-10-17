import { TowerTypeId } from '../../../shared/types/content-ids';
import { builderFactions, type BuilderFactionConfig } from '../../../entities/builder-faction';
import type { DuelMatchEndReason, DuelSide } from '../../../entities/duel-match';
import {
  buildableTowers,
  getTowerArchetype,
  type BuildableTowerConfig,
} from '../../../entities/tower';
import { getUnitsByFaction, undeadUnits, type UnitConfig } from '../../../entities/unit';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import { RaceId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type {
  GamePhase,
  HudFactionType,
  MatchOutcomeReason,
  MatchOutcomeStatus,
  WaveQueueItem,
} from '../../../shared/lib/game-bridge/types';
import { BONE_ARCHER_TOWER_CONFIG, PLAGUE_TOWER_CONFIG } from './gameScene.constants';
import type { CreepRenderState, PendingWaveSpawn } from './gameScene.types';

export function mapEnemyFactionToHudFaction(faction: string): HudFactionType {
  if (faction === 'ORC' || faction === 'HUMAN' || faction === 'ELF') {
    return faction.toLowerCase() as HudFactionType;
  }

  return 'undead';
}

export function mapUnitToCreepType(unit: UnitConfig): 'basic' {
  void unit;
  return 'basic';
}

export function buildHudWaveQueue(activeCreeps: CreepRenderState[]): WaveQueueItem[] {
  // Index the filtered list sequentially: positional indexes of the source
  // array leave gaps after dead creeps and collide with the pending-spawn
  // indexes appended in buildHudWaveQueueWithPending (queue.length-based).
  const queue: WaveQueueItem[] = [];
  for (const creep of activeCreeps) {
    if (creep.entity.status !== 'alive' || creep.unitId === undefined) continue;
    queue.push({ creepTypeId: creep.unitId, index: queue.length });
  }
  return queue;
}

export function buildHudWaveQueueWithPending(
  activeCreeps: CreepRenderState[],
  pendingWaveSpawns: readonly PendingWaveSpawn[],
): WaveQueueItem[] {
  const queue = buildHudWaveQueue(activeCreeps);
  for (const spawn of pendingWaveSpawns) {
    queue.push({ creepTypeId: spawn.unit.id, index: queue.length });
  }
  return queue;
}

/**
 * The computer's sends as the HUD shows them. The computer decides its sends
 * at wave start and the same call routes them onto the player's field, so its
 * live queue is empty in every published snapshot. During the wave the HUD
 * gets the sends it made for this wave (now incoming); in the build phase,
 * the live queue (what is queued for the next wave, if anything).
 */
export function resolveHudOpponentSends(
  phase: GamePhase,
  queuedForNextWave: readonly string[],
  sentThisWave: readonly string[],
): readonly string[] {
  return phase === 'wave' ? sentThisWave : queuedForNextWave;
}

export function buildHudSendQueue(sendQueue: readonly string[]): WaveQueueItem[] {
  return sendQueue.map((unitId, index) => ({ creepTypeId: unitId, index }));
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

/** The player's view of a settled match; the settlement already broke any tie. */
export function resolveMatchOutcomeStatus(
  isMatchOver: boolean,
  winningSide: DuelSide | null,
): MatchOutcomeStatus {
  if (!isMatchOver) {
    return 'active';
  }
  if (winningSide === null) {
    return 'draw';
  }
  return winningSide === 'player' ? 'player-won' : 'player-lost';
}

const MATCH_OUTCOME_REASON_BY_END_REASON: Readonly<Record<DuelMatchEndReason, MatchOutcomeReason>> =
  {
    knockout: 'knockout',
    fewer_leaks: 'fewer-leaks',
    more_lives_before_wave: 'more-lives',
    draw: 'even',
  };

export function mapDuelEndReasonToOutcomeReason(
  endReason: DuelMatchEndReason | null,
): MatchOutcomeReason | null {
  return endReason === null ? null : MATCH_OUTCOME_REASON_BY_END_REASON[endReason];
}

/**
 * The one wave number the HUD shows: the wave being fought (or the one that
 * just ended the match), and the upcoming wave while building.
 *
 * @param wavesStarted waves started so far this match; 0 before the first.
 */
export function resolveHudWaveNumber(wavesStarted: number, phase: GamePhase): number {
  return phase === 'build' ? wavesStarted + 1 : Math.max(1, wavesStarted);
}

export function toCellCenter(position: GridPosition): { x: number; y: number } {
  return {
    x: position.x * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
    y: position.y * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
  };
}

/** Allocation-free `toCellCenter` for per-frame callers: writes into `out`. */
export function writeCellCenter(position: GridPosition, out: { x: number; y: number }): void {
  out.x = position.x * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2;
  out.y = position.y * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2;
}

export function toGridCellKey(position: GridPosition): string {
  return `${position.x}:${position.y}`;
}

export function toTowerId(position: GridPosition): string {
  return `tower:${position.x}:${position.y}`;
}

/**
 * Radius the build preview draws: a tower shows its firing range, a support
 * tower shows the area its aura would cover.
 */
export function resolveTowerRangeCells(selectedTowerType: TowerTypeId | null): number {
  const archetype = getTowerArchetype(selectedTowerType ?? TowerTypeId.SINGLE);

  return archetype.aura?.radiusCells ?? archetype.range;
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
  towerType: TowerTypeId,
): BuildableTowerConfig | null {
  const factionTower = buildableTowers.find(
    (tower) => tower.faction === builderFactionId && tower.towerType === towerType,
  );
  if (factionTower) {
    return factionTower;
  }

  return towerType === TowerTypeId.SPLASH ? PLAGUE_TOWER_CONFIG : BONE_ARCHER_TOWER_CONFIG;
}
