import type { BattlefieldState, DuelistState } from '../../../entities/duel-match';
import { renderBoardSnapshot } from '../../../shared/lib/board-snapshot';
import { RouteSizeClass } from '../../../shared/constants/board-snapshot';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import type { DuelSimulationSide } from './duelSimulationConfig';
import type {
  DuelRoundReport,
  DuelRouteCost,
  DuelSideRoundReport,
  DuelSimulationResult,
} from './simulateDuel';

const ROUTE_COST_DECIMALS = 1;

function formatCost(cost: number | null): string {
  return cost === null ? 'sealed' : cost.toFixed(ROUTE_COST_DECIMALS);
}

function formatRouteCost(routeCost: DuelRouteCost): string {
  return `${formatCost(routeCost.small)}/${formatCost(routeCost.large)}`;
}

/** `label a/b` for one number both sides report. */
function pair(
  label: string,
  a: DuelSideRoundReport,
  b: DuelSideRoundReport,
  pick: (side: DuelSideRoundReport) => number,
): string {
  return `${label} ${pick(a)}/${pick(b)}`;
}

/** One line per round; every pair reads side A / side B. */
export function formatDuelRoundLine(report: DuelRoundReport): string {
  const { a, b } = report;
  return [
    `round ${report.round}`,
    pair('gold', a, b, (side) => side.gold),
    pair('income', a, b, (side) => side.income),
    pair('lives', a, b, (side) => side.lives),
    pair('leaks', a, b, (side) => side.leaks),
    pair('kills', a, b, (side) => side.kills),
    pair('sent', a, b, (side) => side.sentCount),
    pair('towers', a, b, (side) => side.towers),
    pair('grade', a, b, (side) => side.topGrade),
    `route s/l A ${formatRouteCost(a.routeCost)} B ${formatRouteCost(b.routeCost)}`,
    `ticks ${report.ticks}${report.isWaveCutOff ? ' (cut off)' : ''}`,
  ].join(' | ');
}

function renderBattlefield(battlefield: BattlefieldState): string {
  return renderBoardSnapshot({
    grid: battlefield.grid,
    towers: battlefield.towers.map((tower) => ({
      anchor: tower.position,
      width: TOWER_FOOTPRINT.width,
      height: TOWER_FOOTPRINT.height,
    })),
    routes: [
      { label: 'small', sizeClass: RouteSizeClass.SMALL, cells: battlefield.routes.small },
      { label: 'large', sizeClass: RouteSizeClass.LARGE, cells: battlefield.routes.large },
    ],
  });
}

/** `grades 1x4 3x2 5x1 | branches id=branch`: how far the side developed its towers. */
export function formatTowerDevelopment(duelist: DuelistState): string {
  const countByGrade = new Map<number, number>();
  for (const tower of duelist.battlefield.towers) {
    countByGrade.set(tower.level, (countByGrade.get(tower.level) ?? 0) + 1);
  }
  const grades = [...countByGrade.entries()]
    .sort(([left], [right]) => left - right)
    .map(([grade, count]) => `${grade}x${count}`)
    .join(' ');
  const branches = Object.entries(duelist.towerBranchChoices)
    .map(([towerId, branchId]) => `${towerId}=${branchId}`)
    .join(' ');
  return `grades ${grades || 'none'} | branches ${branches || 'none'}`;
}

function describeSide(label: string, side: DuelSimulationSide): string {
  return `${label} ${side.raceId} ${side.difficulty}`;
}

function formatWinner(result: DuelSimulationResult): string {
  const rounds = `after ${result.rounds.length} rounds (${result.endReason})`;
  const { player, opponent } = result.finalState;
  const lives = `lives ${player.hp}/${opponent.hp}`;
  if (result.winner === null) {
    return `draw ${rounds}, ${lives}, ${result.totalTicks} ticks`;
  }
  const side = result.winner === 'A' ? result.config.sideA : result.config.sideB;
  return `winner ${describeSide(result.winner, side)} ${rounds}, ${lives}, ${result.totalTicks} ticks`;
}

/** The whole duel as text: setup, one line per round, both final boards, the winner. */
export function formatDuelSimulation(result: DuelSimulationResult): string {
  const { config } = result;
  const header = [
    `seed ${config.seed}`,
    describeSide('A', config.sideA),
    describeSide('B', config.sideB),
    `baseline ${config.baselineRaceId}`,
    `entrance (${result.entrance.x},${result.entrance.y})`,
    `exit (${result.exit.x},${result.exit.y})`,
  ].join(' | ');

  return [
    header,
    ...result.rounds.map(formatDuelRoundLine),
    '',
    describeSide('board A', config.sideA),
    renderBattlefield(result.finalState.player.battlefield),
    formatTowerDevelopment(result.finalState.player),
    '',
    describeSide('board B', config.sideB),
    renderBattlefield(result.finalState.opponent.battlefield),
    formatTowerDevelopment(result.finalState.opponent),
    '',
    formatWinner(result),
  ].join('\n');
}
