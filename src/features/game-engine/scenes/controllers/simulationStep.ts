import {
  moveBattlefieldCreeps,
  removeDeadBattlefieldCreeps,
  updateBattlefieldCreepEffects,
  updateBattlefieldCreepHitFeedback,
  updateBattlefieldDamageNumbers,
  updateBattlefieldImpactEffects,
  updateBattlefieldProjectiles,
  updateBattlefieldTowerCombat,
  type BattlefieldUpdateContext,
} from '../../runtime/battlefield/battlefieldUpdateRuntime';
import { processPendingWaveSpawns } from '../../runtime/wave/fieldWaveSpawns';
import { DEV_FPS_REPORT_INTERVAL_MS } from '../gameScene.constants';
import { COMBAT_RUNTIME_CONFIG, MOVEMENT_RUNTIME_CONFIG } from '../gameScene.runtimeConfigs';
import type { GameSceneRuntimeWiring } from '../gameSceneRuntimeWiring';
import { applyBattlefieldViewVisibility } from './battlefieldViewController';
import type { GameSceneContext } from './gameSceneContext';
import type { GameSceneCore } from './sceneQueries';
import {
  applyWaveCompletionRewardIfResolved,
  tryStartNextWave,
  updateAutoWaveCountdown,
} from './waveFlowController';

type BattlefieldStep<Config> = (
  context: BattlefieldUpdateContext,
  config: Config,
  deltaMs: number,
) => void;

/** Runs one battlefield step on the player's field, then on the computer's. */
function stepBothFields<Config>(
  wiring: GameSceneRuntimeWiring,
  step: BattlefieldStep<Config>,
  config: Config,
  deltaMs: number,
): void {
  step(wiring.playerBattlefieldContext, config, deltaMs);
  step(wiring.opponentBattlefieldContext, config, deltaMs);
}

function updatePerformanceTelemetry({ scene, state }: GameSceneCore, deltaMs: number): void {
  state.devFpsReportElapsedMs += deltaMs;

  if (state.devFpsReportElapsedMs < DEV_FPS_REPORT_INTERVAL_MS) {
    return;
  }

  state.devFpsReportElapsedMs = 0;
  scene.registry.set('performance.fps', Math.round(scene.game.loop.actualFps));
}

/** One simulation step on the game clock: spawns, movement, combat and round flow. */
export function runSimulationStep(context: GameSceneContext, nowMs: number, delta: number): void {
  const { state, wiring } = context;
  updateAutoWaveCountdown(context, nowMs);

  if (state.runState.isGameOver) {
    return;
  }

  processPendingWaveSpawns(state.runState, wiring.waveRuntimeDeps, nowMs);
  processPendingWaveSpawns(state.opponentWave, wiring.waveRuntimeDeps, nowMs);
  stepBothFields(wiring, moveBattlefieldCreeps, MOVEMENT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, updateBattlefieldTowerCombat, COMBAT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, updateBattlefieldCreepEffects, COMBAT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, updateBattlefieldCreepHitFeedback, COMBAT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, removeDeadBattlefieldCreeps, COMBAT_RUNTIME_CONFIG, delta);
  applyWaveCompletionRewardIfResolved(context);
  tryStartNextWave(context, nowMs);
  stepBothFields(wiring, updateBattlefieldProjectiles, COMBAT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, updateBattlefieldImpactEffects, COMBAT_RUNTIME_CONFIG, delta);
  stepBothFields(wiring, updateBattlefieldDamageNumbers, COMBAT_RUNTIME_CONFIG, delta);
  applyBattlefieldViewVisibility(state);
  updatePerformanceTelemetry(context, delta);
}
