// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  getCreatureBranchCost,
  getNextCreatureGradeCost,
  resolveUnitConfigById,
} from '../entities/unit';
import {
  HARNESS_DEFAULT_SETUP,
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../features/game-engine/test/sceneHarness';
import { MatchDock } from '../pages/game-page/ui/MatchDock';

const SCENE_PRELOAD_TIMEOUT_MS = 60_000;
const FIEND = resolveUnitConfigById('undead_crypt_fiend');
const FIEND_B = FIEND.talentBranches[1];
/** Branch plus grades 1 and 2 at tier 2, with a little to spare. */
const STARTING_XP =
  getCreatureBranchCost(FIEND.tier) +
  (getNextCreatureGradeCost(FIEND.tier, 0) ?? 0) +
  (getNextCreatureGradeCost(FIEND.tier, 1) ?? 0) +
  3;

/**
 * The dock's SEND tab in develop mode against the real scene over the typed bridge
 * (tower-def-716.4): Develop -> choose -> confirm and two upgrades reach the
 * engine, and the next send spawns at the bought grade.
 */
describe('creature develop UI (live scene + send panel)', () => {
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

  it('chooses a branch, upgrades twice and sends the creature at grade 2', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    render(<MatchDock setup={HARNESS_DEFAULT_SETUP} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Send/ }));
    act(() => {
      game.setPlayerCreatureXp({ [FIEND.tier]: STARTING_XP });
      game.tick(1);
    });
    expect(game.latestHud().creatureXpByTier).toEqual({ [FIEND.tier]: STARTING_XP });

    const panel = screen.getByRole('region', { name: 'Creep sending panel' });
    fireEvent.click(screen.getByRole('button', { name: /^Develop creatures/ }));
    fireEvent.click(within(panel).getByRole('button', { name: /^Develop Crypt Fiend/ }));
    const dialog = screen.getByRole('dialog', { name: 'Develop Crypt Fiend' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(`^Choose ${FIEND_B.name} for`) }),
    );
    act(() => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: new RegExp(`^Confirm ${FIEND_B.name} for`) }),
      );
    });

    expect(game.inspect().duelMatchState.player.creatureBranchChoices).toEqual({
      [FIEND.id]: FIEND_B.id,
    });
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => {
      fireEvent.click(
        within(panel).getByRole('button', { name: /^Upgrade Crypt Fiend to grade 1/ }),
      );
    });
    act(() => {
      fireEvent.click(
        within(panel).getByRole('button', { name: /^Upgrade Crypt Fiend to grade 2/ }),
      );
    });
    expect(game.inspect().duelMatchState.player.creatureGrades).toEqual({ [FIEND.id]: 2 });
    expect(game.inspect().duelMatchState.player.creatureXpByTier).toEqual({ [FIEND.tier]: 3 });
    const upgrade = within(panel).getByRole('button', { name: /^Upgrade Crypt Fiend to grade 3/ });
    expect(upgrade.getAttribute('aria-disabled')).toBe('true');
    expect(upgrade.querySelector('[data-creature-grade]')?.textContent).toBe('G2/4');

    fireEvent.click(screen.getByRole('button', { name: /^Develop creatures/ }));
    const send = within(panel).getByRole('button', { name: /^Send Crypt Fiend/ });
    expect(send.getAttribute('aria-label')).toContain(`Grade 2 of 4, ${FIEND_B.name}`);
    act(() => {
      fireEvent.click(send);
      game.command('start-wave', undefined);
    });

    const [spawn] = game
      .inspect()
      .pendingOpponentSpawns.filter((pending) => pending.sender === 'player')
      .map((pending) => pending.unit);
    const gradeTwo = FIEND_B.grades[1];
    expect(spawn.id).toBe(FIEND.id);
    expect(spawn.health).toBe(gradeTwo.health);
    expect(spawn.speed).toBe(gradeTwo.speed);
    expect(spawn.physicalArmor).toBe(gradeTwo.physicalArmor);
    expect(spawn.magicalArmor).toBe(gradeTwo.magicalArmor);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
