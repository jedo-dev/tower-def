import Phaser from 'phaser';
import type { DuelMatchState } from '../../../entities/duel-match';
import { preloadGameSceneAssets } from '../runtime/assets/gameSceneAssetLoader';
import { getBoardZoomFactor } from '../runtime/camera/gameSceneCameraRuntime';
import { advanceGameClock } from '../runtime/time/gameClock';
import type { WaveRuntimeState } from '../runtime/wave/gameSceneWaveRuntime';
import { GameAudioManager } from '../sound/GameAudioManager';
import { runGuarded } from './controllers/engineClockController';
import { GameSceneContext } from './controllers/gameSceneContext';
import type { GameSceneState } from './controllers/gameSceneState';
import { createScene } from './controllers/sceneLifecycle';
import { getBoardCamera } from './controllers/sceneQueries';
import { runSimulationStep } from './controllers/simulationStep';
import { startWaveOnPlayerRequest } from './controllers/waveFlowController';
import type { GameSceneInspection } from './gameScene.types';

/**
 * The Phaser scene of a duel match. It keeps only the Phaser lifecycle; the
 * work is done by the controllers under `./controllers`, which all share one
 * GameSceneContext (the scene, its state record and the runtime wiring).
 */
export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private readonly ctx = new GameSceneContext(this, {
    handleStartWaveCommand: () => this.handleStartWaveCommand(),
  });
  private readonly state: GameSceneState = this.ctx.state;

  /** Test seam (sceneHarness): the wave runtime state the wallet lives in. */
  private get runState(): WaveRuntimeState {
    return this.state.runState;
  }

  /** Test seam (sceneHarness): the live duel match state. */
  private get duelMatchState(): DuelMatchState {
    return this.state.duelMatchState;
  }

  private set duelMatchState(state: DuelMatchState) {
    this.state.duelMatchState = state;
  }

  constructor() {
    super(GameScene.KEY);
  }

  /** Test seam: a read-only snapshot of live runtime state (see GameSceneInspection). */
  public inspectRuntimeState(): GameSceneInspection {
    const { state, runState } = this;
    const camera = getBoardCamera(this.ctx);
    return {
      duelMatchState: this.duelMatchState,
      playerField: state.playerField,
      opponentField: state.opponentField,
      pendingPlayerSpawns: runState.pendingWaveSpawns,
      pendingOpponentSpawns: state.opponentWave.pendingWaveSpawns,
      wavePhaseState: runState.wavePhaseState,
      waveNumber: runState.currentWaveNumber,
      playerGold: runState.playerGold,
      isGameOver: runState.isGameOver,
      activeBattlefieldView: state.activeBattlefieldView,
      gridModel: state.gridModel,
      gridRenderer: state.gridRendererState,
      cameraView: camera.view,
      cameraZoomFactor: getBoardZoomFactor(camera),
      pendingPlacementAnchor: state.pendingPlacementAnchor,
    };
  }

  public preload(): void {
    runGuarded(this.ctx, 'preload', () => {
      this.state.soundManager = new GameAudioManager(this);
      this.state.soundManager.preload();
      preloadGameSceneAssets(this);
    });
  }

  public create(): void {
    runGuarded(this.ctx, 'create', () => createScene(this.ctx));
  }

  /**
   * Phaser hands `update` real frame time; the simulation runs on the game
   * clock instead, so a pause freezes it and 2x doubles every step: movement,
   * combat, spawn timers and the auto-start countdown alike.
   */
  public update(_realTimeMs: number, realDeltaMs: number): void {
    if (this.state.hasEngineError) {
      return;
    }
    const simulationDeltaMs = advanceGameClock(this.state.gameClock, realDeltaMs);
    if (simulationDeltaMs === 0) {
      return;
    }
    runGuarded(this.ctx, 'update', () =>
      this.stepSimulation(this.state.gameClock.nowMs, simulationDeltaMs),
    );
  }

  /** The step the update guard wraps; a method so a test can make it throw. */
  private stepSimulation(nowMs: number, delta: number): void {
    runSimulationStep(this.ctx, nowMs, delta);
  }

  /** The start-wave command; a method so a test can make it throw. */
  private handleStartWaveCommand(): void {
    startWaveOnPlayerRequest(this.ctx);
  }
}
