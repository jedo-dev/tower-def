import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { AUTO_WAVE_START_DELAY_MS } from './gameScene.constants';

const AUTO_START_SECONDS = AUTO_WAVE_START_DELAY_MS / 1000;

type SimulationStepHost = { stepSimulation: (nowMs: number, delta: number) => void };
type StartWaveHost = { handleStartWaveCommand: () => void };

describe('GameScene engine error recovery (tower-def-h28.3)', () => {
  let harness: GameSceneHarness | null = null;
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const start = async (): Promise<GameSceneHarness> => {
    harness = await createGameSceneHarness();
    return harness;
  };

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
    consoleError.mockClear();
  });

  it('reports a throw inside update, pauses, and recovers on restart', async () => {
    const game = await start();
    const stepSpy = vi
      .spyOn(game.scene as unknown as SimulationStepHost, 'stepSimulation')
      .mockImplementationOnce(() => {
        throw new Error('tower targeting exploded');
      });
    game.tick(60);

    expect(game.eventsOf('engine-error')).toEqual([
      { phase: 'update', message: 'tower targeting exploded' },
    ]);
    // Logged through the shared entrypoint, not swallowed.
    expect(consoleError).toHaveBeenCalledOnce();
    expect(game.latestHud().isPaused).toBe(true);
    // The loop idles after the first throw: no further steps run.
    expect(stepSpy).toHaveBeenCalledOnce();
    expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS);

    game.command('restart-match', undefined);

    expect(game.events().at(-1)).toEqual({
      name: 'match-started',
      payload: { trigger: 'restart' },
    });
    expect(game.latestHud()).toMatchObject({ isPaused: false, phase: 'build' });
    game.tick(60 * 2);
    expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 2);
    expect(game.eventsOf('engine-error')).toHaveLength(1);
    stepSpy.mockRestore();
  });

  it('reports a throw inside a command handler without killing the scene', async () => {
    const game = await start();
    vi.spyOn(
      game.scene as unknown as StartWaveHost,
      'handleStartWaveCommand',
    ).mockImplementationOnce(() => {
      throw new Error('wave routing failed');
    });

    expect(() => game.command('start-wave', undefined)).not.toThrow();

    expect(game.eventsOf('engine-error')).toEqual([
      { phase: 'command', message: 'wave routing failed' },
    ]);
    expect(game.latestHud().isPaused).toBe(true);
    // A later command still runs through the scene.
    game.command('set-paused', { isPaused: false });
    expect(game.latestHud().isPaused).toBe(false);
  });
});
