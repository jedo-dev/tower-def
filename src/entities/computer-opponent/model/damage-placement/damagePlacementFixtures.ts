import { TowerTypeId } from '../../../../shared/types/content-ids';
import type { GridPoint } from '../../../../shared/types/grid';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import type { InvestmentTowerType } from './planRoundInvestments';
import type { LedgerTower } from './routeDamageLedger';

function leg(from: GridPoint, to: GridPoint): GridPoint[] {
  const cells: GridPoint[] = [];
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  let x = from.x;
  let y = from.y;
  cells.push({ x, y });
  while (x !== to.x || y !== to.y) {
    x += stepX;
    y += stepY;
    cells.push({ x, y });
  }
  return cells;
}

/**
 * A maze route: right along row 2, a U-turn down column 14, back left along
 * row 5 (the two lanes three rows apart, a 2-row wall between them), then a
 * long straight down column 0.
 *
 *   row 2   >>>>>>>>>>>>>>>v
 *   row 3/4  [between]     v
 *   row 5   v<<<<<<<<<<<<<<<
 *           v
 *           v [straight]
 */
export const U_TURN_ROUTE: readonly GridPoint[] = [
  ...leg({ x: 0, y: 2 }, { x: 14, y: 2 }),
  ...leg({ x: 14, y: 3 }, { x: 14, y: 4 }),
  ...leg({ x: 14, y: 5 }, { x: 0, y: 5 }),
  ...leg({ x: 0, y: 6 }, { x: 0, y: 28 }),
];

/** Block on the wall between the two lanes: it reaches the route twice. */
export const BETWEEN_LANES_ANCHOR: GridPoint = { x: 7, y: 3 };

/** Block beside the long straight: it reaches the route once. */
export const STRAIGHT_ANCHOR: GridPoint = { x: 1, y: 20 };

/** Block next to nothing at all. */
export const OFF_ROUTE_ANCHOR: GridPoint = { x: 16, y: 24 };

export function investmentType(towerType: TowerTypeId, cost: number): InvestmentTowerType {
  return { towerType, cost, stats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] } };
}

export const WALL_TYPE = investmentType(TowerTypeId.SINGLE, 50);
export const SPLASH_TYPE = investmentType(TowerTypeId.SPLASH, 75);
export const FROST_TYPE = investmentType(TowerTypeId.FROST, 70);
export const SUPPORT_TYPE = investmentType(TowerTypeId.SUPPORT, 60);

export function ledgerTower(anchor: GridPoint, type: InvestmentTowerType = WALL_TYPE): LedgerTower {
  if (type.damageType !== undefined) {
    return { anchor, towerType: type.towerType, stats: type.stats, damageType: type.damageType };
  }
  return { anchor, towerType: type.towerType, stats: type.stats };
}
