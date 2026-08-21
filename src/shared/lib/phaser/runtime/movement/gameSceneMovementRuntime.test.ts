import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { moveCreepsAlongPath, type MovementRuntimeDeps } from './gameSceneMovementRuntime';

function createSpriteStub(): Phaser.GameObjects.Sprite {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    setPosition: vi.fn(function setPosition(this: Phaser.GameObjects.Sprite, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
  } as unknown as Phaser.GameObjects.Sprite;
}

describe('shared/lib/phaser/runtime/movement duel game-over boundary', () => {
  it('does not end the match immediately when legacy lives hit zero in duel mode', () => {
    const creep: CreepRenderState = {
      entity: {
        ...DEFAULT_CREEP_COMBAT_TRAITS,
        id: 'wave:creep:1:0',
        type: 'basic',
        hp: 100,
        lifeState: 'alive',
        speed: 1,
        status: 'alive',
        position: { x: 0, y: 0 },
        pathIndex: 0,
      },
      sprite: createSpriteStub(),
      hitFlashRemainingMs: 0,
      deathFadeRemainingMs: 0,
    };
    const deps: MovementRuntimeDeps = {
      nowMs: () => 1_000,
      toCellCenter: (position) => position,
      onLivesUpdated: vi.fn(),
      onGameOverUpdated: vi.fn(),
      shouldEndRunOnLivesDepleted: () => false,
      onWavePhaseUpdated: vi.fn(),
      onEscapedCountUpdated: vi.fn(),
      onBuildStateNeedsRefresh: vi.fn(),
      onHudChanged: vi.fn(),
      playSound: vi.fn(),
    };
    const state = {
      activeCreeps: [creep],
      activeCreepPath: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      playerGold: 100,
      playerLives: 1,
      isGameOver: false,
      restartScheduledAtMs: null,
      wavePhaseState: { phase: 'wave' as const },
    };

    moveCreepsAlongPath(
      state,
      deps,
      {
        creepMaxSimulationDeltaMs: 1_000,
        creepBaseMoveSpeedPxPerSec: 10,
        restartDelayMs: 5_000,
      },
      1_000,
    );

    expect(state.playerLives).toBe(0);
    expect(creep.entity.status).toBe('escaped');
    expect(state.isGameOver).toBe(false);
    expect(state.wavePhaseState.phase).toBe('wave');
    expect(deps.onGameOverUpdated).not.toHaveBeenCalled();
  });
});
