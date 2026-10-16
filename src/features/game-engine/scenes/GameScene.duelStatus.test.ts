import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getRaceRegistry } from '../../../entities/race-registry';
import { RaceId } from '../../../shared/types/content-ids';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';

/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const MAX_FRAMES_PER_ROUND = 6000;
/** Enough sends that the computer's field outlasts the player's unbuilt one. */
const PLAYER_SENDS = 6;

/**
 * The data behind the two duel statuses the HUD derives (tower-def-k7m.5):
 * the wave strip's "Enemy field: N left" and the pressure bar's enemy sends.
 */
describe('GameScene duel status data (headless harness)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  function lastOpponentRemaining(game: GameSceneHarness): number {
    const updates = game.eventsOf('opponent-field-creeps-updated');
    return updates[updates.length - 1]?.remaining ?? 0;
  }

  function isPlayerFieldClear(game: GameSceneHarness): boolean {
    const hud = game.latestHud();
    return hud.phase === 'wave' && hud.pendingCreepCount === 0 && hud.waveQueue.length === 0;
  }

  it('lists the computer sends of the running wave, which its drained queue never showed', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    expect(game.latestHud().opponentSendQueue).toEqual([]);

    game.command('start-wave', undefined);

    const opponentQueues = game
      .eventsOf('send-queue-updated')
      .filter((payload) => payload.owner === 'opponent');
    const sentThisWave = opponentQueues[opponentQueues.length - 1]?.queue ?? [];
    expect(sentThisWave.length).toBeGreaterThan(0);
    // The live queue is consumed by the same wave start...
    expect(game.inspect().duelMatchState.opponent.sendQueue).toEqual([]);
    // ...but the HUD still reports what the computer sent this wave.
    const hud = game.latestHud();
    expect(hud.phase).toBe('wave');
    expect(hud.opponentSendQueue).toHaveLength(sentThisWave.length);

    game.tickUntil(() => game.latestHud().phase !== 'wave', MAX_FRAMES_PER_ROUND);
    expect(game.latestHud().opponentSendQueue).toEqual([]);
  });

  it('keeps counting the computer field down after the player field is clear', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    const [sentUnitId] = getRaceRegistry(RaceId.UNDEAD).sendableCreepIds;
    for (let send = 0; send < PLAYER_SENDS; send += 1) {
      game.command('send-creep', { creepTypeId: sentUnitId });
      game.tick(ACTION_COOLDOWN_FRAMES);
    }
    expect(game.inspect().duelMatchState.player.sendQueue.length).toBeGreaterThan(0);

    game.command('start-wave', undefined);
    game.tickUntil(() => isPlayerFieldClear(game), MAX_FRAMES_PER_ROUND);

    // The wave is still running because the computer's field is not done,
    // and the bridge says how many creeps it still has to resolve.
    expect(game.latestHud().phase).toBe('wave');
    expect(lastOpponentRemaining(game)).toBeGreaterThan(0);

    game.tickUntil(() => game.latestHud().phase !== 'wave', MAX_FRAMES_PER_ROUND);
    expect(lastOpponentRemaining(game)).toBe(0);
  });
});
