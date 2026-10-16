import { awardBonusGold } from '../../../../entities/duel-match';
import { getTowersIncomePerRound } from '../../../../entities/tower';
import { summarizeFieldLeaks } from '../../runtime/duel/fieldLeakSettlement';
import {
  applyDuelRoundEnd as applyDuelRoundEndRuntime,
  publishRoundLifeEvents,
  publishRoundSettled,
  type ApplyDuelRoundEndResult,
  type DuelMatchRuntimeState,
} from '../../runtime/duel/gameSceneDuelRuntime';
import { buildSentCreepOutcomes } from '../../runtime/duel/sentCreepOutcomeTally';
import {
  mapDuelEndReasonToOutcomeReason,
  mapRaceIdToHudFaction,
  resolveMatchOutcomeStatus,
} from '../gameScene.helpers';
import type { GameSceneContext } from './gameSceneContext';
import type { GameSceneState } from './gameSceneState';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { setPlayerGold, syncDuelPlayerGoldFromWallet } from './sceneQueries';

const OPPONENT_LEAK_HISTORY_LIMIT = 10;

function recordOpponentLeakHistory(
  state: GameSceneState,
  round: number,
  leakedCount: number,
): void {
  state.opponentLeakHistory.push({ round, leakedCount });
  if (state.opponentLeakHistory.length > OPPONENT_LEAK_HISTORY_LIMIT) {
    state.opponentLeakHistory.shift();
  }
}

/** Stores the round's outcome on the scene and mirrors it into the registry. */
function applyMatchOutcome(context: GameSceneContext, result: ApplyDuelRoundEndResult): void {
  const { scene, state } = context;
  state.matchWinner = result.winner === null ? null : mapRaceIdToHudFaction(result.winner);
  state.matchOutcomeStatus = resolveMatchOutcomeStatus(result.isMatchOver, result.winningSide);
  state.matchOutcomeReason = mapDuelEndReasonToOutcomeReason(result.endReason);
  scene.registry.set('duel.match.outcome', state.matchOutcomeStatus);
  if (state.matchWinner !== null) {
    scene.registry.set('duel.match.winner', state.matchWinner);
  } else {
    scene.registry.remove('duel.match.winner');
  }
}

/** Settles the round once both fields resolved: leaks, income, bounty and match outcome. */
export function applyDuelRoundEndFromResolvedWave(context: GameSceneContext): void {
  const { state } = context;
  const { runState, playerField, opponentField } = state;
  const duelRuntimeState: DuelMatchRuntimeState = {
    duelMatchState: state.duelMatchState,
    wavePhaseState: runState.wavePhaseState,
    isGameOver: runState.isGameOver,
    nextWaveStartsAtMs: runState.nextWaveStartsAtMs,
  };
  const opponentLeakedCreeps = opponentField.creeps.filter(
    (creep) => creep.entity.status === 'escaped',
  ).length;
  recordOpponentLeakHistory(state, state.duelMatchState.round, opponentLeakedCreeps);
  const leaks = summarizeFieldLeaks(
    playerField.creeps.map((c) => c.entity),
    opponentField.creeps.map((c) => c.entity),
  );
  const result = applyDuelRoundEndRuntime({
    state: duelRuntimeState,
    deps: context.wiring.duelMatchRuntimeDeps,
    playerLeakedCreeps: leaks.playerLeakedLives,
    opponentLeakedCreeps: leaks.opponentLeakedLives,
    sentLeaks: leaks.sentLeaks,
    towerIncome: {
      player: getTowersIncomePerRound(playerField.towers.map((tower) => tower.entity)),
      opponent: getTowersIncomePerRound(opponentField.towers.map((tower) => tower.entity)),
    },
    sentOutcomes: buildSentCreepOutcomes(
      state.sentCreepDeaths,
      playerField.creeps.map((creep) => creep.entity),
      opponentField.creeps.map((creep) => creep.entity),
    ),
  });

  const previousOpponentHp = state.duelMatchState.opponent.hp;
  state.duelMatchState = awardBonusGold(
    duelRuntimeState.duelMatchState,
    'opponent',
    leaks.leakGoldToOpponent,
  );
  if (leaks.leakGoldToPlayer > 0) {
    setPlayerGold(context, runState.playerGold + leaks.leakGoldToPlayer);
  }
  runState.wavePhaseState = duelRuntimeState.wavePhaseState;
  runState.isGameOver = duelRuntimeState.isGameOver;
  runState.nextWaveStartsAtMs = duelRuntimeState.nextWaveStartsAtMs;
  publishRoundLifeEvents(previousOpponentHp, result);
  publishRoundSettled(
    { round: runState.currentWaveNumber, bountyEarned: runState.waveKillBountyEarned },
    result,
  );
  if (result.playerIncomePaid > 0) {
    setPlayerGold(context, runState.playerGold + result.playerIncomePaid);
  }
  syncDuelPlayerGoldFromWallet(state);
  applyMatchOutcome(context, result);
  publishHudSnapshot(state);
}
