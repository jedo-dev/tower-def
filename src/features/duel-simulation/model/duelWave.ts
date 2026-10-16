import {
  collectSentDeathTiers,
  collectSentLeaks,
  resolveQueuedSendUnits,
  type DuelistState,
  type DuelMatchState,
  type SentCreepLeaks,
  type SentCreepOutcomes,
  type SentCreepOutcomesByField,
} from '../../../entities/duel-match';
import type { CreepSenderSide } from '../../../entities/creep';
import type { UnitConfig } from '../../../entities/unit';
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
  /** Lives the leaks take; what the settlement charges (`leakLivesTaken`). */
  leakedLives: number;
  /** Gold the other side earns from its creeps that leaked here (`leakGoldToSender`). */
  leakGoldToSender: number;
  /** Gold this field's side loses for its kills (`killGoldPenaltyToDefender`). */
  killGoldPenalty: number;
};

export type DuelWaveResult = {
  /** Side A's field (`player` in the duel state). */
  fieldA: DuelFieldWaveResult;
  /** Side B's field (`opponent` in the duel state). */
  fieldB: DuelFieldWaveResult;
  ticks: number;
  /** The wave hit the tick limit before both fields resolved. */
  isCutOff: boolean;
  /** Lives the sent creeps' leaks took on each field; steals lives for the sender. */
  sentLeaks: SentCreepLeaks;
  /** Tiers of the sent creeps that died or leaked on each field: creature experience. */
  sentOutcomes: SentCreepOutcomesByField;
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
 * each send at the creature grade it was sent with (`resolveQueuedSendUnits`,
 * the same resolution the game scene spawns from).
 */
function createField(
  battlefield: BattlefieldState,
  input: DuelWaveInput,
  attackerSide: DuelistState,
  attacker: CreepSenderSide,
): HeadlessBattlefield {
  return createHeadlessBattlefield({
    battlefield,
    waveNumber: input.waveNumber,
    baselineUnits: input.baselineUnits,
    sentUnits: resolveQueuedSendUnits(attackerSide),
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
    leakedLives: field.leakedLives,
    leakGoldToSender: field.leakGoldToSender,
    killGoldPenalty: field.killGoldPenalty,
  };
}

function collectSentOutcomes(field: HeadlessBattlefield): SentCreepOutcomes {
  const creeps = field.creeps.map((creep) => creep.entity);
  return { diedTiers: collectSentDeathTiers(creeps), leaks: collectSentLeaks(creeps) };
}

/** Plays one wave on both fields at once, in fixed steps, until both resolve. */
export function runDuelWave(input: DuelWaveInput): DuelWaveResult {
  const { state } = input;
  const fieldA = createField(state.player.battlefield, input, state.opponent, 'opponent');
  const fieldB = createField(state.opponent.battlefield, input, state.player, 'player');
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
    sentOutcomes: {
      onPlayerField: collectSentOutcomes(fieldA),
      onOpponentField: collectSentOutcomes(fieldB),
    },
    sentLeaks: { onPlayerField: fieldA.sentLeakedLives, onOpponentField: fieldB.sentLeakedLives },
  };
}
