import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  getCreatureDeathXp,
  getCreatureLeakXp,
  resolveUnitConfigById,
  type CreatureXpByTier,
  type UnitId,
} from '../../../entities/unit';
import { CreatureTalentPricing } from '../../../shared/constants/creatureTalents';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';

const MAX_FRAMES_PER_ROUND = 6000;
const SKELETON = resolveUnitConfigById('undead_skeleton');
const FIEND = resolveUnitConfigById('undead_crypt_fiend');
const [FIEND_A, FIEND_B] = FIEND.talentBranches;
/** Enough tier 2 experience for the branch and every grade (41 per tier: 82 at tier 2). */
const FULL_FIEND_XP: CreatureXpByTier = { 2: 82 };

describe('GameScene creature talents (headless harness)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  async function start(): Promise<GameSceneHarness> {
    harness = await createGameSceneHarness();
    return harness;
  }

  function playWave(game: GameSceneHarness): void {
    game.tickUntil(() => {
      if (game.latestHud().canStartWave) game.command('start-wave', undefined);
      return game.inspect().wavePhaseState.phase !== 'build';
    }, MAX_FRAMES_PER_ROUND);
    game.tickUntil(
      () => game.inspect().wavePhaseState.phase === 'build' || game.inspect().isGameOver,
      MAX_FRAMES_PER_ROUND,
    );
  }

  function sentSpawnsOnOpponentField(game: GameSceneHarness) {
    return game.inspect().pendingOpponentSpawns.filter((spawn) => spawn.sender === 'player');
  }

  it('credits each sent creep to its tier: deaths, leaks and the life bonus', async () => {
    const game = await start();
    const sends: UnitId[] = [SKELETON.id, SKELETON.id, SKELETON.id, FIEND.id];
    for (const unitId of sends) {
      game.command('send-creep', { creepTypeId: unitId });
    }

    playWave(game);

    // On the harness seed the computer's first maze kills the three skeletons
    // and lets the crypt fiend through; it starts with lives to spare.
    const leaked = game
      .inspect()
      .opponentField.creeps.filter(
        (creep) => creep.entity.sender === 'player' && creep.entity.status === 'escaped',
      )
      .map((creep) => creep.entity.sentTier);
    expect(leaked).toEqual([FIEND.tier]);
    const expected: CreatureXpByTier = {
      [SKELETON.tier]: 3 * getCreatureDeathXp(SKELETON.tier),
      [FIEND.tier]: getCreatureLeakXp(FIEND.tier, true),
    };
    expect(expected).toEqual({ 1: 3, 2: 8 });
    expect(game.inspect().duelMatchState.player.creatureXpByTier).toEqual(expected);
    expect(game.latestHud().creatureXpByTier).toEqual(expected);
  });

  it('buys a branch at any phase for experience and locks the other branch', async () => {
    const game = await start();
    game.setPlayerCreatureXp({ 2: CreatureTalentPricing.BRANCH_COST_PER_TIER * 2 - 1 });

    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_A.id });
    expect(game.inspect().duelMatchState.player.creatureBranchChoices).toEqual({});

    game.setPlayerCreatureXp({ 2: 20 });
    game.command('start-wave', undefined);
    expect(game.inspect().wavePhaseState.phase).not.toBe('build');
    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_A.id });

    const player = game.inspect().duelMatchState.player;
    expect(player.creatureBranchChoices).toEqual({ [FIEND.id]: FIEND_A.id });
    expect(player.creatureXpByTier).toEqual({ 2: 8 });
    expect(game.latestHud().creatureBranchChoices).toEqual({ [FIEND.id]: FIEND_A.id });
    const fiendLimits = game
      .eventsOf('send-limits-updated')
      .at(-1)
      ?.units.find((unit) => unit.creepTypeId === FIEND.id);
    expect(fiendLimits).toMatchObject({
      availableBranches: [
        { id: FIEND_A.id, name: FIEND_A.name, description: FIEND_A.description, isChosen: true },
        { id: FIEND_B.id, name: FIEND_B.name, description: FIEND_B.description, isChosen: false },
      ],
      branchCostXp: 12,
      grade: 0,
      nextUpgradeCostXp: 4,
    });

    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_B.id });
    expect(game.inspect().duelMatchState.player.creatureBranchChoices).toEqual({
      [FIEND.id]: FIEND_A.id,
    });
    expect(game.inspect().duelMatchState.player.creatureXpByTier).toEqual({ 2: 8 });
  });

  it('applies a grade to sends queued after the purchase only', async () => {
    const game = await start();
    game.setPlayerCreatureXp(FULL_FIEND_XP);
    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_B.id });

    game.command('send-creep', { creepTypeId: FIEND.id });
    game.command('upgrade-creature', { unitId: FIEND.id });
    game.command('upgrade-creature', { unitId: FIEND.id });
    game.command('send-creep', { creepTypeId: FIEND.id });
    expect(game.inspect().duelMatchState.player.creatureGrades).toEqual({ [FIEND.id]: 2 });
    expect(game.latestHud().creatureGrades).toEqual({ [FIEND.id]: 2 });

    game.command('start-wave', undefined);

    const [before, after] = sentSpawnsOnOpponentField(game).map((spawn) => spawn.unit);
    expect(before.health).toBe(FIEND.health);
    expect(before.speed).toBe(FIEND.speed);
    expect(after.health).toBe(FIEND_B.grades[1].health);
    expect(after.speed).toBe(FIEND_B.grades[1].speed);
    expect(after.physicalArmor).toBe(FIEND_B.grades[1].physicalArmor);
    expect(after.magicalArmor).toBe(FIEND_B.grades[1].magicalArmor);
  });

  it('stops at grade 4 and refuses grades without a branch', async () => {
    const game = await start();
    game.setPlayerCreatureXp(FULL_FIEND_XP);

    game.command('upgrade-creature', { unitId: FIEND.id });
    expect(game.inspect().duelMatchState.player.creatureGrades).toEqual({});

    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_A.id });
    for (let step = 0; step < 5; step += 1) {
      game.command('upgrade-creature', { unitId: FIEND.id });
    }

    expect(game.inspect().duelMatchState.player.creatureGrades).toEqual({ [FIEND.id]: 4 });
    expect(game.inspect().duelMatchState.player.creatureXpByTier).toEqual({ 2: 0 });
    const fiendLimits = game
      .eventsOf('send-limits-updated')
      .at(-1)
      ?.units.find((unit) => unit.creepTypeId === FIEND.id);
    expect(fiendLimits?.grade).toBe(4);
    expect(fiendLimits?.nextUpgradeCostXp).toBeNull();
  });

  it('refuses talents for a creature the player cannot send', async () => {
    const game = await start();
    game.setPlayerCreatureXp({ 1: 99 });
    const [orcBranch] = resolveUnitConfigById('orc_grunt').talentBranches;

    game.command('choose-creature-branch', { unitId: 'orc_grunt', branchId: orcBranch.id });

    expect(game.inspect().duelMatchState.player.creatureBranchChoices).toEqual({});
    expect(game.inspect().duelMatchState.player.creatureXpByTier).toEqual({ 1: 99 });
  });

  it('accrues experience for the computer, spends it by the rules, and a restart clears both', async () => {
    const game = await start();
    game.setPlayerCreatureXp(FULL_FIEND_XP);
    game.command('choose-creature-branch', { unitId: FIEND.id, branchId: FIEND_A.id });
    game.command('upgrade-creature', { unitId: FIEND.id });

    let rounds = 0;
    while (rounds < 3 && !game.inspect().isGameOver) {
      playWave(game);
      rounds += 1;
    }
    const opponent = game.inspect().duelMatchState.opponent;
    const opponentXp = Object.values(opponent.creatureXpByTier).reduce(
      (sum: number, xp) => sum + (xp ?? 0),
      0,
    );
    // The computer develops its creatures (tower-def-716.5): what it earned is
    // either still held or spent on a branch, never below zero.
    const developed = Object.keys(opponent.creatureBranchChoices).length;
    expect(opponentXp > 0 || developed > 0).toBe(true);
    for (const xp of Object.values(opponent.creatureXpByTier)) {
      expect(xp).toBeGreaterThanOrEqual(0);
    }
    for (const unitId of Object.keys(opponent.creatureGrades)) {
      expect(opponent.creatureBranchChoices).toHaveProperty(unitId);
    }

    game.command('restart-match', undefined);

    const { player, opponent: restarted } = game.inspect().duelMatchState;
    for (const side of [player, restarted]) {
      expect(side.creatureXpByTier).toEqual({});
      expect(side.creatureBranchChoices).toEqual({});
      expect(side.creatureGrades).toEqual({});
    }
    expect(game.latestHud().creatureXpByTier).toEqual({});
    expect(game.latestHud().creatureGrades).toEqual({});
  });
});
