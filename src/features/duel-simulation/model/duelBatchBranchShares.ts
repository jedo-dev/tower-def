import {
  BUILDABLE_TOWER_IDS,
  getTowerTalentBranches,
  type BuildableTowerId,
} from '../../../entities/tower';

// Branch pick shares per tower type (tower-def-02k.11): of the sides that
// picked a branch for a type, how many took each of its branches, so a branch
// the computer never takes shows as 0 of N instead of going missing.

/** A side's picks: race tower id to the branch id chosen for it. */
export type SideBranchChoices = Readonly<Record<string, string>>;

export type BranchShare = { branchId: string; count: number };

export type TowerBranchShare = {
  towerId: string;
  /** Sides that picked a branch for this type: the eligible cases. */
  sides: number;
  /** Every authored branch of the type in order (picked or not), then any unknown pick. */
  picks: readonly BranchShare[];
};

function isBuildableTowerId(towerId: string): towerId is BuildableTowerId {
  return (BUILDABLE_TOWER_IDS as readonly string[]).includes(towerId);
}

function sharesOf(towerId: string, chosen: readonly string[]): TowerBranchShare {
  const branches = isBuildableTowerId(towerId) ? getTowerTalentBranches(towerId) : [];
  const authored = branches.map((branch) => branch.id);
  const extra = chosen.filter((branchId, index) => {
    return !authored.includes(branchId) && chosen.indexOf(branchId) === index;
  });
  return {
    towerId,
    sides: chosen.length,
    picks: [...authored, ...extra].map((branchId) => ({
      branchId,
      count: chosen.filter((id) => id === branchId).length,
    })),
  };
}

/** One row per tower type any side picked a branch for, in first-seen order. */
export function summarizeBranchShares(
  sides: readonly { branchChoices: SideBranchChoices }[],
): TowerBranchShare[] {
  const chosenByTower = new Map<string, string[]>();
  for (const side of sides) {
    for (const [towerId, branchId] of Object.entries(side.branchChoices)) {
      chosenByTower.set(towerId, [...(chosenByTower.get(towerId) ?? []), branchId]);
    }
  }
  return [...chosenByTower.entries()].map(([towerId, chosen]) => sharesOf(towerId, chosen));
}
