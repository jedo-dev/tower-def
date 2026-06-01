import { describe, expect, it, vi } from 'vitest';
import { createInitialDuelMatchState } from '../../../../../entities/duel-match';
import { applyComputerSendStrategy } from '../../../../../entities/computer-opponent';
import { Difficulty } from '../../../../../entities/difficulty';
import { resolveUnitConfigById, undeadUnits } from '../../../../../entities/unit';
import { RaceId } from '../../../../types/content-ids';
import { createInitialWavePhaseState } from '../../../../../features/wave-phase';
import {
  spawnWaveCreeps,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from './gameSceneWaveRuntime';

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
      activeCreepPath: [],
      activeCreeps: [],
      pendingWaveSpawns: [],
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
    const deps: WaveRuntimeDependencies = {
      nowMs: () => 1_000,
      getSelectedFactionUnits: () => baselineUnits,
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
    );

    const spawnedUnitIds = state.pendingWaveSpawns.map((spawn) => spawn.unit.id);

    expect(sendResult.sentCount).toBeGreaterThan(0);
    expect(sendResult.state.opponent.gold).toBeLessThan(initialDuelState.opponent.gold);
    expect(sendResult.state.opponent.income).toBeGreaterThan(initialDuelState.opponent.income);
    expect(spawnedUnitIds).toEqual(expect.arrayContaining(sendResult.state.opponent.sendQueue));
  });
});
