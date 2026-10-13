import type { BattlefieldState } from '../../../entities/duel-match';
import { renderBoardSnapshot } from '../../../shared/lib/board-snapshot';
import { RouteSizeClass } from '../../../shared/constants/board-snapshot';
import type { MazeRoundReport, MazeSimulationResult } from './simulateMazeBuildRounds';

const ROUTE_LABEL = 'route';

function renderBattlefield(battlefield: BattlefieldState): string {
  return renderBoardSnapshot({
    grid: battlefield.grid,
    towers: battlefield.towers.map((tower) => ({ anchor: tower.position })),
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
  ].join(' | ');

  return [summary, renderBattlefield(report.battlefield)].join('\n');
}

/** Whole simulation as text: the empty board first, then one block per round. */
export function formatMazeSimulation(result: MazeSimulationResult): string {
  const opening = [
    `entrance (${result.entrance.x},${result.entrance.y}) | exit (${result.exit.x},${result.exit.y})`,
    renderBattlefield(result.initialBattlefield),
  ].join('\n');

  return [opening, ...result.rounds.map(formatMazeRoundReport)].join('\n\n');
}
