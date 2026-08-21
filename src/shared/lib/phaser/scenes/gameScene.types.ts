import type { TowerTypeId } from '../../../types/content-ids';
import type Phaser from 'phaser';
import type { CreepEntity } from '../../../../entities/creep';
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
};

export type HudWaveQueueItem = {
  type: 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
  index: number;
};
