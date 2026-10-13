import { createMazeEvaluator } from '../../../entities/computer-opponent';
import {
  awardKillBounty,
  clearSendQueue,
  createInitialDuelMatchState,
  refreshBattlefieldRoutes,
  settleRound,
  startRound,
  type BattlefieldState,
  type DuelMatchState,
  type DuelSide,
} from '../../../entities/duel-match';
import { generateWaveUnits } from '../../../entities/wave';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { resolveFactionUnits } from '../../../shared/lib/phaser/scenes/gameScene.helpers';
import { createSeededRandom } from '../../../shared/lib/random/createSeededRandom';
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
// completion reward (the game pays it only to the human wallet) and the
// game's per-field random baseline (both fields share one seeded wave here).

export type DuelWinner = 'A' | 'B' | null;

export type DuelEndReason = 'lives' | 'max_rounds';

/** Octile cost of each size-class route; null when it is sealed. */
export type DuelRouteCost = {
  small: number | null;
  large: number | null;
};

export type DuelSideRoundReport = DuelFieldWaveResult & {
  gold: number;
  income: number;
  lives: number;
  livesStolen: number;
  sentCount: number;
  builtCount: number;
  upgradedCount: number;
  towers: number;
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

/** Decided by lives: a side at 0 is out; both out, or both alive, is a draw. */
function decideWinner(state: DuelMatchState): DuelWinner {
  const isAOut = state.player.hp <= 0;
  const isBOut = state.opponent.hp <= 0;
  if (isAOut === isBOut) {
    if (isAOut || state.player.hp === state.opponent.hp) {
      return null;
    }
    return state.player.hp > state.opponent.hp ? 'A' : 'B';
  }
  return isAOut ? 'B' : 'A';
}

type SideRoundFacts = {
  wave: DuelFieldWaveResult;
  livesStolen: number;
  sentCount: number;
  builtCount: number;
  upgradedCount: number;
};

function reportSide(duelist: DuelMatchState['player'], facts: SideRoundFacts): DuelSideRoundReport {
  return {
    ...facts.wave,
    gold: duelist.gold,
    income: duelist.income,
    lives: duelist.hp,
    livesStolen: facts.livesStolen,
    sentCount: facts.sentCount,
    builtCount: facts.builtCount,
    upgradedCount: facts.upgradedCount,
    towers: duelist.battlefield.towers.length,
    routeCost: measureRouteCost(duelist.battlefield),
  };
}

/** Plays a whole duel between two computers. Deterministic per config. */
export function simulateDuel(config: DuelSimulationConfig): DuelSimulationResult {
  const { entrance, exit } = generateEdgeEndpoints(config.seed);
  const random = createSeededRandom(config.seed);
  const baselineFactionUnits = resolveFactionUnits(config.baselineRaceId);
  const memory: { a: ComputerSideMemory; b: ComputerSideMemory } = {
    a: createComputerSideMemory(),
    b: createComputerSideMemory(),
  };
  let state = createInitialDuelMatchState(config.sideA.raceId, config.sideB.raceId, {
    entrance,
    exit,
  });
  const rounds: DuelRoundReport[] = [];
  let totalTicks = 0;
  let isMatchOver = false;

  for (let round = 1; round <= config.maxRounds && !isMatchOver; round += 1) {
    const build = runDuelBuildPhase(state, { a: config.sideA, b: config.sideB }, memory);
    state = refreshRoutesForWaveStart(build.state);

    const wave = runDuelWave({
      state,
      waveNumber: round,
      baselineUnits: generateWaveUnits({
        waveNumber: round,
        factionUnits: baselineFactionUnits,
        random,
      }),
      tickMs: config.tickMs,
      maxTicks: config.maxWaveTicks,
    });
    totalTicks += wave.ticks;

    state = startRound(clearSendQueue(state)).state;
    state = payKillBounties(state, 'player', wave.fieldA.kills);
    state = payKillBounties(state, 'opponent', wave.fieldB.kills);
    const settlement = settleRound(state, wave.fieldA.leaks, wave.fieldB.leaks, wave.sentLeaks);
    state = settlement.state;
    isMatchOver = settlement.isMatchOver;

    const limit = DuelSimulationDefaults.LEAK_HISTORY_LIMIT;
    recordLeaks(memory.a, round, wave.fieldA.leaks, limit);
    recordLeaks(memory.b, round, wave.fieldB.leaks, limit);

    rounds.push({
      round,
      ticks: wave.ticks,
      isWaveCutOff: wave.isCutOff,
      a: reportSide(state.player, {
        wave: wave.fieldA,
        livesStolen: settlement.playerLivesStolen,
        sentCount: build.sideA.sentCount,
        builtCount: build.sideA.builtCount,
        upgradedCount: build.sideA.upgradedCount,
      }),
      b: reportSide(state.opponent, {
        wave: wave.fieldB,
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
    winner: decideWinner(state),
    endReason: isMatchOver ? 'lives' : 'max_rounds',
    totalTicks,
    finalState: state,
  };
}
