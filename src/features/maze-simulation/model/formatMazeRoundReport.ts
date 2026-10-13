import type { BattlefieldState } from '../../../entities/duel-match';
import { renderBoardSnapshot, towerSnapshotLabel } from '../../../shared/lib/board-snapshot';
import {
  BOARD_SNAPSHOT_TOWER_LEGEND,
  RouteSizeClass,
} from '../../../shared/constants/board-snapshot';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import type {
  MazeRoundReport,
  MazeRouteCost,
  MazeSimulationResult,
} from './simulateMazeBuildRounds';

const ROUTE_LABEL = 'route';
const ROUTE_COST_DECIMALS = 1;

function formatCost(cost: number | null): string {
  return cost === null ? 'sealed' : cost.toFixed(ROUTE_COST_DECIMALS);
}

/** Octile costs of both size-class routes, the number the maze planner maximizes. */
function formatRouteCost(routeCost: MazeRouteCost): string {
  return `route cost small ${formatCost(routeCost.small)} large ${formatCost(routeCost.large)}`;
}

function renderBattlefield(battlefield: BattlefieldState): string {
  return renderBoardSnapshot({
    grid: battlefield.grid,
    towers: battlefield.towers.map((tower) => ({
      anchor: tower.position,
      width: TOWER_FOOTPRINT.width,
      height: TOWER_FOOTPRINT.height,
      label: towerSnapshotLabel(tower.type, tower.level),
    })),
    routes: [{ label: ROUTE_LABEL, sizeClass: RouteSizeClass.SMALL, cells: battlefield.path }],
  });
}

export function formatMazeRoundReport(report: MazeRoundReport): string {
  const summary = [
    `round ${report.round}`,
    `intent ${report.intent}`,
    `gold ${report.goldBeforeBuild} -> ${report.goldAfterBuild}`,
    `spent ${report.spentGold}`,
    `built ${report.builtCount}`,
    `upgraded ${report.upgradedCount}`,
    `towers ${report.battlefield.towers.length}`,
    `route length ${report.battlefield.path.length}`,
    formatRouteCost(report.routeCost),
  ].join(' | ');

  return [summary, renderBattlefield(report.battlefield)].join('\n');
}

/** Whole simulation as text: the empty board first, then one block per round. */
export function formatMazeSimulation(result: MazeSimulationResult): string {
  const opening = [
    [
      `entrance (${result.entrance.x},${result.entrance.y})`,
      `exit (${result.exit.x},${result.exit.y})`,
      formatRouteCost(result.initialRouteCost),
    ].join(' | '),
    BOARD_SNAPSHOT_TOWER_LEGEND,
    renderBattlefield(result.initialBattlefield),
  ].join('\n');

  return [opening, ...result.rounds.map(formatMazeRoundReport)].join('\n\n');
}
