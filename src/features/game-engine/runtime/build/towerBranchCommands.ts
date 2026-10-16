import { canChooseBranch } from '../../../../entities/tower';
import { spendGold } from '../../../../entities/player-resources';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { TowerCommandDeps } from './gameSceneTowerCommands';
import { toSelectedTowerSnapshot } from './selectedTowerSnapshot';

export type TowerBranchCommandDeps = Pick<
  TowerCommandDeps,
  | 'playerField'
  | 'canManageTowers'
  | 'getPlayerGold'
  | 'getTowerBranchChoices'
  | 'onTowerBranchChosen'
  | 'onGoldUpdated'
  | 'playSound'
  | 'onHudChanged'
>;

/**
 * `choose-tower-branch`: picks a talent branch for the type of a grade-3 player
 * tower. The pick costs `TowerTalentPricing.BRANCH_COST`, is stored in the
 * match state and unlocks grades 4-7 for every tower of the type; the other
 * branch stays locked for the match. A refused pick only plays the error sound.
 */
export function handleChooseTowerBranchCommand(
  deps: TowerBranchCommandDeps,
  towerId: string,
  branchId: string,
): void {
  if (!deps.canManageTowers()) {
    return;
  }

  const tower = deps.playerField.towers.find((candidate) => candidate.entity.id === towerId);
  const buildableTowerId = tower?.entity.buildableTowerId;
  if (!tower || buildableTowerId === undefined) {
    deps.playSound('ui.error');
    return;
  }

  const check = canChooseBranch(
    tower.entity,
    branchId,
    deps.getTowerBranchChoices(),
    deps.getPlayerGold(),
  );
  const spendResult = check.allowed ? spendGold({ gold: deps.getPlayerGold() }, check.cost) : null;
  if (!spendResult?.spent) {
    deps.playSound('ui.error');
    return;
  }

  deps.onTowerBranchChosen(buildableTowerId, branchId);
  deps.onGoldUpdated(spendResult.resources.gold);
  deps.playSound('economy.gold_spent');
  deps.onHudChanged();

  publishGameEvent('selected-tower', {
    tower: toSelectedTowerSnapshot(tower.entity, deps.getTowerBranchChoices()),
  });
}
