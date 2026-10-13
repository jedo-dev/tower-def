import type { TowerTypeId } from '../../../types/content-ids';
import type Phaser from 'phaser';
import type { CreepEntity, CreepSenderSide } from '../../../../entities/creep';
import type { UnitConfig } from '../../../../entities/unit';
import type { TowerCombatRuntime, TowerEntity } from '../../../../entities/tower';

export type CreepRenderState = {
  entity: CreepEntity;
  sprite: Phaser.GameObjects.Sprite;
  hitFlashRemainingMs: number;
  deathFadeRemainingMs: number;
  /** Faction tint to restore after a hit flash; white when untinted. */
  baseTint?: number;
  /** Status pips shown while several effects run at once. */
  effectPips?: Phaser.GameObjects.Text;
  /** Effect set the sprite currently reflects, so repaints stay change-driven. */
  effectVisualSignature?: string;
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
};

export type ProjectileState = {
  sprite: Phaser.GameObjects.Sprite;
  /** Archetype that fired the shot, so the impact matches the projectile. */
  towerType: TowerTypeId;
  effectSpriteKey: string;
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

export type HudWaveQueueItem = {
  type: 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
  index: number;
};
