import type { BattlefieldView, GameCommandMap, GameEventMap, GameHudSnapshot } from './types';
import type { GameSetupConfig } from '../../config/game-setup';

type CommandName = keyof GameCommandMap;
type CommandHandler<T extends CommandName> = (payload: GameCommandMap[T]) => void;
type EventName = keyof GameEventMap;
type EventHandler<T extends EventName> = (payload: GameEventMap[T]) => void;
type Unsubscribe = () => void;

const SNAPSHOT_EVENT = 'game-bridge:snapshot';

const commandHandlers = new Map<CommandName, Set<CommandHandler<CommandName>>>();
const eventHandlers = new Map<EventName, Set<EventHandler<EventName>>>();
const snapshotEventTarget = new EventTarget();

let gameSetupConfig: GameSetupConfig | null = null;

export function getGameSetupConfig(): GameSetupConfig | null {
  return gameSetupConfig;
}

export function setGameSetupConfig(config: GameSetupConfig): void {
  gameSetupConfig = config;
}

export function clearGameSetupConfig(): void {
  gameSetupConfig = null;
}

let snapshot: GameHudSnapshot = {
  gold: 0,
  lives: 0,
  opponentGold: 0,
  opponentIncome: 0,
  opponentLives: 0,
  matchOutcome: {
    status: 'active',
    winner: null,
  },
  builderFactionName: 'Undead',
  waveNumber: 1,
  phase: 'build',
  canStartWave: false,
  selectedTowerType: null,
  selectedFaction: 'undead',
  autoStartSecondsLeft: null,
  waveQueue: [],
  opponentSendQueue: [],
  pendingCreepCount: 0,
};

let activeBattlefieldView: BattlefieldView = 'player';

function isBattlefieldViewSwitchAllowed(view: BattlefieldView, phase: GameHudSnapshot['phase']): boolean {
  return view === 'player' || phase === 'wave';
}

function publishBattlefieldViewChanged(
  requestedView: BattlefieldView,
  accepted: boolean,
  reason?: 'not_battle_phase',
): void {
  publishGameEvent('battlefield-view-changed', {
    activeView: activeBattlefieldView,
    requestedView,
    accepted,
    ...(reason ? { reason } : {}),
  });
}

export function getActiveBattlefieldView(): BattlefieldView {
  return activeBattlefieldView;
}

export function requestBattlefieldView(view: BattlefieldView): boolean {
  if (!isBattlefieldViewSwitchAllowed(view, snapshot.phase)) {
    publishBattlefieldViewChanged(view, false, 'not_battle_phase');
    return false;
  }

  activeBattlefieldView = view;
  publishBattlefieldViewChanged(view, true);
  return true;
}

export function getGameHudSnapshot(): GameHudSnapshot {
  return snapshot;
}

export function subscribeGameHudSnapshot(onChange: () => void): Unsubscribe {
  const listener = () => onChange();
  snapshotEventTarget.addEventListener(SNAPSHOT_EVENT, listener);
  return () => snapshotEventTarget.removeEventListener(SNAPSHOT_EVENT, listener);
}

export function publishGameHudSnapshot(nextSnapshot: GameHudSnapshot): void {
  snapshot = nextSnapshot;
  if (snapshot.phase !== 'wave' && activeBattlefieldView !== 'player') {
    activeBattlefieldView = 'player';
    publishBattlefieldViewChanged('player', true);
  }
  snapshotEventTarget.dispatchEvent(new Event(SNAPSHOT_EVENT));
}

export function onGameCommand<T extends CommandName>(
  command: T,
  handler: CommandHandler<T>,
): Unsubscribe {
  const handlers = commandHandlers.get(command) ?? new Set<CommandHandler<CommandName>>();
  handlers.add(handler as CommandHandler<CommandName>);
  commandHandlers.set(command, handlers);

  return () => {
    const currentHandlers = commandHandlers.get(command);
    if (!currentHandlers) {
      return;
    }

    currentHandlers.delete(handler as CommandHandler<CommandName>);
    if (currentHandlers.size === 0) {
      commandHandlers.delete(command);
    }
  };
}

export function sendGameCommand<T extends CommandName>(
  command: T,
  payload: GameCommandMap[T],
): void {
  if (command === 'switch-battlefield-view') {
    requestBattlefieldView((payload as GameCommandMap['switch-battlefield-view']).view);
  }

  const handlers = commandHandlers.get(command);
  if (!handlers) {
    return;
  }

  handlers.forEach((handler) => {
    (handler as CommandHandler<T>)(payload);
  });
}

export function onGameEvent<T extends EventName>(
  event: T,
  handler: EventHandler<T>,
): Unsubscribe {
  const handlers = eventHandlers.get(event) ?? new Set<EventHandler<EventName>>();
  handlers.add(handler as EventHandler<EventName>);
  eventHandlers.set(event, handlers);

  return () => {
    const currentHandlers = eventHandlers.get(event);
    if (!currentHandlers) {
      return;
    }

    currentHandlers.delete(handler as EventHandler<EventName>);
    if (currentHandlers.size === 0) {
      eventHandlers.delete(event);
    }
  };
}

export function publishGameEvent<T extends EventName>(
  event: T,
  payload: GameEventMap[T],
): void {
  const handlers = eventHandlers.get(event);
  if (!handlers) {
    return;
  }

  handlers.forEach((handler) => {
    (handler as EventHandler<T>)(payload);
  });
}
