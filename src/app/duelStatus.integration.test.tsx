// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { getRaceRegistry } from '../entities/race-registry';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
} from '../features/game-engine/test/sceneHarness';
import { RaceId } from '../shared/types/content-ids';
import { MatchStatusBar } from '../widgets/hud';
import { ENEMY_SENDS_PENDING_DETAIL } from '../widgets/hud/model/mapHudSnapshotToViewModel';
import { WaveQueue } from '../widgets/wave-queue';

const ACTION_COOLDOWN_FRAMES = 12;
const MAX_FRAMES_PER_ROUND = 6000;
/** Enough sends that the computer's field outlasts the player's unbuilt one. */
const PLAYER_SENDS = 6;

/**
 * Duel statuses rendered by the real widgets against the real scene over the
 * typed bridge (tower-def-k7m.5): each one shows exactly while it is true.
 */
const SCENE_PRELOAD_TIMEOUT_MS = 60_000;

describe('duel statuses (live scene + widgets)', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let harness: GameSceneHarness | null = null;

  // Loading the real scene and content under full-suite load can exceed the 10s hook default.
  beforeAll(async () => {
    await preloadGameScene();
  }, SCENE_PRELOAD_TIMEOUT_MS);

  afterEach(() => {
    cleanup();
    harness?.destroy();
    harness = null;
    consoleError.mockClear();
  });

  function lastOpponentSendCount(game: GameSceneHarness): number {
    const opponentQueues = game
      .eventsOf('send-queue-updated')
      .filter((payload) => payload.owner === 'opponent');
    return opponentQueues[opponentQueues.length - 1]?.queue.length ?? 0;
  }

  function pressureStatus(): HTMLElement {
    const status = screen
      .getAllByRole('status')
      .find((element) => element.getAttribute('aria-label')?.includes('Pressure'));
    if (status === undefined) {
      throw new Error('pressure bar not rendered');
    }
    return status;
  }

  it('shows "Enemy field: N left" only while the computer field alone is fighting', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    render(<WaveQueue />);

    const [sentUnitId] = getRaceRegistry(RaceId.UNDEAD).sendableCreepIds;
    act(() => {
      for (let send = 0; send < PLAYER_SENDS; send += 1) {
        game.command('send-creep', { creepTypeId: sentUnitId });
        game.tick(ACTION_COOLDOWN_FRAMES);
      }
      game.command('start-wave', undefined);
    });
    expect(screen.queryByText(/^Enemy field:/)).toBeNull();

    act(() => {
      game.tickUntil(() => {
        const hud = game.latestHud();
        return hud.phase === 'wave' && hud.pendingCreepCount === 0;
      }, MAX_FRAMES_PER_ROUND);
    });
    const updates = game.eventsOf('opponent-field-creeps-updated');
    const remaining = updates[updates.length - 1]?.remaining ?? 0;
    expect(remaining).toBeGreaterThan(0);
    expect(screen.getByRole('status').textContent).toBe(`Enemy field: ${remaining} left`);

    act(() => {
      game.tickUntil(() => game.latestHud().phase !== 'wave', MAX_FRAMES_PER_ROUND);
    });
    expect(screen.queryByText(/^Enemy field:/)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('says the enemy sends at wave start, then shows what it sent this wave', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    render(<MatchStatusBar setup={HARNESS_DEFAULT_SETUP} />);

    expect(pressureStatus().textContent).toContain(ENEMY_SENDS_PENDING_DETAIL);

    act(() => {
      game.command('start-wave', undefined);
    });
    const sentCount = lastOpponentSendCount(game);
    expect(sentCount).toBeGreaterThan(0);
    expect(pressureStatus().textContent).toBe(
      `Incoming ${game.latestHud().pendingCreepCount}${sentCount} sent by enemy`,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });
});
