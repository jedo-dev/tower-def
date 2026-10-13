import { describe, expect, it, vi } from 'vitest';
import { resolveUnitConfigById } from '../../../../../entities/unit';
import { createGridModel } from '../../../grid/createGridModel';
import { withFootprintOccupancy } from '../../../grid/footprint';
import { calculateWaveRoutes } from '../../../pathfinding/waveRoutes';
import { UnitSizeClass } from '../../../../types/content-ids';
import type { GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import { createInitialWavePhaseState } from '../../../../../features/wave-phase';
import {
  moveCreepsAlongPath,
  type MovementRuntimeDeps,
} from '../movement/gameSceneMovementRuntime';
import { toCellCenter, writeCellCenter } from '../../scenes/gameScene.helpers';
import {
  processPendingWaveSpawns,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from './gameSceneWaveRuntime';

const ENTRANCE = { x: 0, y: 6 };
const EXIT = { x: 18, y: 6 };
const WALL_X = 8;
const GAP_Y = 6;
/** The wall stops here, leaving the bottom two rows as the only 2-wide passage. */
const WALL_END_Y = 28;
const FRAME_MS = 50;
const MAX_FRAMES = 2_000;

/** A wall with a 1-cell gap next to the entrance row and a 2-wide detour at the bottom. */
function createGridWithOneCellGap(): GridModel {
  const grid = createGridModel({ entrance: ENTRANCE, exit: EXIT });
  const above = withFootprintOccupancy(
    grid,
    { x: WALL_X, y: 0 },
    { width: 1, height: GAP_Y },
    true,
  );
  return withFootprintOccupancy(
    above,
    { x: WALL_X, y: GAP_Y + 1 },
    { width: 1, height: WALL_END_Y - GAP_Y - 1 },
    true,
  );
}

function createSpriteStub(x: number, y: number): Phaser.GameObjects.Sprite {
  return {
    x,
    y,
    rotation: 0,
    destroy: vi.fn(),
    play: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setTint: vi.fn(),
    setPosition: vi.fn(function setPosition(
      this: Phaser.GameObjects.Sprite,
      nextX: number,
      nextY: number,
    ) {
      this.x = nextX;
      this.y = nextY;
      return this;
    }),
  } as unknown as Phaser.GameObjects.Sprite;
}

describe('mixed wave on a board with a 1-cell gap', () => {
  it('sends single-cell creeps through the gap and large creeps around it', () => {
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const abomination = resolveUnitConfigById('undead_abomination');
    expect(abomination.sizeClass).toBe(UnitSizeClass.LARGE);
    expect(skeleton.sizeClass).not.toBe(UnitSizeClass.LARGE);

    const routes = calculateWaveRoutes(createGridWithOneCellGap());
    const state: WaveRuntimeState = {
      activeCreepRoutes: routes,
      activeCreeps: [],
      pendingWaveSpawns: [
        { unit: skeleton, sequenceIndex: 0, spawnAtMs: 0 },
        { unit: abomination, sequenceIndex: 1, spawnAtMs: 0 },
      ],
      wavePhaseState: createInitialWavePhaseState(),
      isWaveCompletionRewardGranted: false,
      nextWaveStartsAtMs: null,
      restartScheduledAtMs: null,
      playerGold: 100,
      playerLives: 20,
      isGameOver: false,
      currentWaveNumber: 1,
      lastPublishedAutoStartSecondsLeft: null,
    };
    const waveDeps = {
      nowMs: () => 0,
      getSpriteKeyByUnit: () => 'unit:sprite',
      getAnimationKeyByUnit: () => 'unit:walk',
      getCreepTypeFromUnit: () => 'basic' as const,
      toCellCenter,
      createCreepSprite: (x: number, y: number) => createSpriteStub(x, y),
    } as unknown as WaveRuntimeDependencies;
    const movementDeps: MovementRuntimeDeps = {
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
    };

    processPendingWaveSpawns(state, waveDeps, 0);
    const [small, large] = state.activeCreeps;
    expect(small.entity.sizeClass).toBe(skeleton.sizeClass);
    expect(large.entity.sizeClass).toBe(UnitSizeClass.LARGE);

    const visitedBySmall: GridPosition[] = [];
    const visitedByLarge: GridPosition[] = [];
    for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
      if (state.activeCreeps.every((creep) => creep.entity.status === 'escaped')) break;
      moveCreepsAlongPath(
        state,
        movementDeps,
        { creepMaxSimulationDeltaMs: 100, creepBaseMoveSpeedPxPerSec: 64, restartDelayMs: 0 },
        FRAME_MS,
      );
      visitedBySmall.push({ ...small.entity.position });
      visitedByLarge.push({ ...large.entity.position });
    }

    expect(small.entity.status).toBe('escaped');
    expect(large.entity.status).toBe('escaped');
    expect(small.entity.position).toEqual(EXIT);
    expect(large.entity.position).toEqual(EXIT);
    expect(visitedBySmall).toContainEqual({ x: WALL_X, y: GAP_Y });
    expect(visitedByLarge).not.toContainEqual({ x: WALL_X, y: GAP_Y });
    expect(visitedByLarge.some((cell) => cell.x === WALL_X && cell.y === WALL_END_Y)).toBe(true);
  });
});
