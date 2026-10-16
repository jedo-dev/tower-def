import type Phaser from 'phaser';
import type { CreepEntity } from '../../../entities/creep';
import {
  addKillBounty,
  awardKillBounty,
  type DuelMatchState,
  type DuelSide,
} from '../../../entities/duel-match';
import type { UnitConfig } from '../../../entities/unit';
import type { SoundId } from '../../../shared/lib/sound-registry/audio.types';
import type { GameAudioManager } from '../sound/GameAudioManager';
import { SILENT_SOUND_ROUTER, type GameSoundRouter } from '../runtime/audio/gameSoundRouting';
import type { BattlefieldRenderState } from '../runtime/battlefield/battlefieldRenderState';
import {
  getAnimationKeyByUnit,
  getCreepTintByUnit,
  getSpriteKeyByUnit,
  playArcherAttackAnimation,
  playPlagueAttackAnimation,
} from '../runtime/battlefield/battlefieldSpriteFactory';
import type { BattlefieldUpdateContext } from '../runtime/battlefield/battlefieldUpdateRuntime';
import type { CombatRuntimeDependencies } from '../runtime/combat/gameSceneCombatRuntime';
import type { DuelMatchRuntimeDeps } from '../runtime/duel/gameSceneDuelRuntime';
import type {
  MovementRuntimeDeps,
  MovementRuntimeState,
} from '../runtime/movement/gameSceneMovementRuntime';
import type {
  WaveRuntimeDependencies,
  WaveRuntimeState,
} from '../runtime/wave/gameSceneWaveRuntime';
import { mapUnitToCreepType, toCellCenter, writeCellCenter } from './gameScene.helpers';
import { resolveSpriteKey } from '../runtime/assets/spriteKeyResolver';

/**
 * The narrow surface of GameScene that the runtime dependency wiring needs.
 */
export type GameSceneWiringHost = {
  scene: Phaser.Scene;
  runState: WaveRuntimeState;
  playerField: BattlefieldRenderState;
  opponentField: BattlefieldRenderState;
  getSoundManager: () => GameAudioManager | null;
  /** Tower and creature sounds for the player's battlefield. */
  soundRouter: GameSoundRouter;
  getDuelMatchState: () => DuelMatchState;
  setDuelMatchState: (state: DuelMatchState) => void;
  getComputerSendWaveUnits: () => UnitConfig[];
  /** Simulation time (paused and sped up with the match), not Phaser's clock. */
  gameNowMs: () => number;
  refreshBuildState: () => void;
  publishHudSnapshot: () => void;
  handleGameOverUpdated: (isGameOver: boolean) => void;
  syncOpponentDuelCreepsFromField: () => void;
  /** A creep died on `field`; the round settle credits sent creeps' experience. */
  recordSentCreepDeath: (field: DuelSide, creep: CreepEntity) => void;
};

export type GameSceneRuntimeWiring = {
  waveRuntimeDeps: WaveRuntimeDependencies;
  duelMatchRuntimeDeps: DuelMatchRuntimeDeps;
  playerBattlefieldContext: BattlefieldUpdateContext;
  opponentBattlefieldContext: BattlefieldUpdateContext;
};

function updatePlayerGold(host: GameSceneWiringHost, nextGold: number): void {
  host.runState.playerGold = nextGold;
  host.scene.registry.set('economy.gold', nextGold);
}

function createPlayerCombatDeps(host: GameSceneWiringHost): CombatRuntimeDependencies {
  return {
    scene: host.scene,
    toCellCenter: (position) => toCellCenter(position),
    playArcherAttackAnimation: (tower) => playArcherAttackAnimation(tower),
    playSplashAttackAnimation: (tower) => playPlagueAttackAnimation(host.scene, tower),
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
    soundRouter: host.soundRouter,
    // The player's purse lives in the scene wallet; the same bounty rule applies.
    awardKillBounty: (bonusGold) => {
      const goldBefore = host.runState.playerGold;
      const goldAfter = addKillBounty(goldBefore, bonusGold);
      host.runState.waveKillBountyEarned += goldAfter - goldBefore;
      updatePlayerGold(host, goldAfter);
    },
    recordCreepDeath: (creep) => host.recordSentCreepDeath('player', creep),
    onHudChanged: () => host.publishHudSnapshot(),
  };
}

function createOpponentCombatDeps(host: GameSceneWiringHost): CombatRuntimeDependencies {
  return {
    scene: host.scene,
    toCellCenter: (position) => toCellCenter(position),
    playArcherAttackAnimation: (tower) => playArcherAttackAnimation(tower),
    playSplashAttackAnimation: (tower) => playPlagueAttackAnimation(host.scene, tower),
    playSound: () => undefined,
    soundRouter: SILENT_SOUND_ROUTER,
    // Kills on the computer's own battlefield pay the computer.
    awardKillBounty: (bonusGold) =>
      host.setDuelMatchState(awardKillBounty(host.getDuelMatchState(), 'opponent', bonusGold)),
    recordCreepDeath: (creep) => host.recordSentCreepDeath('opponent', creep),
    onHudChanged: () => host.publishHudSnapshot(),
  };
}

function createWaveRuntimeDeps(host: GameSceneWiringHost): WaveRuntimeDependencies {
  return {
    nowMs: () => host.gameNowMs(),
    getAdditionalWaveUnits: () => host.getComputerSendWaveUnits(),
    getSpriteKeyByUnit: (unit) => getSpriteKeyByUnit(unit),
    getAnimationKeyByUnit: (unit) => getAnimationKeyByUnit(unit),
    getCreepTypeFromUnit: (unit) => mapUnitToCreepType(unit),
    getCreepTintByUnit: (unit) => getCreepTintByUnit(unit),
    toCellCenter: (position) => toCellCenter(position),
    onGoldUpdated: (nextGold) => updatePlayerGold(host, nextGold),
    onWavePhaseChanged: (nextPhase) => {
      host.runState.wavePhaseState = nextPhase;
    },
    onBuildStateUpdated: () => host.refreshBuildState(),
    onHudChanged: () => host.publishHudSnapshot(),
    createCreepSprite: (x, y, spriteKey) => {
      const resolved = resolveSpriteKey(host.scene.textures, 'unit', spriteKey);
      return host.scene.add.sprite(x, y, resolved.spriteKey, 0);
    },
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
  };
}

function createPlayerMovementDeps(host: GameSceneWiringHost): MovementRuntimeDeps {
  return {
    writeCellCenter,
    onEscapedCountUpdated: (escapedCount) => {
      host.scene.registry.set('wave.escapedCreeps', escapedCount);
    },
    onHudChanged: () => host.publishHudSnapshot(),
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
    soundRouter: host.soundRouter,
  };
}

function createOpponentMovementDeps(host: GameSceneWiringHost): MovementRuntimeDeps {
  return {
    writeCellCenter,
    onEscapedCountUpdated: (escapedCount) => {
      host.scene.registry.set('duel.opponent.escapedCreeps', escapedCount);
    },
    onHudChanged: () => host.publishHudSnapshot(),
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
    soundRouter: host.soundRouter,
  };
}

function createDuelMatchRuntimeDeps(host: GameSceneWiringHost): DuelMatchRuntimeDeps {
  return {
    onDuelMatchStateUpdated: (state) => {
      host.setDuelMatchState(state);
      // The duel state's HP is the one life counter for HUD, registry and game over.
      host.scene.registry.set('economy.lives', state.player.hp);
      host.scene.registry.set('duel.opponent.hp', state.opponent.hp);
    },
    onGameOverUpdated: (isGameOver) => host.handleGameOverUpdated(isGameOver),
    onWavePhaseUpdated: (nextWavePhase) => {
      host.runState.wavePhaseState = nextWavePhase;
    },
    onBuildStateNeedsRefresh: () => host.refreshBuildState(),
    playGameOverSound: () => host.getSoundManager()?.play('ui.game_over'),
  };
}

/**
 * Builds the long-lived runtime dependency objects for the scene. Everything
 * is closure-based, so a single wiring instance stays valid for the entire
 * scene lifetime.
 */
export function createGameSceneRuntimeWiring(host: GameSceneWiringHost): GameSceneRuntimeWiring {
  return {
    waveRuntimeDeps: createWaveRuntimeDeps(host),
    duelMatchRuntimeDeps: createDuelMatchRuntimeDeps(host),
    playerBattlefieldContext: {
      field: host.playerField,
      combatDeps: createPlayerCombatDeps(host),
      movementDeps: createPlayerMovementDeps(host),
      getMovementState: () => host.runState,
      afterFieldMutated: () => undefined,
    },
    opponentBattlefieldContext: {
      field: host.opponentField,
      combatDeps: createOpponentCombatDeps(host),
      movementDeps: createOpponentMovementDeps(host),
      getMovementState: (): MovementRuntimeState => ({
        activeCreeps: host.opponentField.creeps,
        activeCreepRoutes: host.getDuelMatchState().opponent.battlefield.routes,
      }),
      afterFieldMutated: () => host.syncOpponentDuelCreepsFromField(),
    },
  };
}
