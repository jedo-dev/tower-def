import type Phaser from 'phaser';
import {
  scaleCreepStats,
  scaleReward,
  type Difficulty,
} from '../../../../entities/difficulty';
import type { DuelMatchState } from '../../../../entities/duel-match';
import type { UnitConfig } from '../../../../entities/unit';
import type { SoundId } from '../sound/audio.types';
import type { GameAudioManager } from '../sound/GameAudioManager';
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
import { mapUnitToCreepType, toCellCenter } from './gameScene.helpers';
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
  getDuelMatchState: () => DuelMatchState;
  setDuelMatchState: (state: DuelMatchState) => void;
  getSelectedFactionUnits: () => UnitConfig[];
  getComputerSendWaveUnits: () => UnitConfig[];
  getSelectedDifficulty: () => Difficulty;
  refreshBuildState: () => void;
  publishHudSnapshot: () => void;
  handleGameOverUpdated: (isGameOver: boolean) => void;
  syncOpponentDuelCreepsFromField: () => void;
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
    playSound: (soundId: SoundId) => {
      if (soundId === 'combat.tower_attack.archer' || soundId === 'combat.tower_attack.splash') {
        host.getSoundManager()?.playFactionVariant(soundId);
        return;
      }
      host.getSoundManager()?.play(soundId);
    },
    getResources: () => ({
      gold: host.runState.playerGold,
      lives: host.runState.playerLives,
    }),
    // Difficulty tilts the player's economy only; the opponent deps below
    // deliberately keep the unscaled rewards.
    scaleReward: (baseReward) => scaleReward(baseReward, host.getSelectedDifficulty()),
    onGoldUpdated: (nextGold) => updatePlayerGold(host, nextGold),
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
    getResources: () => ({
      gold: host.getDuelMatchState().opponent.gold,
      lives: host.getDuelMatchState().opponent.hp,
    }),
    onGoldUpdated: (nextGold) => {
      const duelMatchState = host.getDuelMatchState();
      host.setDuelMatchState({
        ...duelMatchState,
        opponent: {
          ...duelMatchState.opponent,
          gold: nextGold,
        },
      });
    },
    onHudChanged: () => host.publishHudSnapshot(),
  };
}

function createWaveRuntimeDeps(host: GameSceneWiringHost): WaveRuntimeDependencies {
  return {
    nowMs: () => host.scene.time.now,
    getSelectedFactionUnits: () => host.getSelectedFactionUnits(),
    getAdditionalWaveUnits: () => host.getComputerSendWaveUnits(),
    getSpriteKeyByUnit: (unit) => getSpriteKeyByUnit(unit),
    getAnimationKeyByUnit: (unit) => getAnimationKeyByUnit(unit),
    getCreepTypeFromUnit: (unit) => mapUnitToCreepType(unit),
    getCreepTintByUnit: (unit) => getCreepTintByUnit(unit),
    scaleReward: (baseReward) => scaleReward(baseReward, host.getSelectedDifficulty()),
    scaleCreepStats: (stats) => scaleCreepStats(stats, host.getSelectedDifficulty()),
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
    nowMs: () => host.scene.time.now,
    toCellCenter: (position) => toCellCenter(position),
    onLivesUpdated: (lives) => {
      host.runState.playerLives = lives;
      host.scene.registry.set('economy.lives', host.getDuelMatchState().player.hp);
    },
    onGameOverUpdated: (isGameOver) => host.handleGameOverUpdated(isGameOver),
    shouldEndRunOnLivesDepleted: () => false,
    onWavePhaseUpdated: (nextWavePhase) => {
      host.runState.wavePhaseState = nextWavePhase;
    },
    onEscapedCountUpdated: (escapedCount) => {
      host.scene.registry.set('wave.escapedCreeps', escapedCount);
    },
    onBuildStateNeedsRefresh: () => host.refreshBuildState(),
    onHudChanged: () => host.publishHudSnapshot(),
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
  };
}

function createOpponentMovementDeps(host: GameSceneWiringHost): MovementRuntimeDeps {
  return {
    nowMs: () => host.scene.time.now,
    toCellCenter: (position) => toCellCenter(position),
    onLivesUpdated: () => undefined,
    onGameOverUpdated: () => undefined,
    shouldEndRunOnLivesDepleted: () => false,
    onWavePhaseUpdated: () => undefined,
    onEscapedCountUpdated: (escapedCount) => {
      host.scene.registry.set('duel.opponent.escapedCreeps', escapedCount);
    },
    onBuildStateNeedsRefresh: () => undefined,
    onHudChanged: () => host.publishHudSnapshot(),
    playSound: (soundId: SoundId) => host.getSoundManager()?.play(soundId),
  };
}

function createDuelMatchRuntimeDeps(host: GameSceneWiringHost): DuelMatchRuntimeDeps {
  return {
    onDuelMatchStateUpdated: (state) => {
      host.setDuelMatchState(state);
      host.runState.playerLives = state.player.hp;
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
        activeCreepPath: host.getDuelMatchState().opponent.battlefield.path,
        playerGold: host.getDuelMatchState().opponent.gold,
        playerLives: host.getDuelMatchState().opponent.hp,
        isGameOver: host.runState.isGameOver,
        restartScheduledAtMs: host.runState.restartScheduledAtMs,
        wavePhaseState: host.runState.wavePhaseState,
      }),
      afterFieldMutated: () => host.syncOpponentDuelCreepsFromField(),
    },
  };
}
