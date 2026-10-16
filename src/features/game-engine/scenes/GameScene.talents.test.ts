import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { resolveBuildableTowerById } from '../../../entities/tower';
import { TowerTalentPricing } from '../../../shared/constants/towerTalents';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';

/** Free 2x2 build spots in the middle of the 20x30 board. */
const FIRST_ANCHOR: GridPosition = { x: 8, y: 14 };
const SECOND_ANCHOR: GridPosition = { x: 12, y: 20 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const WALLET = 5000;

const ARCHER = resolveBuildableTowerById('undead_bone_archer_tower');
const [BRANCH_A, BRANCH_B] = ARCHER.talentBranches;

describe('GameScene tower talents (headless harness)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  function placeArcher(game: GameSceneHarness, anchor: GridPosition) {
    game.command('select-tower', { towerType: TowerTypeId.SINGLE });
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickBuildAnchor(anchor);
    const placed = game.inspect().playerField.towers.at(-1)?.entity;
    expect(placed?.position).toEqual(anchor);
    expect(placed?.buildableTowerId).toBe(ARCHER.id);
    return placed!;
  }

  function upgrade(game: GameSceneHarness, towerId: string, times: number) {
    for (let step = 0; step < times; step += 1) {
      game.command('upgrade-tower', { towerId });
    }
  }

  it('chooses a branch at grade 3, upgrades to grade 7 and locks the other branch', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    game.setPlayerGold(WALLET);
    const first = placeArcher(game, FIRST_ANCHOR);

    // Below grade 3 the branch cannot be chosen yet.
    const goldAtGradeOne = game.inspect().playerGold;
    game.command('choose-tower-branch', { towerId: first.id, branchId: BRANCH_A.id });
    expect(game.inspect().playerGold).toBe(goldAtGradeOne);
    expect(game.inspect().duelMatchState.player.towerBranchChoices).toEqual({});

    // Without a branch grade 3 is the top.
    upgrade(game, first.id, 3);
    expect(first.level).toBe(3);

    const goldBeforeBranch = game.inspect().playerGold;
    game.command('choose-tower-branch', { towerId: first.id, branchId: BRANCH_A.id });
    expect(game.inspect().playerGold).toBe(goldBeforeBranch - TowerTalentPricing.BRANCH_COST);
    expect(game.inspect().duelMatchState.player.towerBranchChoices).toEqual({
      [ARCHER.id]: BRANCH_A.id,
    });
    expect(game.latestHud().towerBranchChoices).toEqual({ [ARCHER.id]: BRANCH_A.id });
    const selected = game.eventsOf('selected-tower').at(-1)?.tower;
    expect(selected?.chosenBranchId).toBe(BRANCH_A.id);
    expect(selected?.availableBranches).toEqual([
      { id: BRANCH_A.id, name: BRANCH_A.name, description: BRANCH_A.description, isChosen: true },
      { id: BRANCH_B.id, name: BRANCH_B.name, description: BRANCH_B.description, isChosen: false },
    ]);

    const goldBeforeGrades = game.inspect().playerGold;
    upgrade(game, first.id, 5);
    const gradeCosts = Object.values(TowerTalentPricing.GRADE_COSTS).reduce((a, b) => a + b, 0);
    expect(first.level).toBe(7);
    expect(game.inspect().playerGold).toBe(goldBeforeGrades - gradeCosts);
    expect(first.baseCombatStats).toEqual(BRANCH_A.grades[3].stats);
    expect(game.eventsOf('selected-tower').at(-1)?.tower?.level).toBe(7);

    // A tower of the same type built later follows the chosen branch only.
    const second = placeArcher(game, SECOND_ANCHOR);
    upgrade(game, second.id, 2);
    const goldBeforeSecondPick = game.inspect().playerGold;
    game.command('choose-tower-branch', { towerId: second.id, branchId: BRANCH_B.id });
    game.command('choose-tower-branch', { towerId: second.id, branchId: BRANCH_A.id });
    expect(game.inspect().playerGold).toBe(goldBeforeSecondPick);
    expect(game.inspect().duelMatchState.player.towerBranchChoices).toEqual({
      [ARCHER.id]: BRANCH_A.id,
    });
    upgrade(game, second.id, 1);
    expect(second.level).toBe(4);
    expect(second.baseCombatStats).toEqual(BRANCH_A.grades[0].stats);

    // A restart is a new match: every pick is forgotten.
    game.command('restart-match', undefined);
    expect(game.inspect().duelMatchState.player.towerBranchChoices).toEqual({});
    expect(game.latestHud().towerBranchChoices).toEqual({});
  });
});
