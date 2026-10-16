import { createMazeEvaluator } from '../../../entities/computer-opponent';
import {
  awardBonusGold,
  awardKillBounty,
  clearSendQueue,
  createInitialDuelMatchState,
  refreshBattlefieldRoutes,
  settleRound,
  startRound,
  type BattlefieldState,
  type DuelMatchState,
  type DuelMatchOutcome,
  type DuelSide,
} from '../../../entities/duel-match';
import { getTowersIncomePerRound } from '../../../entities/tower';
import {
  createDefaultEdgeEndpoints,
  generateEdgeEndpoints,
} from '../../../shared/lib/grid/generateEdgeEndpoints';
import { resolveFactionUnits } from '../../game-engine/scenes/gameScene.helpers';
import { createSharedBaselineWaveSource } from '../../game-engine/runtime/wave/sharedBaselineWave';
import type { GridPoint } from '../../../shared/types/grid';
import {
  createComputerSideMemory,
  recordLeaks,
  runDuelBuildPhase,
  type ComputerSideMemory,
} from './duelBuildPhase';
import { DuelSimulationDefaults, type DuelSimulationConfig } from './duelSimulationConfig';
import { runDuelWave, type DuelFieldWaveResult } from './duelWave';

// Headless AI-vs-AI duel. A round is: both computers send and build (the same
// entry the game uses for its computer), routes are fixed, both fields play
// the wave (shared seeded baseline plus the other side's sends) in fixed
// steps, kills pay the bounty, leaks cost lives and steal lives for the
// sender, and income is paid. Side A is `player` in the duel state, side B is
// `opponent`. Not simulated: rendering, sounds, the single-player wave
// completion reward (the game pays it only to the human wallet).

export type DuelWinner = 'A' | 'B' | null;

export type DuelEndReason = 'lives' | 'max_rounds';

/** Octile cost of each size-class route; null when it is sealed. */
export type DuelRouteCost = {
  small: number | null;
  large: number | null;
};

export type DuelSideRoundReport = DuelFieldWaveResult & {
  /** Gold at the end of the round, after bounties and income. */
  gold: number;
  /** Gold the side left unspent when its build phase ended. */
  unspentGold: number;
  income: number;
  lives: number;
  livesStolen: number;
  sentCount: number;
  builtCount: number;
  upgradedCount: number;
  towers: number;
  /** Highest grade among the side's towers (0 without towers). */
  topGrade: number;
  routeCost: DuelRouteCost;
};

export type DuelRoundReport = {
  round: number;
  ticks: number;
  isWaveCutOff: boolean;
  a: DuelSideRoundReport;
  b: DuelSideRoundReport;
};

export type DuelSimulationResult = {
  config: DuelSimulationConfig;
  entrance: GridPoint;
  exit: GridPoint;
  rounds: DuelRoundReport[];
  winner: DuelWinner;
  endReason: DuelEndReason;
  totalTicks: number;
  finalState: DuelMatchState;
};

function measureRouteCost(battlefield: BattlefieldState): DuelRouteCost {
  const { grid } = battlefield;
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  return { small: routes.smallRouteCost, large: routes.largeRouteCost };
}

function refreshRoutesForWaveStart(state: DuelMatchState): DuelMatchState {
  return {
    ...state,
    player: { ...state.player, battlefield: refreshBattlefieldRoutes(state.player.battlefield) },
    opponent: {
      ...state.opponent,
      battlefield: refreshBattlefieldRoutes(state.opponent.battlefield),
    },
  };
}

function payKillBounties(state: DuelMatchState, side: DuelSide, kills: number): DuelMatchState {
  let next = state;
  for (let kill = 0; kill < kills; kill += 1) {
    next = awardKillBounty(next, side);
  }
  return next;
}

const WINNER_BY_SIDE: Readonly<Record<DuelSide, 'A' | 'B'>> = { player: 'A', opponent: 'B' };

/**
 * A match that ended on lives takes the shared settlement's verdict (with its
 * same-wave tie-break). One that hit the round cap goes to the side with more
 * lives, or is a draw on equal lives.
 */
function decideWinner(state: DuelMatchState, endOutcome: DuelMatchOutcome | null): DuelWinner {
  if (endOutcome !== null) {
    return endOutcome.winningSide === null ? null : WINNER_BY_SIDE[endOutcome.winningSide];
  }
  if (state.player.hp === state.opponent.hp) {
    return null;
  }
  return state.player.hp > state.opponent.hp ? 'A' : 'B';
}

type SideRoundFacts = {
  wave: DuelFieldWaveResult;
  unspentGold: number;
  livesStolen: number;
  sentCount: number;
  builtCount: number;
  upgradedCount: number;
};

function reportSide(duelist: DuelMatchState['player'], facts: SideRoundFacts): DuelSideRoundReport {
  return {
    ...facts.wave,
    gold: duelist.gold,
    unspentGold: facts.unspentGold,
    income: duelist.income,
    lives: duelist.hp,
    livesStolen: facts.livesStolen,
    sentCount: facts.sentCount,
    builtCount: facts.builtCount,
    upgradedCount: facts.upgradedCount,
    towers: duelist.battlefield.towers.length,
    topGrade: duelist.battlefield.towers.reduce((top, tower) => Math.max(top, tower.level), 0),
    routeCost: measureRouteCost(duelist.battlefield),
  };
}

/** Plays a whole duel between two computers. Deterministic per config. */
export function simulateDuel(config: DuelSimulationConfig): DuelSimulationResult {
  const { entrance, exit } =
    config.map === 'classic' ? createDefaultEdgeEndpoints() : generateEdgeEndpoints(config.seed);
  const baselineWaves = createSharedBaselineWaveSource(config.seed);
  const baselineFactionUnits = resolveFactionUnits(config.baselineRaceId);
  const memory: { a: ComputerSideMemory; b: ComputerSideMemory } = {
    a: createComputerSideMemory(),
    b: createComputerSideMemory(),
  };
  let state = createInitialDuelMatchState(config.sideA.raceId, config.sideB.raceId, {
    entrance,
    exit,
    baselineRaceId: config.baselineRaceId,
  });
  const rounds: DuelRoundReport[] = [];
  let totalTicks = 0;
  let isMatchOver = false;
  let endOutcome: DuelMatchOutcome | null = null;

  for (let round = 1; round <= config.maxRounds && !isMatchOver; round += 1) {
    const build = runDuelBuildPhase(state, { a: config.sideA, b: config.sideB }, memory);
    state = refreshRoutesForWaveStart(build.state);

    const wave = runDuelWave({
      state,
      waveNumber: round,
      baselineUnits: baselineWaves.rollNextWave(round, baselineFactionUnits),
      tickMs: config.tickMs,
      maxTicks: config.maxWaveTicks,
    });
    totalTicks += wave.ticks;

    state = startRound(clearSendQueue(state)).state;
    state = payKillBounties(state, 'player', wave.fieldA.kills);
    state = payKillBounties(state, 'opponent', wave.fieldB.kills);
    state = awardBonusGold(state, 'player', wave.fieldA.killBonusGold);
    state = awardBonusGold(state, 'opponent', wave.fieldB.killBonusGold);
    const settlement = settleRound(state, wave.fieldA.leaks, wave.fieldB.leaks, wave.sentLeaks, {
      player: getTowersIncomePerRound(state.player.battlefield.towers),
      opponent: getTowersIncomePerRound(state.opponent.battlefield.towers),
    });
    state = settlement.state;
    isMatchOver = settlement.isMatchOver;
    if (isMatchOver) {
      endOutcome = { winningSide: settlement.winningSide, reason: settlement.endReason };
    }

    const limit = DuelSimulationDefaults.LEAK_HISTORY_LIMIT;
    recordLeaks(memory.a, round, wave.fieldA.leaks, limit);
    recordLeaks(memory.b, round, wave.fieldB.leaks, limit);

    rounds.push({
      round,
      ticks: wave.ticks,
      isWaveCutOff: wave.isCutOff,
      a: reportSide(state.player, {
        wave: wave.fieldA,
        unspentGold: build.state.player.gold,
        livesStolen: settlement.playerLivesStolen,
        sentCount: build.sideA.sentCount,
        builtCount: build.sideA.builtCount,
        upgradedCount: build.sideA.upgradedCount,
      }),
      b: reportSide(state.opponent, {
        wave: wave.fieldB,
        unspentGold: build.state.opponent.gold,
        livesStolen: settlement.opponentLivesStolen,
        sentCount: build.sideB.sentCount,
        builtCount: build.sideB.builtCount,
        upgradedCount: build.sideB.upgradedCount,
      }),
    });
  }

  return {
    config,
    entrance,
    exit,
    rounds,
    winner: decideWinner(state, endOutcome),
    endReason: isMatchOver ? 'lives' : 'max_rounds',
    totalTicks,
    finalState: state,
  };
}
