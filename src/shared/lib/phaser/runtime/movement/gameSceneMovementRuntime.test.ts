import { describe, expect, it, vi } from 'vitest';
import {
  applyEffectToCreep,
  DEFAULT_CREEP_COMBAT_TRAITS,
  removeEffectFromCreep,
} from '../../../../../entities/creep';
import { resolveEffectDefinition } from '../../../../constants/effects';
import { EffectId } from '../../../../types/content-ids';

const CHILL_MAGNITUDE = resolveEffectDefinition(EffectId.CHILL).magnitude;
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

describe('shared/lib/phaser/runtime/movement status effects', () => {
  const CONFIG = {
    creepMaxSimulationDeltaMs: 100,
    creepBaseMoveSpeedPxPerSec: 100,
    restartDelayMs: 5_000,
  };

  function createDeps(): MovementRuntimeDeps {
    return {
      nowMs: () => 1_000,
      toCellCenter: (position) => ({ x: position.x * 100, y: position.y * 100 }),
      onLivesUpdated: vi.fn(),
      onGameOverUpdated: vi.fn(),
      shouldEndRunOnLivesDepleted: () => false,
      onWavePhaseUpdated: vi.fn(),
      onEscapedCountUpdated: vi.fn(),
      onBuildStateNeedsRefresh: vi.fn(),
      onHudChanged: vi.fn(),
      playSound: vi.fn(),
    };
  }

  function createWalker(): CreepRenderState {
    return {
      entity: {
        ...DEFAULT_CREEP_COMBAT_TRAITS,
        id: 'creep:walker',
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
  }

  function createState(creeps: CreepRenderState[]) {
    return {
      activeCreeps: creeps,
      activeCreepPath: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      playerGold: 100,
      playerLives: 20,
      isGameOver: false,
      restartScheduledAtMs: null,
      wavePhaseState: { phase: 'wave' as const },
    };
  }

  it('moves a chilled creep slower than an unaffected one', () => {
    const healthy = createWalker();
    const chilled = createWalker();
    chilled.entity = applyEffectToCreep(chilled.entity, { effectId: EffectId.CHILL });
    const state = createState([healthy, chilled]);

    moveCreepsAlongPath(state, createDeps(), CONFIG, 100);

    expect(chilled.sprite.x).toBeGreaterThan(0);
    expect(chilled.sprite.x).toBeLessThan(healthy.sprite.x);
    expect(chilled.sprite.x).toBeCloseTo(healthy.sprite.x * (1 - CHILL_MAGNITUDE), 5);
  });

  it('holds a stunned creep in place and releases it when the stun ends', () => {
    const stunned = createWalker();
    stunned.entity = applyEffectToCreep(stunned.entity, { effectId: EffectId.STUN });
    const state = createState([stunned]);

    moveCreepsAlongPath(state, createDeps(), CONFIG, 100);

    expect(stunned.sprite.x).toBe(0);
    expect(stunned.entity.pathIndex).toBe(0);

    stunned.entity = removeEffectFromCreep(stunned.entity, EffectId.STUN);
    moveCreepsAlongPath(state, createDeps(), CONFIG, 100);

    expect(stunned.sprite.x).toBeGreaterThan(0);
  });

  it('lets a heavily slowed creep still reach the exit', () => {
    const crawler = createWalker();
    crawler.entity = applyEffectToCreep(crawler.entity, {
      effectId: EffectId.CHILL,
      magnitude: 0.99,
      durationMs: 60_000,
    });
    const state = createState([crawler]);
    const deps = createDeps();

    for (let frame = 0; frame < 200 && crawler.entity.status === 'alive'; frame += 1) {
      moveCreepsAlongPath(state, deps, CONFIG, 100);
    }

    expect(crawler.entity.status).toBe('escaped');
  });
});
