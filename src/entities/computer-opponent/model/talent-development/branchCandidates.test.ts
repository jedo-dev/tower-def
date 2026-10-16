import { describe, expect, it } from 'vitest';
import { TowerTalentPricing } from '../../../../shared/constants/towerTalents';
import { RaceId, TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import type { GridPoint } from '../../../../shared/types/grid';
import {
  chooseBranch,
  getTowerTalentBranches,
  NO_TOWER_BRANCH_CHOICES,
  type TowerBranchChoices,
} from '../../../tower/model/talents';
import type { TowerEntity } from '../../../tower/model/types';
import { createComputerTowerEntity } from '../computerTowerEntity';
import {
  BETWEEN_LANES_ANCHOR,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
} from '../damage-placement/damagePlacementFixtures';
import { planRoundInvestments } from '../damage-placement/planRoundInvestments';
import {
  collectUpgradeCandidates,
  toLedgerTowers,
} from '../damage-placement/roundInvestmentInputs';
import { createRouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { createRouteGeometry } from '../damage-placement/routeGeometry';
import { collectBranchCandidates } from './branchCandidates';
import { TalentValuation } from './constants';

const SPEAR_ID = 'orc_spear_watchtower';
const [THROWERS, HEAVY] = getTowerTalentBranches(SPEAR_ID);

function spear(id: string, anchor: GridPoint, level: number): TowerEntity {
  return {
    ...createComputerTowerEntity(id, TowerTypeId.SINGLE, anchor, 50, RaceId.ORC),
    level,
  };
}

function candidatesFor(
  towers: TowerEntity[],
  valuation: TalentValuation = TalentValuation.FULL,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
) {
  const ledger = createRouteDamageLedger(
    createRouteGeometry(U_TURN_ROUTE),
    toLedgerTowers(towers, choices),
    UnitMoveType.GROUND,
  );
  return { ledger, candidates: collectBranchCandidates({ towers, ledger, choices, valuation }) };
}

describe('entities/computer-opponent/talent-development branch candidates', () => {
  it('offers one pick for a type standing at grade 3, opening grade 4 for its grade-3 towers', () => {
    const towers = [
      spear('a', BETWEEN_LANES_ANCHOR, 3),
      spear('b', STRAIGHT_ANCHOR, 3),
      spear('c', { x: 3, y: 10 }, 2),
    ];
    const { candidates } = candidatesFor(towers);

    expect(candidates).toHaveLength(1);
    const [candidate] = candidates;
    expect(candidate.buildableTowerId).toBe(SPEAR_ID);
    expect([THROWERS.id, HEAVY.id]).toContain(candidate.branchId);
    expect(candidate.towerId).toBe('a');
    expect(candidate.cost).toBe(TowerTalentPricing.BRANCH_COST);
    expect(candidate.gradeUpgrades.map((upgrade) => upgrade.towerId)).toEqual(['a', 'b']);
    expect(candidate.gradeUpgrades[0].cost).toBe(TowerTalentPricing.GRADE_COSTS[4]);
  });

  it('never offers a branch for a type below grade 3', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 2), spear('b', STRAIGHT_ANCHOR, 1)];

    expect(candidatesFor(towers).candidates).toEqual([]);
  });

  it('never offers a branch on easy (no valuation)', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3)];

    expect(candidatesFor(towers, TalentValuation.NONE).candidates).toEqual([]);
  });

  it('never offers a second branch for a type that already has one', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3)];
    const choices = chooseBranch(NO_TOWER_BRANCH_CHOICES, SPEAR_ID, THROWERS.id);

    expect(candidatesFor(towers, TalentValuation.FULL, choices).candidates).toEqual([]);
  });

  it('buys grades in order along the chosen branch only', () => {
    const choices = chooseBranch(NO_TOWER_BRANCH_CHOICES, SPEAR_ID, HEAVY.id);
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3), spear('b', STRAIGHT_ANCHOR, 4)];
    const ids = towers.map((tower) => tower.id);

    const [toFour, toFive] = collectUpgradeCandidates(towers, ids, choices);
    expect(toFour.nextStats).toEqual(HEAVY.grades[0].stats);
    expect(toFour.cost).toBe(TowerTalentPricing.GRADE_COSTS[4]);
    expect(toFive.nextStats).toEqual(HEAVY.grades[1].stats);
    expect(toFive.cost).toBe(TowerTalentPricing.GRADE_COSTS[5]);
    expect(toFive.path?.topStats).toEqual(HEAVY.grades[3].stats);
    expect(collectUpgradeCandidates(towers, ids, NO_TOWER_BRANCH_CHOICES)).toEqual([]);
  });

  it('plans the pick before the grade 4 it opens, and one grade per tower a round', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3)];
    const { ledger, candidates } = candidatesFor(towers);
    const plan = planRoundInvestments({
      ledger,
      wall: null,
      damageTypes: [],
      walls: [],
      upgrades: [],
      budget: 5000,
      maxBuilds: 0,
      branches: candidates,
    });

    expect(plan.branches.map((branch) => branch.towerId)).toEqual(['a']);
    expect(plan.upgrades.map((upgrade) => upgrade.towerId)).toEqual(['a']);
    expect(plan.spent).toBe(TowerTalentPricing.BRANCH_COST + TowerTalentPricing.GRADE_COSTS[4]);
  });

  it('skips the pick when the round cannot pay for it', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3)];
    const { ledger, candidates } = candidatesFor(towers);
    const plan = planRoundInvestments({
      ledger,
      wall: null,
      damageTypes: [],
      walls: [],
      upgrades: [],
      budget: TowerTalentPricing.BRANCH_COST - 1,
      maxBuilds: 0,
      branches: candidates,
    });

    expect(plan.branches).toEqual([]);
    expect(plan.spent).toBe(0);
  });
});
