import type Phaser from 'phaser';
import type { CreepEntity } from '../../../../entities/creep';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import type { GameSoundRouter } from '../audio/gameSoundRouting';
import type { FloatingLabelPool } from '../labels/floatingLabelPool';
import type { TowerRenderState } from '../../scenes/gameScene.types';
import type { CellCenterWriter } from './towerCombatTypes';

export type CombatRuntimeConfig = {
  archerProjectileVisualMode: 'projectile' | 'attackEffect';
  creepBaseColor: number;
  creepHitFlashColor: number;
  creepHitFlashDurationMs: number;
  creepDeathFadeDurationMs: number;
  /** How long the death row is given before the sprite is destroyed. */
  creepDeathAnimationDurationMs: number;
  projectileMinLifetimeMs: number;
  projectileMaxLifetimeMs: number;
  projectileDisplaySizePx: number;
  projectileRenderDepth: number;
  impactEffectLifetimeMs: number;
  impactEffectRenderDepth: number;
  damageNumbersEnabled: boolean;
  damageNumberLifetimeMs: number;
  damageNumberRisePx: number;
  damageNumberHitColor: string;
  damageNumberEffectColor: string;
  effectMaxSimulationDeltaMs: number;
};

export type CombatRuntimeDependencies = {
  scene: Phaser.Scene;
  /** Pixel centre of a cell, written into `out` (no allocation). */
  writeCellCenter: CellCenterWriter;
  /** Pre-created damage number labels shared by both fields. */
  floatingLabels: FloatingLabelPool;
  playArcherAttackAnimation: (tower: TowerRenderState) => void;
  playSplashAttackAnimation: (tower: TowerRenderState) => void;
  /** Fixed cues (economy, status effects); tower and creature sounds go through `soundRouter`. */
  playSound: (soundId: SoundId) => void;
  /** Resolves tower and creature sounds through the race sound profiles. */
  soundRouter: GameSoundRouter;
  /**
   * Pays the kill bounty to the side that owns this battlefield. Both sides
   * wire it to the shared duel-match bounty rule. `bonusGold` is the killing
   * tower's aura kill bonus (`goldPerKill`); 0 or absent for most kills.
   */
  awardKillBounty: (bonusGold?: number) => void;
  /**
   * Notes the kill for the round settle (a sent creep's death earns its sender
   * creature experience). Absent where nothing settles a duel round.
   */
  recordCreepDeath?: (creep: CreepEntity) => void;
  /**
   * Charges the side that owns this battlefield a creature's kill penalty
   * (`killGoldPenaltyToDefender`), never below 0 gold. Called only when the
   * killed creature carries one.
   */
  chargeKillPenalty?: (penaltyGold: number) => void;
  onHudChanged: () => void;
};
