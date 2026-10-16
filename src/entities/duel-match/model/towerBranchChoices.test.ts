import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { clearSendQueue, settleRound, startRound } from './lifecycle';
import { createInitialDuelMatchState } from './state';
import { recordTowerBranchChoice } from './towerBranchChoices';

const ARCHER = 'undead_bone_archer_tower';
const ARCHER_BRANCH = 'undead_bone_archer_tower_volley';

function createStateWithPick() {
  const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
  return recordTowerBranchChoice(state, 'player', ARCHER, ARCHER_BRANCH);
}

describe('entities/duel-match/towerBranchChoices', () => {
  it('opens a match with no branch chosen on either side', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    expect(state.player.towerBranchChoices).toEqual({});
    expect(state.opponent.towerBranchChoices).toEqual({});
  });

  it('records a pick for one side only', () => {
    const state = createStateWithPick();

    expect(state.player.towerBranchChoices).toEqual({ [ARCHER]: ARCHER_BRANCH });
    expect(state.opponent.towerBranchChoices).toEqual({});
  });

  it('keeps picks across round start, settle and the send queue reset', () => {
    const started = startRound(createStateWithPick()).state;
    const settled = settleRound(clearSendQueue(started), 1, 1).state;

    expect(settled.player.towerBranchChoices).toEqual({ [ARCHER]: ARCHER_BRANCH });
  });

  it('forgets picks when the match state is created anew on restart', () => {
    createStateWithPick();
    const restarted = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    expect(restarted.player.towerBranchChoices).toEqual({});
  });
});
