import { afterEach, describe, expect, it } from 'vitest';
import {
  createInitialDuelMatchState,
  getSendCapPerWave,
  type DuelMatchState,
} from '../../../../../entities/duel-match';
import { RaceId } from '../../../../types/content-ids';
import { onGameEvent } from '../../../game-bridge/bridge';
import type { CreepSendLimitsSnapshot } from '../../../game-bridge/types';
import { handleSendCreepCommand, type SendCreepCommandDeps } from './gameSceneSendCommand';
import { buildPlayerSendLimits, resetSendQueuesForWaveStart } from './gameSceneSendLimits';

function createDeps(holder: { state: DuelMatchState }): SendCreepCommandDeps {
  return {
    syncDuelPlayerGoldFromWallet: () => undefined,
    getDuelMatchState: () => holder.state,
    setDuelMatchState: (state) => {
      holder.state = state;
    },
    isMatchOver: () => false,
    canPerformBuildActions: () => true,
    getBuilderFactionId: () => RaceId.UNDEAD,
    onGoldUpdated: () => undefined,
    onHudChanged: () => undefined,
  };
}

const unsubscribers: Array<() => void> = [];

function captureSendLimitEvents(): CreepSendLimitsSnapshot[] {
  const events: CreepSendLimitsSnapshot[] = [];
  unsubscribers.push(onGameEvent('send-limits-updated', (payload) => events.push(payload)));
  return events;
}

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
});

describe('send limits bridge events', () => {
  it('reports full capacity for an empty queue', () => {
    const limits = buildPlayerSendLimits([], RaceId.UNDEAD);

    expect(limits.waveSendCap).toBe(getSendCapPerWave());
    expect(limits.waveSendsRemaining).toBe(getSendCapPerWave());
    expect(limits.units.map((unit) => unit.creepTypeId)).toEqual([
      'undead_skeleton',
      'undead_ghoul',
      'undead_crypt_fiend',
      'undead_gargoyle',
    ]);
    expect(limits.units.every((unit) => unit.remaining === unit.cap)).toBe(true);
  });

  it('publishes the reduced capacity after a successful send', () => {
    const events = captureSendLimitEvents();
    const holder = { state: createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC) };

    handleSendCreepCommand(createDeps(holder), 'undead_skeleton');

    expect(events).toHaveLength(1);
    expect(events[0].owner).toBe('player');
    expect(events[0].waveSendsRemaining).toBe(getSendCapPerWave() - 1);
    const skeleton = events[0].units.find((unit) => unit.creepTypeId === 'undead_skeleton');
    expect(skeleton?.remaining).toBe((skeleton?.cap ?? 0) - 1);
  });

  it('does not publish when a send is rejected', () => {
    const events = captureSendLimitEvents();
    const initial = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const holder = { state: { ...initial, player: { ...initial.player, gold: 0 } } };

    handleSendCreepCommand(createDeps(holder), 'undead_skeleton');

    expect(events).toHaveLength(0);
  });

  it('publishes full capacity again after the wave-start reset', () => {
    const holder = { state: createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC) };
    const deps = createDeps(holder);
    handleSendCreepCommand(deps, 'undead_skeleton');
    handleSendCreepCommand(deps, 'undead_skeleton');
    const events = captureSendLimitEvents();

    const nextState = resetSendQueuesForWaveStart(holder.state, RaceId.UNDEAD);

    expect(nextState.player.sendQueue).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0].waveSendsRemaining).toBe(getSendCapPerWave());
    expect(events[0].units.every((unit) => unit.remaining === unit.cap)).toBe(true);
  });

  it('caps a unit type at its tier limit', () => {
    const skeletonCap =
      buildPlayerSendLimits([], RaceId.UNDEAD).units.find(
        (unit) => unit.creepTypeId === 'undead_skeleton',
      )?.cap ?? 0;
    const fullOfType = Array.from({ length: skeletonCap }, () => 'undead_skeleton' as const);
    const limits = buildPlayerSendLimits(fullOfType, RaceId.UNDEAD);
    const skeleton = limits.units.find((unit) => unit.creepTypeId === 'undead_skeleton');

    expect(skeletonCap).toBeGreaterThan(0);
    expect(skeleton?.remaining).toBe(0);
    expect(limits.waveSendsRemaining).toBe(getSendCapPerWave() - skeletonCap);
  });
});
