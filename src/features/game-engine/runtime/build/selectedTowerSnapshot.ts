import {
  getChosenBranchId,
  getTowerTalentBranches,
  tryResolveBuildableTowerById,
  type TowerBranchChoices,
  type TowerEntity,
} from '../../../../entities/tower';
import type { SelectedTowerSnapshot } from '../../../../shared/lib/game-bridge/types';

/**
 * What the tower action panel shows for a selected tower: its identity, live
 * stats and both talent branches of its type with the side's pick, so the UI
 * renders the develop chooser without asking the engine again.
 */
export function toSelectedTowerSnapshot(
  entity: TowerEntity,
  choices: TowerBranchChoices,
): SelectedTowerSnapshot {
  const authoredTower = entity.buildableTowerId
    ? tryResolveBuildableTowerById(entity.buildableTowerId)
    : undefined;
  const chosenBranchId = getChosenBranchId(entity.buildableTowerId, choices);

  return {
    id: entity.id,
    type: entity.type,
    ...(authoredTower ? { name: authoredTower.name, buildableTowerId: authoredTower.id } : {}),
    level: entity.level,
    position: { x: entity.position.x, y: entity.position.y },
    cost: entity.cost,
    combatStats: {
      ...entity.combatStats,
      ...(entity.combatStats.onHitEffects
        ? { onHitEffects: entity.combatStats.onHitEffects.map((effect) => ({ ...effect })) }
        : {}),
    },
    availableBranches: getTowerTalentBranches(entity.buildableTowerId).map((branch) => ({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      isChosen: branch.id === chosenBranchId,
    })),
    chosenBranchId,
  };
}
