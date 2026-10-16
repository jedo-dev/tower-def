import { describe, expect, it } from 'vitest';
import { RaceId, TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import { getTowerTalentBranches, NO_TOWER_BRANCH_CHOICES } from '../../../tower/model/talents';
import type { TowerEntity } from '../../../tower/model/types';
import { getTotalInvestedGold } from '../../../tower/model/upgrade';
import { createComputerTowerEntity } from '../computerTowerEntity';
import {
  BETWEEN_LANES_ANCHOR,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
} from '../damage-placement/damagePlacementFixtures';
import { toLedgerTowers } from '../damage-placement/roundInvestmentInputs';
import { createRouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { createRouteGeometry } from '../damage-placement/routeGeometry';
import { computeBoardValuePerGold, hasEconomyGrades } from './boardValuePerGold';

function spear(id: string, anchor: { x: number; y: number }, level: number): TowerEntity {
  return {
    ...createComputerTowerEntity(id, TowerTypeId.SINGLE, anchor, 50, RaceId.ORC),
    level,
  };
}

function ledgerOf(towers: TowerEntity[]) {
  return createRouteDamageLedger(
    createRouteGeometry(U_TURN_ROUTE),
    toLedgerTowers(towers),
    UnitMoveType.GROUND,
  );
}

describe('entities/computer-opponent/talent-development board value per gold', () => {
  it('divides what the board adds on the ledger by the gold it took', () => {
    const towers = [spear('a', BETWEEN_LANES_ANCHOR, 3), spear('b', STRAIGHT_ANCHOR, 1)];
    const ledger = ledgerOf(towers);
    const value =
      ledger.contributionOf(ledger.towers[0], 0) + ledger.contributionOf(ledger.towers[1], 1);
    const gold =
      towers[0].cost +
      getTotalInvestedGold(towers[0], 3) +
      towers[1].cost +
      getTotalInvestedGold(towers[1], 1);

    expect(computeBoardValuePerGold(towers, ledger, NO_TOWER_BRANCH_CHOICES)).toBeCloseTo(
      value / gold,
    );
  });

  it('is zero on an empty board', () => {
    expect(computeBoardValuePerGold([], ledgerOf([]), NO_TOWER_BRANCH_CHOICES)).toBe(0);
  });

  it('spots the branches whose grades pay gold', () => {
    const [headquarters, treasury] = getTowerTalentBranches('human_guard_post');
    const [throwers, heavy] = getTowerTalentBranches('orc_spear_watchtower');

    expect(hasEconomyGrades(treasury.grades)).toBe(true);
    expect(hasEconomyGrades(headquarters.grades)).toBe(false);
    expect(hasEconomyGrades(throwers.grades)).toBe(false);
    expect(hasEconomyGrades(heavy.grades)).toBe(false);
  });
});
