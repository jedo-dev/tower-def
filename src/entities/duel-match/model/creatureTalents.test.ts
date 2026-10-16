import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { resolveUnitConfigById } from '../../unit/model/registry';
import { UnitTier } from '../../unit/model/types';
import {
  recordCreatureBranchChoice,
  recordCreatureUpgrade,
  resolveNextSendUnit,
  resolveQueuedSendUnits,
} from './creatureTalents';
import { clearSendQueue, sendCreep } from './lifecycle';
import { createInitialDuelMatchState } from './state';

const FIEND = resolveUnitConfigById('undead_crypt_fiend');
const [BRANCH_A] = FIEND.talentBranches;

function stateWithFiendXp(xp: number) {
  const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
  return { ...state, player: { ...state.player, creatureXpByTier: { 2: xp }, gold: 10_000 } };
}

describe('duel creature talents', () => {
  it('starts every side with an empty ledger', () => {
    const { player, opponent } = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    for (const side of [player, opponent]) {
      expect(side.creatureXpByTier).toEqual({});
      expect(side.creatureBranchChoices).toEqual({});
      expect(side.creatureGrades).toEqual({});
      expect(side.sendQueueGrades).toEqual([]);
    }
  });

  it('records a branch and a grade for one side, paying its experience', () => {
    const chosen = recordCreatureBranchChoice(
      stateWithFiendXp(20),
      'player',
      FIEND.id,
      BRANCH_A.id,
    );
    const upgraded = recordCreatureUpgrade(chosen.state, 'player', FIEND.id);

    expect(chosen.check).toEqual({ allowed: true, cost: 8 });
    expect(upgraded.check).toEqual({ allowed: true, cost: 12 });
    expect(upgraded.state.player.creatureXpByTier).toEqual({ 2: 0 });
    expect(upgraded.state.player.creatureBranchChoices).toEqual({ [FIEND.id]: BRANCH_A.id });
    expect(upgraded.state.player.creatureGrades).toEqual({ [FIEND.id]: 1 });
    expect(upgraded.state.opponent).toBe(chosen.state.opponent);
  });

  it('leaves the state untouched on a refusal', () => {
    const state = stateWithFiendXp(0);

    expect(recordCreatureBranchChoice(state, 'player', FIEND.id, BRANCH_A.id)).toEqual({
      state,
      check: { allowed: false, reason: 'not_enough_xp' },
    });
    expect(recordCreatureUpgrade(state, 'player', FIEND.id).state).toBe(state);
  });

  it('snapshots the grade at send time so a later grade applies to later sends only', () => {
    let state = recordCreatureBranchChoice(
      stateWithFiendXp(100),
      'player',
      FIEND.id,
      BRANCH_A.id,
    ).state;
    state = sendCreep(state, true, FIEND.id, UnitTier.TIER_2).state;
    state = recordCreatureUpgrade(state, 'player', FIEND.id).state;
    state = recordCreatureUpgrade(state, 'player', FIEND.id).state;
    state = sendCreep(state, true, FIEND.id, UnitTier.TIER_2).state;

    expect(state.player.sendQueueGrades).toEqual([0, 2]);
    const [first, second] = resolveQueuedSendUnits(state.player);
    expect(first).toBe(FIEND);
    expect(second.health).toBe(BRANCH_A.grades[1].health);
    expect(second.physicalArmor).toBe(BRANCH_A.grades[1].physicalArmor);

    expect(clearSendQueue(state).player.sendQueueGrades).toEqual([]);
  });

  it('resolves the next send at the grade owned now, for send-time rules', () => {
    const owned = { creatureBranchChoices: { [FIEND.id]: BRANCH_A.id }, creatureGrades: {} };

    expect(resolveNextSendUnit(owned, FIEND.id)).toBe(FIEND);
    expect(
      resolveNextSendUnit({ ...owned, creatureGrades: { [FIEND.id]: 3 } }, FIEND.id).health,
    ).toBe(BRANCH_A.grades[2].health);
  });

  it('spawns a send queued without a grade snapshot as the base creature', () => {
    expect(
      resolveQueuedSendUnits({
        sendQueue: [FIEND.id],
        sendQueueGrades: [],
        creatureBranchChoices: { [FIEND.id]: BRANCH_A.id },
      }),
    ).toEqual([FIEND]);
  });
});
