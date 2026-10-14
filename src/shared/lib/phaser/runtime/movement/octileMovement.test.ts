import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import { UnitSizeClass } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';
import type { WaveRoutes } from '../../../pathfinding/waveRoutes';
import { getCreepVisualMetrics } from '../creep/creepVisualMetrics';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  moveCreepsAlongPath,
  type MovementRuntimeDeps,
  type MovementRuntimeState,
  type MutablePoint,
} from './gameSceneMovementRuntime';

const CELL_SIZE_PX = 16;
const SPEED_PX_PER_SEC = 64;
/** One orthogonal cell takes 250 ms at this speed; a diagonal one sqrt(2) times that. */
const ORTHOGONAL_STEP_MS = (CELL_SIZE_PX / SPEED_PX_PER_SEC) * 1000;
const DIAGONAL_STEP_MS = ORTHOGONAL_STEP_MS * Math.SQRT2;
/** Absorbs floating point error when a frame should land exactly on a waypoint. */
const EPSILON_MS = 0.01;
const CONFIG = {
  creepMaxSimulationDeltaMs: 10_000,
  creepBaseMoveSpeedPxPerSec: SPEED_PX_PER_SEC,
  restartDelayMs: 0,
};

function writeCellCenter(position: GridPosition, out: MutablePoint): void {
  out.x = position.x * CELL_SIZE_PX + CELL_SIZE_PX / 2;
  out.y = position.y * CELL_SIZE_PX + CELL_SIZE_PX / 2;
}

function createDeps(overrides: Partial<MovementRuntimeDeps> = {}): MovementRuntimeDeps {
  return {
    nowMs: () => 0,
    writeCellCenter,
    onLivesUpdated: vi.fn(),
    onGameOverUpdated: vi.fn(),
    shouldEndRunOnLivesDepleted: () => false,
    onWavePhaseUpdated: vi.fn(),
    onEscapedCountUpdated: vi.fn(),
    onBuildStateNeedsRefresh: vi.fn(),
    onHudChanged: vi.fn(),
    playSound: vi.fn(),
    soundRouter: { playTowerSound: vi.fn(), playCreepSound: vi.fn() },
    ...overrides,
  };
}

function createCreep(
  start: GridPosition,
  sizeClass: UnitSizeClass = UnitSizeClass.MEDIUM,
): CreepRenderState {
  const { footprintCenterOffsetPx } = getCreepVisualMetrics(sizeClass, CELL_SIZE_PX);
  const startPx = { x: 0, y: 0 };
  writeCellCenter(start, startPx);
  const sprite = {
    x: startPx.x + footprintCenterOffsetPx,
    y: startPx.y + footprintCenterOffsetPx,
    rotation: 0,
    setPosition: vi.fn(function setPosition(this: Phaser.GameObjects.Sprite, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
  } as unknown as Phaser.GameObjects.Sprite;

  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      sizeClass,
      id: `creep:${sizeClass}`,
      type: 'basic',
      hp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { ...start },
      pathIndex: 0,
    },
    sprite,
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    footprintCenterOffsetPx,
  };
}

function createState(creeps: CreepRenderState[], routes: WaveRoutes): MovementRuntimeState {
  return {
    activeCreeps: creeps,
    activeCreepRoutes: routes,
    playerGold: 0,
    playerLives: 20,
    isGameOver: false,
    restartScheduledAtMs: null,
    wavePhaseState: { phase: 'wave' },
  };
}

const DIAGONAL_ROUTE = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 2 },
];
const ORTHOGONAL_ROUTE = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
];

describe('movement along octile routes', () => {
  it('takes sqrt(2) times as long for a diagonal step as for an orthogonal one', () => {
    const diagonal = createCreep({ x: 0, y: 0 });
    const orthogonal = createCreep({ x: 0, y: 0 });
    const diagonalState = createState([diagonal], { small: DIAGONAL_ROUTE, large: [] });
    const orthogonalState = createState([orthogonal], { small: ORTHOGONAL_ROUTE, large: [] });
    const deps = createDeps();

    moveCreepsAlongPath(orthogonalState, deps, CONFIG, ORTHOGONAL_STEP_MS);
    moveCreepsAlongPath(diagonalState, deps, CONFIG, ORTHOGONAL_STEP_MS);

    expect(orthogonal.entity.pathIndex).toBe(1);
    expect(diagonal.entity.pathIndex).toBe(0);

    moveCreepsAlongPath(
      diagonalState,
      deps,
      CONFIG,
      DIAGONAL_STEP_MS - ORTHOGONAL_STEP_MS + EPSILON_MS,
    );

    expect(diagonal.entity.pathIndex).toBe(1);
    expect(diagonal.entity.position).toEqual({ x: 1, y: 1 });
    expect(diagonal.sprite.x).toBeCloseTo(CELL_SIZE_PX * 1.5, 2);
    expect(diagonal.sprite.y).toBeCloseTo(CELL_SIZE_PX * 1.5, 2);
  });

  it('carries distance past a waypoint into the next segment', () => {
    const creep = createCreep({ x: 0, y: 0 });
    const state = createState([creep], { small: DIAGONAL_ROUTE, large: [] });

    moveCreepsAlongPath(state, createDeps(), CONFIG, DIAGONAL_STEP_MS * 1.5);

    expect(creep.entity.pathIndex).toBe(1);
    expect(creep.sprite.x).toBeCloseTo(CELL_SIZE_PX * 2, 2);
    expect(creep.sprite.y).toBeCloseTo(CELL_SIZE_PX * 2, 2);
  });

  it('keeps a large creep on its 2x2 footprint centre, one cell from its anchor corner', () => {
    const large = createCreep({ x: 0, y: 0 }, UnitSizeClass.LARGE);
    const state = createState([large], { small: ORTHOGONAL_ROUTE, large: DIAGONAL_ROUTE });

    moveCreepsAlongPath(state, createDeps(), CONFIG, DIAGONAL_STEP_MS + EPSILON_MS);

    expect(large.entity.position).toEqual({ x: 1, y: 1 });
    // Anchor (1, 1) top-left corner is at 16 px; the footprint centre is one cell further.
    expect(large.sprite.x).toBeCloseTo(CELL_SIZE_PX * 2, 2);
    expect(large.sprite.y).toBeCloseTo(CELL_SIZE_PX * 2, 2);
  });

  it('leaks the creep once it reaches the last waypoint of its route', () => {
    const creep = createCreep({ x: 0, y: 0 });
    const state = createState([creep], { small: DIAGONAL_ROUTE, large: [] });

    moveCreepsAlongPath(state, createDeps(), CONFIG, DIAGONAL_STEP_MS * 1.99);
    expect(creep.entity.status).toBe('alive');

    moveCreepsAlongPath(state, createDeps(), CONFIG, DIAGONAL_STEP_MS * 0.02);
    expect(creep.entity.status).toBe('escaped');
    expect(creep.entity.position).toEqual({ x: 2, y: 2 });
    expect(state.playerLives).toBe(19);
  });

  it('reuses fixed scratch points for every waypoint lookup instead of allocating', () => {
    const outs = new Set<MutablePoint>();
    const deps = createDeps({
      writeCellCenter: (position, out) => {
        outs.add(out);
        writeCellCenter(position, out);
      },
    });
    const creeps = [createCreep({ x: 0, y: 0 }), createCreep({ x: 0, y: 0 }, UnitSizeClass.LARGE)];
    const state = createState(creeps, { small: ORTHOGONAL_ROUTE, large: DIAGONAL_ROUTE });

    for (let frame = 0; frame < 20; frame += 1) {
      moveCreepsAlongPath(state, deps, CONFIG, 16);
    }

    // One for the next waypoint, one for the last reached (route progress).
    expect(outs.size).toBe(2);
  });

  it('does not replace the position object while a creep is between waypoints', () => {
    const creep = createCreep({ x: 0, y: 0 });
    const state = createState([creep], { small: DIAGONAL_ROUTE, large: [] });
    const positionBefore = creep.entity.position;

    moveCreepsAlongPath(state, createDeps(), CONFIG, 16);
    moveCreepsAlongPath(state, createDeps(), CONFIG, 16);

    expect(creep.entity.position).toBe(positionBefore);
  });
});
