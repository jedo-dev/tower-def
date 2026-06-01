import { isGameOverByLives, subtractLives } from '../../../../../entities/player-resources';
import { transitionToGameOver, type WavePhaseState } from '../../../../../features/wave-phase';
import type { GridPosition } from '../../../../types/pathfinding';
import type { SoundId } from '../../sound/audio.types';
import type { CreepRenderState } from '../../scenes/gameScene.types';

export type MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: number;
  creepBaseMoveSpeedPxPerSec: number;
  restartDelayMs: number;
};

export type MovementRuntimeState = {
  activeCreeps: CreepRenderState[];
  activeCreepPath: GridPosition[];
  playerGold: number;
  playerLives: number;
  isGameOver: boolean;
  restartScheduledAtMs: number | null;
  wavePhaseState: WavePhaseState;
};

export type MovementRuntimeDeps = {
  nowMs: () => number;
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  onLivesUpdated: (lives: number) => void;
  onGameOverUpdated: (isGameOver: boolean) => void;
  shouldEndRunOnLivesDepleted: () => boolean;
  onWavePhaseUpdated: (nextWavePhase: WavePhaseState) => void;
  onEscapedCountUpdated: (escapedCount: number) => void;
  onBuildStateNeedsRefresh: () => void;
  onHudChanged: () => void;
  playSound: (soundId: SoundId) => void;
};

function markCreepEscaped(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  config: MovementRuntimeConfig,
  creep: CreepRenderState,
): void {
  if (creep.entity.status === 'escaped') {
    return;
  }

  creep.entity.status = 'escaped';
  deps.playSound('combat.creep_escape');
  deps.playSound('economy.life_lost');
  const nextResources = subtractLives({ gold: state.playerGold, lives: state.playerLives }, 1);
  state.playerLives = nextResources.lives;
  deps.onLivesUpdated(state.playerLives);

  if (isGameOverByLives({ lives: state.playerLives }) && deps.shouldEndRunOnLivesDepleted()) {
    state.isGameOver = true;
    state.wavePhaseState = transitionToGameOver(state.wavePhaseState);
    state.restartScheduledAtMs ??= deps.nowMs() + config.restartDelayMs;
    deps.onWavePhaseUpdated(state.wavePhaseState);
    deps.onGameOverUpdated(state.isGameOver);
    deps.onBuildStateNeedsRefresh();
    deps.playSound('ui.game_over');
  }

  deps.onHudChanged();

  const escapedCount = state.activeCreeps.filter((candidate) => candidate.entity.status === 'escaped').length;
  deps.onEscapedCountUpdated(escapedCount);
}

export function moveCreepsAlongPath(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  config: MovementRuntimeConfig,
  deltaMs: number,
): void {
  if (state.activeCreepPath.length === 0 || state.activeCreeps.length === 0) {
    return;
  }

  const normalizedDeltaMs = Math.min(deltaMs, config.creepMaxSimulationDeltaMs);

  for (const creep of state.activeCreeps) {
    if (creep.entity.status !== 'alive') {
      continue;
    }

    const normalizedStepDistance =
      (normalizedDeltaMs / 1000) * config.creepBaseMoveSpeedPxPerSec * creep.entity.speed;

    const nextPathIndex = creep.entity.pathIndex + 1;

    if (nextPathIndex >= state.activeCreepPath.length) {
      markCreepEscaped(state, deps, config, creep);
      continue;
    }

    const nextPoint = state.activeCreepPath[nextPathIndex];
    const nextCenter = deps.toCellCenter(nextPoint);
    const dx = nextCenter.x - creep.sprite.x;
    const dy = nextCenter.y - creep.sprite.y;
    const distanceToNext = Math.hypot(dx, dy);

    if (distanceToNext <= normalizedStepDistance) {
      creep.sprite.setPosition(nextCenter.x, nextCenter.y);
      creep.entity.pathIndex = nextPathIndex;
      creep.entity.position = { x: nextPoint.x, y: nextPoint.y };

      if (nextPathIndex >= state.activeCreepPath.length - 1) {
        markCreepEscaped(state, deps, config, creep);
      }
      continue;
    }

    const ratio = normalizedStepDistance / distanceToNext;
    const nextX = creep.sprite.x + dx * ratio;
    const nextY = creep.sprite.y + dy * ratio;
    creep.sprite.setPosition(nextX, nextY);
    creep.sprite.rotation = Math.atan2(dy, dx);
  }
}
