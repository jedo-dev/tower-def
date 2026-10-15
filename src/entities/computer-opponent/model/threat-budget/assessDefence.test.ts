import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../../shared/types/content-ids';
import {
  createInitialDuelMatchState,
  type BattlefieldInitParams,
} from '../../../duel-match/model/state';
import type { DuelMatchState } from '../../../duel-match/model/types';
import { assessDefence } from './assessDefence';

/** A fresh match whose player seat expects no sends, so only the baseline wave counts. */
function quietMatch(
  playerRaceId: RaceId,
  opponentRaceId: RaceId,
  params?: BattlefieldInitParams,
): DuelMatchState {
  const state = createInitialDuelMatchState(playerRaceId, opponentRaceId, params);
  return { ...state, player: { ...state.player, income: 0 } };
}

describe('entities/computer-opponent/threat-budget assessDefence', () => {
  it('estimates the baseline wave from the player roster when the match names none', () => {
    // The game path: the match is created without a baseline override.
    const defaulted = assessDefence(createInitialDuelMatchState(RaceId.ELF, RaceId.ORC));
    const explicit = assessDefence(
      createInitialDuelMatchState(RaceId.ELF, RaceId.ORC, { baselineRaceId: RaceId.ELF }),
    );

    expect(defaulted.incomingHealth).toBeGreaterThan(0);
    expect(defaulted).toEqual(explicit);
  });

  it('estimates the baseline wave from the match baseline race, not either seat', () => {
    // The simulator path: both seats differ from `--baseline-race`.
    const simulated = assessDefence(
      quietMatch(RaceId.ORC, RaceId.ELF, { baselineRaceId: RaceId.UNDEAD }),
    );
    const undeadSeats = assessDefence(
      quietMatch(RaceId.UNDEAD, RaceId.UNDEAD, { baselineRaceId: RaceId.UNDEAD }),
    );
    const orcBaseline = assessDefence(
      quietMatch(RaceId.ORC, RaceId.ELF, { baselineRaceId: RaceId.ORC }),
    );

    expect(simulated.incomingHealth).toBe(undeadSeats.incomingHealth);
    expect(simulated.incomingHealth).not.toBe(orcBaseline.incomingHealth);
  });
});
