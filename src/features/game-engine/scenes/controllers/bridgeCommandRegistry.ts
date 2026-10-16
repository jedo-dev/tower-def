import { onGameCommand, onGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { GameCommandMap } from '../../../../shared/lib/game-bridge/types';
import {
  handleSellTowerCommand,
  handleUpgradeTowerCommand,
} from '../../runtime/build/gameSceneTowerCommands';
import { handleChooseTowerBranchCommand } from '../../runtime/build/towerBranchCommands';
import {
  handleChooseCreatureBranchCommand,
  handleUpgradeCreatureCommand,
} from '../../runtime/duel/creatureTalentCommands';
import { handleSendCreepCommand } from '../../runtime/duel/gameSceneSendCommand';
import { publishPlayerSendLimits } from '../../runtime/duel/gameSceneSendLimits';
import { isGameSpeed } from '../../runtime/time/gameClock';
import type { HudFactionType } from '../../../../shared/lib/game-bridge/types';
import type { TowerTypeId } from '../../../../shared/types/content-ids';
import { handleBattlefieldViewChanged } from './battlefieldViewController';
import {
  clearEngineErrorAndResume,
  runGuarded,
  setGameSpeed,
  setPaused,
} from './engineClockController';
import type { GameSceneContext } from './gameSceneContext';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { handleZoomBoardCommand } from './inputWiring';
import { createMatchDuelState, resetRunToInitialState } from './matchSetup';
import { canPerformBuildActions, type GameSceneCore } from './sceneQueries';

function selectTower({ scene, state }: GameSceneCore, towerType: TowerTypeId | null): void {
  state.selectedTowerType = towerType;
  scene.registry.set('ui.selectedTowerType', state.selectedTowerType ?? 'none');
  publishHudSnapshot(state);
}

function selectFaction({ scene, state }: GameSceneCore, faction: HudFactionType): void {
  state.selectedFaction = faction;
  if (canPerformBuildActions(state)) {
    state.duelMatchState = createMatchDuelState(state);
    scene.registry.set('economy.lives', state.duelMatchState.player.hp);
    publishPlayerSendLimits(state.duelMatchState, state.selectedBuilderFactionId);
  }
  scene.registry.set('wave.selectedFaction', state.selectedFaction);
  publishHudSnapshot(state);
}

/**
 * Subscribes the scene to every typed bridge command. Each handler runs
 * behind the command error guard; the teardowns are released on shutdown.
 */
export function registerBridgeCommandHandlers(context: GameSceneContext): void {
  const onCommand = <Name extends keyof GameCommandMap>(
    command: Name,
    handler: (payload: GameCommandMap[Name]) => void,
  ): (() => void) =>
    onGameCommand(command, (payload) => {
      runGuarded(context, 'command', () => handler(payload));
    });

  context.state.teardownCallbacks.push(
    onCommand('start-wave', () => context.hooks.handleStartWaveCommand()),
    onCommand('set-paused', (payload) => setPaused(context, payload.isPaused)),
    onCommand('set-game-speed', (payload) => {
      if (isGameSpeed(payload.speed)) {
        setGameSpeed(context, payload.speed);
      }
    }),
    // The page leaves on this command; freeze the field until it is torn down.
    onCommand('quit-match', () => setPaused(context, true)),
    onCommand('select-tower', (payload) => selectTower(context, payload.towerType)),
    onCommand('select-faction', (payload) => selectFaction(context, payload.faction)),
    onCommand('send-creep', (payload) =>
      handleSendCreepCommand(context.sendCreepCommandDeps, payload.creepTypeId),
    ),
    onCommand('upgrade-tower', (payload) =>
      handleUpgradeTowerCommand(context.towerCommandDeps, payload.towerId),
    ),
    onCommand('choose-tower-branch', (payload) =>
      handleChooseTowerBranchCommand(context.towerCommandDeps, payload.towerId, payload.branchId),
    ),
    onCommand('choose-creature-branch', (payload) =>
      handleChooseCreatureBranchCommand(
        context.creatureTalentCommandDeps,
        payload.unitId,
        payload.branchId,
      ),
    ),
    onCommand('upgrade-creature', (payload) =>
      handleUpgradeCreatureCommand(context.creatureTalentCommandDeps, payload.unitId),
    ),
    onCommand('sell-tower', (payload) =>
      handleSellTowerCommand(context.towerCommandDeps, payload.towerId),
    ),
    onCommand('zoom-board', (payload) => handleZoomBoardCommand(context, payload.action)),
    onCommand('restart-match', () => {
      // A restart is also the recover action after an engine error.
      clearEngineErrorAndResume(context);
      resetRunToInitialState(context);
    }),
    onGameEvent('battlefield-view-changed', (payload) =>
      handleBattlefieldViewChanged(context, payload),
    ),
  );
}
