import type Phaser from 'phaser';
import type { GameSoundRouter } from '../../runtime/audio/gameSoundRouting';
import type { TowerCommandDeps } from '../../runtime/build/gameSceneTowerCommands';
import type { CreatureTalentCommandDeps } from '../../runtime/duel/creatureTalentCommands';
import type { SendCreepCommandDeps } from '../../runtime/duel/gameSceneSendCommand';
import type { InputControllerDependencies } from '../../runtime/input/gameSceneInputController';
import {
  createGameSceneRuntimeWiring,
  type GameSceneRuntimeWiring,
} from '../gameSceneRuntimeWiring';
import { createGameSceneState, type GameSceneState } from './gameSceneState';
import { createInputControllerDeps } from './inputWiring';
import type { GameSceneCore } from './sceneQueries';
import {
  createCreatureTalentCommandDeps,
  createSendCreepCommandDeps,
  createTowerCommandDeps,
} from './commandDepsFactories';
import { createSceneSoundRouter, createWiringHost } from './runtimeWiringHost';

/**
 * Scene methods the controllers call back into. They stay on GameScene so a
 * test can spy on them there (see GameScene.engineError.test.ts).
 */
export type GameSceneHooks = {
  handleStartWaveCommand: () => void;
};

/**
 * The explicit context every scene controller receives: the scene, its one
 * state record and the long-lived dependency objects of the runtime modules.
 * It holds no behaviour; the dependency objects are closure-based, so one
 * instance stays valid for the entire scene lifetime.
 */
export class GameSceneContext implements GameSceneCore {
  readonly scene: Phaser.Scene;
  readonly state: GameSceneState;
  readonly hooks: GameSceneHooks;
  /** Tower and creature sounds, resolved through the race sound profiles. */
  readonly soundRouter: GameSoundRouter;
  readonly wiring: GameSceneRuntimeWiring;
  readonly inputControllerDeps: InputControllerDependencies;
  readonly towerCommandDeps: TowerCommandDeps;
  readonly sendCreepCommandDeps: SendCreepCommandDeps;
  readonly creatureTalentCommandDeps: CreatureTalentCommandDeps;

  constructor(scene: Phaser.Scene, hooks: GameSceneHooks) {
    this.scene = scene;
    this.hooks = hooks;
    this.state = createGameSceneState();
    this.soundRouter = createSceneSoundRouter(this.state);
    this.wiring = createGameSceneRuntimeWiring(createWiringHost(this));
    this.inputControllerDeps = createInputControllerDeps(this);
    this.towerCommandDeps = createTowerCommandDeps(this);
    this.sendCreepCommandDeps = createSendCreepCommandDeps(this);
    this.creatureTalentCommandDeps = createCreatureTalentCommandDeps(this);
  }
}
