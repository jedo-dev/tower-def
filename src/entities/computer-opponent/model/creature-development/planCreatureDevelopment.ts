import { resolveUnitConfigById } from '../../../unit/model/registry';
import {
  chooseCreatureBranch,
  getChosenCreatureBranchId,
  upgradeCreature,
  type CreatureTalentLedger,
} from '../../../unit/model/talents';
import type { UnitConfig, UnitId } from '../../../unit/model/types';
import { selectBestCreatureBranch, type CreatureValuationContext } from './branchValuation';
import { CreatureValuation } from './constants';

/** Picks a talent branch for a sendable creature (`canChooseCreatureBranch` rules). */
export type ChooseCreatureBranchAction = {
  kind: 'choose_creature_branch';
  unitId: UnitId;
  branchId: string;
};

/** Buys the next grade of a creature along its chosen branch (`canUpgradeCreature` rules). */
export type UpgradeCreatureAction = {
  kind: 'upgrade_creature';
  unitId: UnitId;
};

export type CreatureDevelopmentAction = ChooseCreatureBranchAction | UpgradeCreatureAction;

export type CreatureDevelopmentInput = CreatureValuationContext & {
  /** The creatures this side may send. */
  sendableUnitIds: readonly UnitId[];
  ledger: CreatureTalentLedger;
  /** Sends planned (and already queued) this build phase; the most-sent creature develops first. */
  plannedSends: readonly UnitId[];
};

export type CreatureDevelopmentPlan = {
  actions: readonly CreatureDevelopmentAction[];
  /** The ledger after every action, through the shared talent rules. */
  ledger: CreatureTalentLedger;
};

type RankedUnit = {
  unit: UnitConfig;
  plannedCount: number;
  hasBranch: boolean;
  score: number;
};

function rankUnits(input: CreatureDevelopmentInput): RankedUnit[] {
  const ranked: RankedUnit[] = [];
  for (const unitId of input.sendableUnitIds) {
    const unit = resolveUnitConfigById(unitId);
    if (unit.talentBranches.length === 0) {
      continue;
    }
    const hasBranch =
      getChosenCreatureBranchId(unitId, input.ledger.creatureBranchChoices) !== null;
    ranked.push({
      unit,
      plannedCount: input.plannedSends.filter((planned) => planned === unitId).length,
      hasBranch,
      score: hasBranch ? 0 : (selectBestCreatureBranch(unit, input)?.score ?? 0),
    });
  }
  // Most sent first; a started branch before a new one; then value, tier and id.
  return ranked.sort(
    (left, right) =>
      right.plannedCount - left.plannedCount ||
      Number(right.hasBranch) - Number(left.hasBranch) ||
      right.score - left.score ||
      right.unit.tier - left.unit.tier ||
      left.unit.id.localeCompare(right.unit.id),
  );
}

/**
 * Spends this side's creature experience for one build phase: for each
 * creature in rank order, the best branch when it has none, then grades in
 * order while its tier can pay. Every step goes through the shared rules
 * (`chooseCreatureBranch`, `upgradeCreature`), so experience never goes
 * negative and the plan replays exactly on the match state.
 */
export function planCreatureDevelopment(input: CreatureDevelopmentInput): CreatureDevelopmentPlan {
  if (input.valuation === CreatureValuation.NONE) {
    return { actions: [], ledger: input.ledger };
  }
  const actions: CreatureDevelopmentAction[] = [];
  let ledger = input.ledger;
  for (const { unit } of rankUnits(input)) {
    if (getChosenCreatureBranchId(unit.id, ledger.creatureBranchChoices) === null) {
      const best = selectBestCreatureBranch(unit, input);
      if (best === undefined) {
        continue;
      }
      const picked = chooseCreatureBranch(ledger, unit, best.branchId);
      if (!picked.check.allowed) {
        continue;
      }
      ledger = picked.ledger;
      actions.push({ kind: 'choose_creature_branch', unitId: unit.id, branchId: best.branchId });
    }
    for (let upgraded = upgradeCreature(ledger, unit); upgraded.check.allowed;) {
      ledger = upgraded.ledger;
      actions.push({ kind: 'upgrade_creature', unitId: unit.id });
      upgraded = upgradeCreature(ledger, unit);
    }
  }
  return { actions, ledger };
}
