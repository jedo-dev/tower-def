import { describe, expect, it, vi } from 'vitest';
import {
  getActiveBattlefieldView,
  onGameCommand,
  onGameEvent,
  publishGameEvent,
  publishGameHudSnapshot,
  sendGameCommand,
} from './bridge';
import type { BattlefieldView, GameHudSnapshot, SelectedTowerSnapshot } from './types';

function createTestTowerSnapshot(overrides?: Partial<SelectedTowerSnapshot>): SelectedTowerSnapshot {
  return {
    id: 'tower:5:3',
    type: 'archer',
    level: 1,
    position: { x: 5, y: 3 },
    cost: 50,
    combatStats: {
      damage: 20,
      range: 3,
      attackCooldownMs: 800,
    },
    ...overrides,
  };
}

function createTestHudSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 100,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: {
      status: 'active',
      winner: null,
    },
    builderFactionName: 'Undead',
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
    waveQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    ...overrides,
  };
}

describe('game bridge event system', () => {
  it('delivers selected-tower event to subscriber', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ tower });

    unsubscribe();
  });

  it('delivers null tower in selected-tower event for deselection', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    publishGameEvent('selected-tower', { tower: null });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ tower: null });

    unsubscribe();
  });

  it('stops delivering events after unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    unsubscribe();

    publishGameEvent('selected-tower', { tower: createTestTowerSnapshot() });

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsubscribe1 = onGameEvent('selected-tower', handler1);
    const unsubscribe2 = onGameEvent('selected-tower', handler2);

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();

    unsubscribe1();
    unsubscribe2();
  });

  it('unsubscribing one subscriber does not affect another', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsubscribe1 = onGameEvent('selected-tower', handler1);
    const unsubscribe2 = onGameEvent('selected-tower', handler2);

    unsubscribe1();

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledOnce();

    unsubscribe2();
  });

  it('selected-tower event carries correct tower snapshot data', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    const tower = createTestTowerSnapshot({
      id: 'tower:2:7',
      type: 'splash',
      level: 3,
      position: { x: 2, y: 7 },
      cost: 75,
      combatStats: {
        damage: 38,
        range: 2.9,
        attackCooldownMs: 1100,
        splashRadius: 1.5,
      },
    });

    publishGameEvent('selected-tower', { tower });

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as { tower: SelectedTowerSnapshot };
    expect(payload.tower.id).toBe('tower:2:7');
    expect(payload.tower.type).toBe('splash');
    expect(payload.tower.level).toBe(3);
    expect(payload.tower.position).toEqual({ x: 2, y: 7 });
    expect(payload.tower.cost).toBe(75);
    expect(payload.tower.combatStats.damage).toBe(38);
    expect(payload.tower.combatStats.splashRadius).toBe(1.5);

    unsubscribe();
  });

  it('allows switching to opponent battlefield during battle phase', () => {
    publishGameHudSnapshot(createTestHudSnapshot({ phase: 'wave' }));
    const handler = vi.fn();
    const unsubscribe = onGameEvent('battlefield-view-changed', handler);

    sendGameCommand('switch-battlefield-view', { view: 'opponent' });

    expect(getActiveBattlefieldView()).toBe<BattlefieldView>('opponent');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      activeView: 'opponent',
      requestedView: 'opponent',
      accepted: true,
    });

    unsubscribe();
    sendGameCommand('switch-battlefield-view', { view: 'player' });
  });

  it('rejects opponent battlefield switching during build phase', () => {
    publishGameHudSnapshot(createTestHudSnapshot({ phase: 'build' }));
    const handler = vi.fn();
    const unsubscribe = onGameEvent('battlefield-view-changed', handler);

    sendGameCommand('switch-battlefield-view', { view: 'opponent' });

    expect(getActiveBattlefieldView()).toBe<BattlefieldView>('player');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      activeView: 'player',
      requestedView: 'opponent',
      accepted: false,
      reason: 'not_battle_phase',
    });

    unsubscribe();
  });

  it('publishes active view events when switching back to player battlefield', () => {
    publishGameHudSnapshot(createTestHudSnapshot({ phase: 'wave' }));
    sendGameCommand('switch-battlefield-view', { view: 'opponent' });
    const handler = vi.fn();
    const unsubscribe = onGameEvent('battlefield-view-changed', handler);

    sendGameCommand('switch-battlefield-view', { view: 'player' });

    expect(getActiveBattlefieldView()).toBe<BattlefieldView>('player');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      activeView: 'player',
      requestedView: 'player',
      accepted: true,
    });

    unsubscribe();
  });

  it('switch command is delivered through the typed bridge without a scene instance', () => {
    publishGameHudSnapshot(createTestHudSnapshot({ phase: 'wave' }));
    const commandHandler = vi.fn();
    const eventHandler = vi.fn();
    const unsubscribeCommand = onGameCommand('switch-battlefield-view', commandHandler);
    const unsubscribeEvent = onGameEvent('battlefield-view-changed', eventHandler);

    sendGameCommand('switch-battlefield-view', { view: 'opponent' });

    expect(commandHandler).toHaveBeenCalledWith({ view: 'opponent' });
    expect(eventHandler).toHaveBeenCalledWith({
      activeView: 'opponent',
      requestedView: 'opponent',
      accepted: true,
    });

    unsubscribeCommand();
    unsubscribeEvent();
    sendGameCommand('switch-battlefield-view', { view: 'player' });
  });

  it('keeps widgets and pages behind the typed bridge instead of direct scene calls', () => {
    const sources = import.meta.glob('../../../{widgets,pages}/**/*.{ts,tsx}', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    const forbiddenPatterns = [
      /GameScene/,
      /shared[\\/]lib[\\/]phaser[\\/]scenes/,
      /\.scene\.(get|start|stop|pause|resume|restart)/,
    ];

    const offenders = Object.entries(sources)
      .filter(([, source]) => forbiddenPatterns.some((pattern) => pattern.test(source)))
      .map(([filePath]) => filePath);

    expect(offenders).toEqual([]);
  });
});
