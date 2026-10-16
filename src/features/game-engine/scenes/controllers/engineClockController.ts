import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { GameSpeed } from '../../../../shared/lib/game-bridge/types';
import {
  runGuardedEngineStep,
  type EngineErrorReport,
} from '../../runtime/lifecycle/engineErrorGuard';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import type { GameSceneCore } from './sceneQueries';

/**
 * Sprite animations and the few `delayedCall`s (build flash, sound caps)
 * live on Phaser's own clocks; keep them in step with the game clock.
 */
export function applyClockToPhaserSystems({ scene, state }: GameSceneCore): void {
  scene.time.paused = state.gameClock.isPaused;
  scene.time.timeScale = state.gameClock.speed;
  scene.anims.globalTimeScale = state.gameClock.speed;
  if (state.gameClock.isPaused) {
    scene.anims.pauseAll();
  } else {
    scene.anims.resumeAll();
  }
}

function handleEngineError(core: GameSceneCore, report: EngineErrorReport): void {
  core.state.hasEngineError = true;
  core.state.gameClock.isPaused = true;
  applyClockToPhaserSystems(core);
  publishGameEvent('engine-error', { phase: report.phase, message: report.message });
  // The HUD should show the pause even if the snapshot itself is what broke.
  try {
    publishHudSnapshot(core.state);
  } catch {
    // Already reported; a second failure has nothing new to say.
  }
}

/** The step a lifecycle guard wraps; a throw here pauses the engine. */
export function runGuarded(
  core: GameSceneCore,
  phase: EngineErrorReport['phase'],
  run: () => void,
): void {
  runGuardedEngineStep(phase, run, (report) => handleEngineError(core, report));
}

export function setPaused(core: GameSceneCore, isPaused: boolean): void {
  if (core.state.gameClock.isPaused === isPaused) {
    return;
  }
  core.state.gameClock.isPaused = isPaused;
  applyClockToPhaserSystems(core);
  publishHudSnapshot(core.state);
}

export function setGameSpeed(core: GameSceneCore, speed: GameSpeed): void {
  if (core.state.gameClock.speed === speed) {
    return;
  }
  core.state.gameClock.speed = speed;
  applyClockToPhaserSystems(core);
  publishHudSnapshot(core.state);
}

/** A restart is also the recover action after an engine error: run the clock again. */
export function clearEngineErrorAndResume(core: GameSceneCore): void {
  core.state.hasEngineError = false;
  core.state.gameClock.isPaused = false;
  applyClockToPhaserSystems(core);
}
