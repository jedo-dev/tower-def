// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { resolveBuildableTowerById } from '../entities/tower';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../features/game-engine/test/sceneHarness';
import { TowerTalentPricing } from '../shared/constants/towerTalents';
import { TowerTypeId } from '../shared/types/content-ids';
import type { GridPosition } from '../shared/types/pathfinding';
import { TowerActionPanel } from '../widgets/tower-action-panel';

const SCENE_PRELOAD_TIMEOUT_MS = 60_000;
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const ANCHOR: GridPosition = { x: 8, y: 14 };
const WALLET = 5000;
const ARCHER = resolveBuildableTowerById('undead_bone_archer_tower');
const BRANCH_B = ARCHER.talentBranches[1];

/**
 * The branch chooser rendered against the real scene over the typed bridge
 * (tower-def-bge.4): Develop -> choose -> confirm reaches the engine, which
 * charges the branch, records it and lets Upgrade climb to grade 4.
 */
describe('tower branch chooser (live scene + panel)', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  }, SCENE_PRELOAD_TIMEOUT_MS);

  afterEach(() => {
    cleanup();
    harness?.destroy();
    harness = null;
    consoleError.mockClear();
  });

  it('chooses a branch from the panel and upgrades the tower to grade 4', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    game.setPlayerGold(WALLET);
    render(<TowerActionPanel />);

    act(() => {
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.clickBuildAnchor(ANCHOR);
    });
    const tower = game.inspect().playerField.towers.at(-1)!.entity;
    expect(tower.buildableTowerId).toBe(ARCHER.id);
    act(() => {
      game.command('upgrade-tower', { towerId: tower.id });
      game.command('upgrade-tower', { towerId: tower.id });
    });
    expect(tower.level).toBe(3);

    const panel = screen.getByRole('region', { name: 'Tower actions' });
    fireEvent.click(within(panel).getByRole('button', { name: /^Develop tower/ }));
    const dialog = screen.getByRole('dialog', { name: `Develop ${ARCHER.name}` });
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(`^Choose ${BRANCH_B.name} for`) }),
    );
    const goldBeforeBranch = game.inspect().playerGold;
    act(() => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: new RegExp(`^Confirm ${BRANCH_B.name} for`) }),
      );
    });

    expect(game.inspect().duelMatchState.player.towerBranchChoices).toEqual({
      [ARCHER.id]: BRANCH_B.id,
    });
    expect(game.inspect().playerGold).toBe(goldBeforeBranch - TowerTalentPricing.BRANCH_COST);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(panel).getByRole('note', { name: `Branch: ${BRANCH_B.name}` })).toBeDefined();

    act(() => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Upgrade tower to level 4' }));
    });
    expect(tower.level).toBe(4);
    expect(tower.baseCombatStats).toEqual(BRANCH_B.grades[0].stats);
    expect(within(panel).getByText('Lv 4/7')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
