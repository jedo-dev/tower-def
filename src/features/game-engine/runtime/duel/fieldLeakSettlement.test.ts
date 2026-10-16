import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from '../../../../entities/creep';
import type { CreatureAbilities } from '../../../../shared/types/creatureAbilities';
import { summarizeFieldLeaks } from './fieldLeakSettlement';

function creep(
  status: CreepEntity['status'],
  sender?: CreepEntity['sender'],
  abilities?: CreatureAbilities,
): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: `creep:${status}`,
    type: 'basic',
    hp: 1,
    lifeState: status === 'dead' ? 'dead' : 'alive',
    speed: 1,
    status,
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...(sender === undefined ? {} : { sender }),
    ...(abilities === undefined ? {} : { abilities }),
  };
}

describe('summarizeFieldLeaks', () => {
  it('weights lives per leak and pays each sender for its creeps on the other field', () => {
    const playerField = [
      creep('escaped'),
      creep('escaped', 'opponent', { leakLivesTaken: 2, leakGoldToSender: 3 }),
      creep('dead', 'opponent', { leakGoldToSender: 9 }),
    ];
    const opponentField = [creep('escaped', 'player', { leakGoldToSender: 5 })];

    expect(summarizeFieldLeaks(playerField, opponentField)).toEqual({
      playerLeakedLives: 3,
      opponentLeakedLives: 1,
      sentLeaks: { onPlayerField: 2, onOpponentField: 1 },
      leakGoldToPlayer: 5,
      leakGoldToOpponent: 3,
    });
  });

  it('counts plain leaks one life each with no gold', () => {
    expect(summarizeFieldLeaks([creep('escaped', 'opponent')], [creep('escaped')])).toEqual({
      playerLeakedLives: 1,
      opponentLeakedLives: 1,
      sentLeaks: { onPlayerField: 1, onOpponentField: 0 },
      leakGoldToPlayer: 0,
      leakGoldToOpponent: 0,
    });
  });
});
