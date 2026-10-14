import { describe, expect, it, vi } from 'vitest';
import { createInitialDuelMatchState } from '../../../../../entities/duel-match';
import { applyComputerSendStrategy } from '../../../../../entities/computer-opponent';
import { Difficulty } from '../../../../../entities/difficulty';
import { resolveUnitConfigById, undeadUnits } from '../../../../../entities/unit';
import { RaceId, UnitMoveType, UnitSizeClass } from '../../../../types/content-ids';
import { getCreepVisualMetrics } from '../creep/creepVisualMetrics';
import { createInitialWavePhaseState } from '../../../../../features/wave-phase';
import {
  spawnWaveCreeps,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from './gameSceneWaveRuntime';
import { processPendingWaveSpawns } from './fieldWaveSpawns';

function createSpriteStub(): Phaser.GameObjects.Sprite {
  return {
    destroy: vi.fn(),
    play: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setTint: vi.fn(),
  } as unknown as Phaser.GameObjects.Sprite;
}

describe('shared/lib/phaser/runtime/wave computer send wiring', () => {
  it('adds computer build-phase sends to the runtime wave spawn queue', () => {
    const initialDuelState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
    const sendResult = applyComputerSendStrategy({
      state: initialDuelState,
      context: {
        gold: initialDuelState.opponent.gold,
        income: initialDuelState.opponent.income,
        hp: initialDuelState.opponent.hp,
        raceId: initialDuelState.opponent.raceId,
        difficulty: Difficulty.NORMAL,
        round: 1,
        phase: 'build',
        mazeCoverage: {
          totalWalkableCells: initialDuelState.opponent.battlefield.grid.cells.filter(
            (cell) => cell.isWalkable,
          ).length,
          occupiedCells: 0,
          towerCount: 0,
        },
        threat: {
          incomingCreepCount: 0,
          estimatedLeakCount: 0,
          threatLevel: 'low',
        },
        leakHistory: [],
        affordableTowers: [],
        upgradeableTowerIds: [],
        availableBuildPositions: [],
      },
    });

    const baselineUnits = undeadUnits.slice(0, 2);
    const state: WaveRuntimeState = {
      activeCreepRoutes: { small: [], large: [] },
      activeCreeps: [],
      pendingWaveSpawns: [],
      wavePhaseState: createInitialWavePhaseState(),
      isWaveCompletionRewardGranted: false,
      nextWaveStartsAtMs: null,
      playerGold: 100,
      isGameOver: false,
      currentWaveNumber: 1,
      lastPublishedAutoStartSecondsLeft: null,
    };
    const deps: WaveRuntimeDependencies = {
      nowMs: () => 1_000,
      getAdditionalWaveUnits: () =>
        sendResult.state.opponent.sendQueue.map((unitId) => resolveUnitConfigById(unitId)),
      getSpriteKeyByUnit: () => 'unit:sprite',
      getAnimationKeyByUnit: () => 'unit:walk',
      getCreepTypeFromUnit: () => 'basic',
      toCellCenter: (position) => position,
      onGoldUpdated: vi.fn(),
      onWavePhaseChanged: vi.fn(),
      onBuildStateUpdated: vi.fn(),
      onHudChanged: vi.fn(),
      createCreepSprite: () => createSpriteStub(),
      playSound: vi.fn(),
    };

    spawnWaveCreeps(
      state,
      {
        autoWaveStartDelayMs: 30_000,
        waveSpawnIntervalMs: 500,
        waveFirstSpawnDelayMs: 250,
        earlyWaveStartBonusPlaceholderEligible: false,
      },
      deps,
      baselineUnits,
    );

    const spawnedUnitIds = state.pendingWaveSpawns.map((spawn) => spawn.unit.id);

    expect(sendResult.sentCount).toBeGreaterThan(0);
    expect(sendResult.state.opponent.gold).toBeLessThan(initialDuelState.opponent.gold);
    expect(sendResult.state.opponent.income).toBeGreaterThan(initialDuelState.opponent.income);
    expect(spawnedUnitIds).toEqual(expect.arrayContaining(sendResult.state.opponent.sendQueue));
    const sentSpawns = state.pendingWaveSpawns.filter((spawn) => spawn.sender === 'opponent');
    expect(sentSpawns.map((spawn) => spawn.unit.id)).toEqual(sendResult.state.opponent.sendQueue);
  });
});

describe('shared/lib/phaser/runtime/wave creature traits', () => {
  it('copies authored armor and traits onto the spawned creep', () => {
    const gargoyle = resolveUnitConfigById('undead_gargoyle');
    const state: WaveRuntimeState = {
      activeCreepRoutes: { small: [{ x: 0, y: 0 }], large: [{ x: 0, y: 0 }] },
      activeCreeps: [],
      pendingWaveSpawns: [{ unit: gargoyle, sequenceIndex: 0, spawnAtMs: 0 }],
      wavePhaseState: createInitialWavePhaseState(),
      isWaveCompletionRewardGranted: false,
      nextWaveStartsAtMs: null,
      playerGold: 100,
      isGameOver: false,
      currentWaveNumber: 1,
      lastPublishedAutoStartSecondsLeft: null,
    };
    const deps: WaveRuntimeDependencies = {
      nowMs: () => 1_000,
      getAdditionalWaveUnits: () => [],
      getSpriteKeyByUnit: () => 'unit:sprite',
      getAnimationKeyByUnit: () => 'unit:walk',
      getCreepTypeFromUnit: () => 'basic',
      toCellCenter: (position) => position,
      onGoldUpdated: vi.fn(),
      onWavePhaseChanged: vi.fn(),
      onBuildStateUpdated: vi.fn(),
      onHudChanged: vi.fn(),
      createCreepSprite: () => createSpriteStub(),
      playSound: vi.fn(),
    };

    processPendingWaveSpawns(state, deps, 1_000);

    const spawned = state.activeCreeps[0]?.entity;

    expect(spawned).toBeDefined();
    expect(spawned.armor).toBe(gargoyle.armor);
    expect(spawned.armorType).toBe(gargoyle.armorType);
    expect(spawned.moveType).toBe(UnitMoveType.AIR);
    expect(spawned.sizeClass).toBe(gargoyle.sizeClass);
  });
});

describe('shared/lib/phaser/runtime/wave creep visual scale', () => {
  it.each([UnitSizeClass.SMALL, UnitSizeClass.LARGE])(
    'sizes a %s creep by its size class and centres it on its footprint',
    (sizeClass) => {
      const unit = { ...resolveUnitConfigById('undead_gargoyle'), sizeClass };
      const sprite = createSpriteStub();
      const createCreepSprite = vi.fn(() => sprite);
      const state: WaveRuntimeState = {
        activeCreepRoutes: { small: [{ x: 8, y: 8 }], large: [{ x: 8, y: 8 }] },
        activeCreeps: [],
        pendingWaveSpawns: [{ unit, sequenceIndex: 0, spawnAtMs: 0 }],
        wavePhaseState: createInitialWavePhaseState(),
        isWaveCompletionRewardGranted: false,
        nextWaveStartsAtMs: null,
        playerGold: 100,
        isGameOver: false,
        currentWaveNumber: 1,
        lastPublishedAutoStartSecondsLeft: null,
      };
      const deps: WaveRuntimeDependencies = {
        nowMs: () => 1_000,
        getAdditionalWaveUnits: () => [],
        getSpriteKeyByUnit: () => 'unit:sprite',
        getAnimationKeyByUnit: () => 'unit:walk',
        getCreepTypeFromUnit: () => 'basic',
        toCellCenter: (position) => position,
        onGoldUpdated: vi.fn(),
        onWavePhaseChanged: vi.fn(),
        onBuildStateUpdated: vi.fn(),
        onHudChanged: vi.fn(),
        createCreepSprite,
        playSound: vi.fn(),
      };

      processPendingWaveSpawns(state, deps, 1_000);

      const metrics = getCreepVisualMetrics(sizeClass);
      const offset = metrics.footprintCenterOffsetPx;
      expect(createCreepSprite).toHaveBeenCalledWith(
        8 + offset,
        8 + offset,
        'unit:sprite',
        'unit:walk',
      );
      expect(sprite.setDisplaySize).toHaveBeenCalledWith(
        metrics.displaySizePx,
        metrics.displaySizePx,
      );
      expect(state.activeCreeps[0]?.footprintCenterOffsetPx).toBe(offset);
    },
  );
});
