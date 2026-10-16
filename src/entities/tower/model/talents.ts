import { TowerTalentPricing, TowerTalentRule } from '../../../shared/constants/towerTalents';
import { tryResolveBuildableTowerById } from './config/buildableTowers';
import type { TowerTalentBranchDefinition } from './content/towerTalentContent';
import type { BuildableTowerId } from './towerIds';
import type { TowerEntity } from './types';

/**
 * Talent rules (docs/11-tower-talents-ru.md, "Общие правила"). A side picks a
 * branch once per race tower ("tower type" in the design doc: each race builds
 * one tower per archetype) for the whole match; the pick unlocks grades 4-7 for
 * every tower of that type, built before or after. Pure functions over an
 * immutable choice record, so the engine, the computer and the simulators share
 * the same rules.
 */

export type TowerTalentBranchId = string;

/** A side's picks, keyed by race tower id; absent means no branch chosen yet. */
export type TowerBranchChoices = Readonly<Partial<Record<BuildableTowerId, TowerTalentBranchId>>>;

export const NO_TOWER_BRANCH_CHOICES: TowerBranchChoices = Object.freeze({});

/** What a branch rule reads from a tower: its archetype, authored id and grade. */
export type TowerTalentRef = Pick<TowerEntity, 'type' | 'buildableTowerId' | 'level'>;

export type BranchChoiceRejectionReason =
  | 'unknown_branch'
  | 'already_chosen'
  | 'not_grade_3'
  | 'not_enough_gold';

export type BranchChoiceCheck =
  | { allowed: true; cost: number }
  | { allowed: false; reason: BranchChoiceRejectionReason };

/** Both branches an authored tower offers; none for a tower built without content. */
export function getTowerTalentBranches(
  buildableTowerId: BuildableTowerId | undefined,
): readonly TowerTalentBranchDefinition[] {
  if (buildableTowerId === undefined) {
    return [];
  }
  return tryResolveBuildableTowerById(buildableTowerId)?.talentBranches ?? [];
}

export function getChosenBranchId(
  buildableTowerId: BuildableTowerId | undefined,
  choices: TowerBranchChoices,
): TowerTalentBranchId | null {
  return buildableTowerId === undefined ? null : (choices[buildableTowerId] ?? null);
}

/** The branch a tower's type follows, or undefined while none is chosen. */
export function resolveChosenBranch(
  tower: Pick<TowerEntity, 'buildableTowerId'>,
  choices: TowerBranchChoices,
): TowerTalentBranchDefinition | undefined {
  const chosenId = getChosenBranchId(tower.buildableTowerId, choices);
  if (chosenId === null) {
    return undefined;
  }
  return getTowerTalentBranches(tower.buildableTowerId).find((branch) => branch.id === chosenId);
}

/**
 * Whether `branchId` may be chosen for this tower's type now: it must be one of
 * the tower's branches, the type must have no branch yet, the tower must stand
 * at grade 3 and the side must afford `TowerTalentPricing.BRANCH_COST`.
 */
export function canChooseBranch(
  tower: TowerTalentRef,
  branchId: TowerTalentBranchId,
  choices: TowerBranchChoices,
  gold: number,
): BranchChoiceCheck {
  const branches = getTowerTalentBranches(tower.buildableTowerId);

  if (tower.buildableTowerId === undefined || !branches.some((branch) => branch.id === branchId)) {
    return { allowed: false, reason: 'unknown_branch' };
  }

  if (getChosenBranchId(tower.buildableTowerId, choices) !== null) {
    return { allowed: false, reason: 'already_chosen' };
  }

  if (tower.level < TowerTalentRule.BRANCH_UNLOCK_GRADE) {
    return { allowed: false, reason: 'not_grade_3' };
  }

  if (gold < TowerTalentPricing.BRANCH_COST) {
    return { allowed: false, reason: 'not_enough_gold' };
  }

  return { allowed: true, cost: TowerTalentPricing.BRANCH_COST };
}

/** Records the pick; callers check `canChooseBranch` (and charge its cost) first. */
export function chooseBranch(
  choices: TowerBranchChoices,
  buildableTowerId: BuildableTowerId,
  branchId: TowerTalentBranchId,
): TowerBranchChoices {
  return { ...choices, [buildableTowerId]: branchId };
}
