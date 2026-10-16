import {
  generateBaselineWaveId,
  type DuelMatchState,
  type SentCreepLeaks,
} from '../../../entities/duel-match';
import type { CreepSenderSide } from '../../../entities/creep';
import type { UnitConfig, UnitId } from '../../../entities/unit';
import { composeWave } from '../../../entities/wave';
import type { BattlefieldState } from '../../../entities/duel-match';
import {
  DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC,
  DUEL_SIMULATION_TIMING,
} from './duelSimulationConfig';
import {
  createHeadlessBattlefield,
  createHeadlessStepper,
  isHeadlessBattlefieldResolved,
  type HeadlessBattlefield,
} from './headlessBattlefield';

/** What one field saw during a wave. */
export type DuelFieldWaveResult = {
  spawned: number;
  kills: number;
  /** Extra gold aura kill bonuses earned on this field, paid with the bounties. */
  killBonusGold: number;
  leaks: number;
  sentLeaks: number;
  /** Leaks of air creeps, which bypass the maze on the straight air route. */
  airLeaks: number;
};

export type DuelWaveResult = {
  /** Side A's field (`player` in the duel state). */
  fieldA: DuelFieldWaveResult;
  /** Side B's field (`opponent` in the duel state). */
  fieldB: DuelFieldWaveResult;
  ticks: number;
  /** The wave hit the tick limit before both fields resolved. */
  isCutOff: boolean;
  sentLeaks: SentCreepLeaks;
};

export type DuelWaveInput = {
  /** Duel state at wave start: routes refreshed, send queues still filled. */
  state: DuelMatchState;
  waveNumber: number;
  baselineUnits: readonly UnitConfig[];
  tickMs: number;
  maxTicks: number;
};

/**
 * One field's wave: the shared baseline plus whatever the other side sent,
 * through the same `composeWave` the wave preview uses.
 */
function createField(
  battlefield: BattlefieldState,
  input: DuelWaveInput,
  attackerQueue: readonly UnitId[],
  attacker: CreepSenderSide,
): HeadlessBattlefield {
  const composition = composeWave({
    waveId: generateBaselineWaveId(input.waveNumber),
    round: input.waveNumber,
    baselineUnits: input.baselineUnits,
    playerSendQueue: attacker === 'player' ? attackerQueue : [],
    opponentSendQueue: attacker === 'opponent' ? attackerQueue : [],
  });
  const baselineUnits = composition.entries
    .filter((entry) => entry.source === 'baseline')
    .map((entry) => entry.unit);
  const sentUnits = composition.entries
    .filter((entry) => entry.source !== 'baseline')
    .map((entry) => entry.unit);

  return createHeadlessBattlefield({
    battlefield,
    waveNumber: input.waveNumber,
    baselineUnits,
    sentUnits,
    sender: attacker,
    timing: DUEL_SIMULATION_TIMING,
  });
}

function summarizeField(field: HeadlessBattlefield): DuelFieldWaveResult {
  return {
    spawned: field.creeps.length,
    kills: field.kills,
    killBonusGold: field.killBonusGold,
    leaks: field.leaks,
    sentLeaks: field.sentLeaks,
    airLeaks: field.airLeaks,
  };
}

/** Plays one wave on both fields at once, in fixed steps, until both resolve. */
export function runDuelWave(input: DuelWaveInput): DuelWaveResult {
  const { state } = input;
  const fieldA = createField(state.player.battlefield, input, state.opponent.sendQueue, 'opponent');
  const fieldB = createField(state.opponent.battlefield, input, state.player.sendQueue, 'player');
  const stepperA = createHeadlessStepper(fieldA, DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC);
  const stepperB = createHeadlessStepper(fieldB, DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC);

  let ticks = 0;
  const isResolved = (): boolean =>
    isHeadlessBattlefieldResolved(fieldA) && isHeadlessBattlefieldResolved(fieldB);

  while (!isResolved() && ticks < input.maxTicks) {
    stepperA.step(input.tickMs);
    stepperB.step(input.tickMs);
    ticks += 1;
  }

  return {
    fieldA: summarizeField(fieldA),
    fieldB: summarizeField(fieldB),
    ticks,
    isCutOff: !isResolved(),
    sentLeaks: { onPlayerField: fieldA.sentLeaks, onOpponentField: fieldB.sentLeaks },
  };
}
