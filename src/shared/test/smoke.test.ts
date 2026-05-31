import { describe, expect, it } from 'vitest';
import { RaceId } from '../types/content-ids';
import {
  getActiveBattlefieldView,
  publishGameHudSnapshot,
  sendGameCommand,
} from '../lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../lib/game-bridge/types';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE } from '../../entities/duel-match/model/state';
import { addCreeps, addTower } from '../../entities/duel-match/model/battlefieldOps';
import { sendCreep, startRound } from '../../entities/duel-match/model/lifecycle';
import { UnitTier } from '../../entities/unit/model/types';
import {
  canPlayerInteractWithVisibleBattlefield,
  createVisibleBattlefieldSnapshot,
  type BattlefieldPlayerInteraction,
} from '../../entities/duel-match/model/battlefieldView';
import { mapBattlefieldViewToggleToViewModel } from '../../widgets/hud/model/mapHudSnapshotToViewModel';

function createHudSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 100,
    lives: 20,
    builderFactionName: 'Undead',
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: null,
    waveQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

function createDefenseTower() {
  return {
    id: 'computer:tower:4:6',
    position: { x: 4, y: 6 },
    cost: 50,
    type: 'archer' as const,
    level: 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

describe('test setup', () => {
  it('runs vitest in this project', () => {
    expect(true).toBe(true);
  });

  it('covers opponent view flow from send to read-only view switching', () => {
    publishGameHudSnapshot(createHudSnapshot({ phase: 'build' }));
    const buildToggle = mapBattlefieldViewToggleToViewModel(
      createHudSnapshot({ phase: 'build' }),
      getActiveBattlefieldView(),
    );

    expect(buildToggle.isVisible).toBe(false);
    sendGameCommand('switch-battlefield-view', { view: 'opponent' });
    expect(getActiveBattlefieldView()).toBe('player');

    const initialState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const battleState = startRound(initialState).state;
    const sendResult = sendCreep(battleState, true, 'undead_skeleton', UnitTier.TIER_1);
    expect(sendResult.sent).toBe(true);

    const opponentWithDefense = addTower(
      sendResult.state.opponent.battlefield,
      createDefenseTower(),
    );
    const opponentWithIncomingSend = addCreeps(opponentWithDefense, [
      {
        id: 'player_send_1',
        typeId: 'basic',
        hp: 100,
        speed: 1,
        entrance: DEFAULT_ENTRANCE,
      },
    ]);
    const playerWithComputerSend = addCreeps(sendResult.state.player.battlefield, [
      {
        id: 'computer_send_1',
        typeId: 'basic',
        hp: 100,
        speed: 1,
        entrance: DEFAULT_ENTRANCE,
      },
    ]);
    const stateWithBothSimulations = {
      ...sendResult.state,
      player: {
        ...sendResult.state.player,
        battlefield: playerWithComputerSend,
      },
      opponent: {
        ...sendResult.state.opponent,
        battlefield: opponentWithIncomingSend,
      },
    };

    publishGameHudSnapshot(createHudSnapshot({ phase: 'wave', canStartWave: false }));
    const battleToggle = mapBattlefieldViewToggleToViewModel(
      createHudSnapshot({ phase: 'wave', canStartWave: false }),
      getActiveBattlefieldView(),
    );
    expect(battleToggle.isVisible).toBe(true);

    sendGameCommand('switch-battlefield-view', { view: 'opponent' });
    expect(getActiveBattlefieldView()).toBe('opponent');

    const opponentSnapshot = createVisibleBattlefieldSnapshot(stateWithBothSimulations, 'opponent');
    const interactions: readonly BattlefieldPlayerInteraction[] = ['build', 'upgrade', 'sell', 'select'];
    expect(opponentSnapshot.isReadOnly).toBe(true);
    expect(opponentSnapshot.towers).toHaveLength(1);
    expect(opponentSnapshot.creeps.map((creep) => creep.id)).toEqual(['player_send_1']);
    for (const interaction of interactions) {
      expect(canPlayerInteractWithVisibleBattlefield(opponentSnapshot, interaction)).toBe(false);
    }

    sendGameCommand('switch-battlefield-view', { view: 'player' });
    expect(getActiveBattlefieldView()).toBe('player');

    const playerSnapshot = createVisibleBattlefieldSnapshot(stateWithBothSimulations, 'player');
    expect(playerSnapshot.isReadOnly).toBe(false);
    expect(playerSnapshot.creeps.map((creep) => creep.id)).toEqual(['computer_send_1']);
    expect(createVisibleBattlefieldSnapshot(stateWithBothSimulations, 'opponent').creeps).toHaveLength(1);
  });
});
