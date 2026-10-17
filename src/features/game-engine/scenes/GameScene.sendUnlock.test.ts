import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getSendUnlockWave } from '../../../entities/duel-match';
import { getRaceRegistry } from '../../../entities/race-registry';
import { resolveUnitConfigById, UnitTier } from '../../../entities/unit';
import { RaceId } from '../../../shared/types/content-ids';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';

const RICH_GOLD = 10_000;

function findUndeadOfTier(tier: UnitTier): string {
  const unitId = getRaceRegistry(RaceId.UNDEAD).sendableCreepIds.find(
    (id) => resolveUnitConfigById(id).tier === tier,
  );
  if (!unitId) throw new Error(`No undead creature of tier ${tier}`);
  return unitId;
}

describe('GameScene send unlock by wave (tower-def-qpb)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  it('rejects a locked tier with its unlock wave and queues nothing', async () => {
    const game = (harness = await createGameSceneHarness());
    game.setPlayerGold(RICH_GOLD);
    const wyrmId = findUndeadOfTier(UnitTier.TIER_6);

    game.command('send-creep', { creepTypeId: wyrmId });

    expect(game.eventsOf('creep-send-rejected')).toEqual([
      expect.objectContaining({
        creepTypeId: wyrmId,
        reason: 'tier_locked',
        unlockWave: getSendUnlockWave(UnitTier.TIER_6),
      }),
    ]);
    expect(game.inspect().duelMatchState.player.sendQueue).toEqual([]);
  });

  it('sends a tier from the build phase before its unlock wave, tier 5 and 6 under their caps', async () => {
    const game = (harness = await createGameSceneHarness());
    game.setPlayerGold(RICH_GOLD);
    game.setDuelRound(getSendUnlockWave(UnitTier.TIER_6) - 1);
    const wyrmId = findUndeadOfTier(UnitTier.TIER_6);
    const fifthTierId = findUndeadOfTier(UnitTier.TIER_5);

    game.command('send-creep', { creepTypeId: wyrmId });
    game.command('send-creep', { creepTypeId: fifthTierId });

    expect(game.eventsOf('creep-send-rejected')).toEqual([]);
    expect(game.inspect().duelMatchState.player.sendQueue).toEqual([wyrmId, fifthTierId]);
    const limits = game.eventsOf('send-limits-updated').at(-1);
    const wyrmLimit = limits?.units.find((unit) => unit.creepTypeId === wyrmId);
    expect(wyrmLimit?.remaining).toBe((wyrmLimit?.cap ?? 0) - 1);
  });

  it('keeps tier 1 sendable in the opening build phase', async () => {
    const game = (harness = await createGameSceneHarness());
    const skeletonId = findUndeadOfTier(UnitTier.TIER_1);

    game.command('send-creep', { creepTypeId: skeletonId });

    expect(game.eventsOf('creep-send-rejected')).toEqual([]);
    expect(game.inspect().duelMatchState.player.sendQueue).toEqual([skeletonId]);
  });
});
