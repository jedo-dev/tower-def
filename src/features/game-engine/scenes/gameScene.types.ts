import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type Phaser from 'phaser';
import type { CreepEntity, CreepSenderSide } from '../../../entities/creep';
import type { UnitConfig } from '../../../entities/unit';
import type { TowerCombatRuntime, TowerEntity } from '../../../entities/tower';
import type { DuelMatchState } from '../../../entities/duel-match';
import type { WavePhaseState } from '../../wave-phase';
import type { BattlefieldView } from '../../../shared/lib/game-bridge/types';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { BattlefieldRenderState } from '../runtime/battlefield/battlefieldRenderState';
import type { CameraView } from '../runtime/camera/cameraViewMapping';
import type { GridRendererState } from '../runtime/grid/gameSceneGridRenderer';

export type CreepRenderState = {
  entity: CreepEntity;
  sprite: Phaser.GameObjects.Sprite;
  hitFlashRemainingMs: number;
  deathFadeRemainingMs: number;
  /**
   * Pixels from the anchor cell centre to the footprint centre on both axes,
   * so a large creep is drawn over its whole 2x2 footprint. Zero when omitted.
   */
  footprintCenterOffsetPx?: number;
  /** Faction tint to restore after a hit flash; white when untinted. */
  baseTint?: number;
  /**
   * Content id of the unit the creep was spawned from, for the HUD wave strip.
   * Every spawn path sets it; bare test fixtures may leave it out.
   */
  unitId?: string;
  /** Race of the creature, so its hit, death and escape use its race sound profile. */
  race?: RaceId;
  /** Status pips shown while several effects run at once. */
  effectPips?: Phaser.GameObjects.Text;
  /**
   * Numeric signature (`computeEffectSignature`) of the effect set the sprite
   * currently reflects, so repaints stay change-driven.
   */
  effectVisualSignature?: number;
  /** Sheet carries walk rows per direction and a death row. */
  isDirectional?: boolean;
  /** Row currently playing, so a direction change does not restart the walk every frame. */
  facing?: 'down' | 'side' | 'up';
  facingFlipped?: boolean;
  /** Set once the death row started, so it is not restarted while it plays out. */
  isDeathAnimationPlaying?: boolean;
};

export type TowerRenderState = {
  entity: TowerEntity;
  runtime: TowerCombatRuntime;
  sprite: Phaser.GameObjects.Sprite;
  /** The sprite draws the tower's own sheet; absent means borrowed art (tinted, shared shots). */
  hasOwnArt?: boolean;
};

export type ProjectileState = {
  sprite: Phaser.GameObjects.Sprite;
  /** Archetype that fired the shot, so the impact matches the projectile. */
  towerType: TowerTypeId;
  effectSpriteKey: string;
  /** The shot and its impact come from the tower's own sheet, untinted. */
  hasOwnArt: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isSplash: boolean;
  remainingMs: number;
  maxLifetimeMs: number;
};

export type ImpactEffectState = {
  sprite: Phaser.GameObjects.Sprite;
  remainingMs: number;
  maxLifetimeMs: number;
};

export type DamageNumberState = {
  text: Phaser.GameObjects.Text;
  startY: number;
  remainingMs: number;
};

export type PendingWaveSpawn = {
  unit: UnitConfig;
  spawnAtMs: number;
  sequenceIndex: number;
  /** The side that sent this creep; omitted for baseline wave creeps. */
  sender?: CreepSenderSide;
};

/**
 * Read-only view of GameScene's runtime state. It exists for the headless scene
 * test harness (`features/game-engine/test/sceneHarness`): scenario tests observe
 * the live objects instead of reaching into private fields. Nothing in the game
 * reads it.
 */
export type GameSceneInspection = {
  duelMatchState: DuelMatchState;
  playerField: Readonly<BattlefieldRenderState>;
  opponentField: Readonly<BattlefieldRenderState>;
  pendingPlayerSpawns: readonly PendingWaveSpawn[];
  pendingOpponentSpawns: readonly PendingWaveSpawn[];
  wavePhaseState: WavePhaseState;
  /** Waves started so far (the wave being fought); the HUD derives its own. */
  waveNumber: number;
  playerGold: number;
  isGameOver: boolean;
  activeBattlefieldView: BattlefieldView;
  gridModel: GridModel | null;
  /** Terrain tiles and overlays as drawn for the field in view. */
  gridRenderer: Readonly<GridRendererState>;
  /** The view the board is rendered with and pointers are mapped through. */
  cameraView: CameraView;
  /** Zoom relative to the fit zoom (1 = whole board). */
  cameraZoomFactor: number;
  /** Block armed by a first touch tap, awaiting its confirming tap. */
  pendingPlacementAnchor: GridPosition | null;
};
