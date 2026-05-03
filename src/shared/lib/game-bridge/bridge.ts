import type { GameCommandMap, GameHudSnapshot } from './types';

type CommandName = keyof GameCommandMap;
type CommandHandler<T extends CommandName> = (payload: GameCommandMap[T]) => void;
type Unsubscribe = () => void;

const SNAPSHOT_EVENT = 'game-bridge:snapshot';

const commandHandlers = new Map<CommandName, Set<CommandHandler<CommandName>>>();
const snapshotEventTarget = new EventTarget();

let snapshot: GameHudSnapshot = {
  gold: 0,
  lives: 0,
  waveNumber: 1,
  phase: 'build',
  canStartWave: false,
  selectedTowerType: null,
  autoStartSecondsLeft: null,
};

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
  const handlers = commandHandlers.get(command);
  if (!handlers) {
    return;
  }

  handlers.forEach((handler) => {
    (handler as CommandHandler<T>)(payload);
  });
}
