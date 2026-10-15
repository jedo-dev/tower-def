import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../../shared/types/content-ids';
import { createInitialDuelMatchState } from '../../../duel-match/model/state';
import { assessDefence } from './assessDefence';

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
      createInitialDuelMatchState(RaceId.ORC, RaceId.ELF, { baselineRaceId: RaceId.UNDEAD }),
    );
    const undeadBaseline = assessDefence(
      createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ELF, { baselineRaceId: RaceId.UNDEAD }),
    );
    const orcBaseline = assessDefence(
      createInitialDuelMatchState(RaceId.ORC, RaceId.ELF, { baselineRaceId: RaceId.ORC }),
    );

    expect(simulated.incomingHealth).toBe(undeadBaseline.incomingHealth);
    expect(simulated.incomingHealth).not.toBe(orcBaseline.incomingHealth);
  });
});
