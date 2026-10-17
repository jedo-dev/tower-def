import type Phaser from 'phaser';
import { destroyCreepRenderState } from '../combat/creepEffectVisuals';
import {
  clearGroundZones,
  createGroundZoneStore,
  type GroundZoneStore,
} from '../combat/towerGroundZones';
import { releaseFloatingLabel } from '../labels/floatingLabelPool';
import type {
  CreepRenderState,
  DamageNumberState,
  ImpactEffectState,
  ProjectileState,
  TowerRenderState,
} from '../../scenes/gameScene.types';

/**
 * Phaser-side render state of a single battlefield (player or opponent).
 * The scene owns two long-lived instances; runtime modules mutate them in place.
 */
export type BattlefieldRenderState = {
  creeps: CreepRenderState[];
  towers: TowerRenderState[];
  projectiles: ProjectileState[];
  impactEffects: ImpactEffectState[];
  damageNumbers: DamageNumberState[];
  /** Ground zones the towers left (tower-def-bge.9); records are reused. */
  groundZones: GroundZoneStore;
  /** One Graphics per field draws its zones; created on the first zone. */
  groundZoneGraphics?: Phaser.GameObjects.Graphics;
};

export function createBattlefieldRenderState(): BattlefieldRenderState {
  return {
    creeps: [],
    towers: [],
    projectiles: [],
    impactEffects: [],
    damageNumbers: [],
    groundZones: createGroundZoneStore(),
  };
}

export function setBattlefieldRenderStateVisible(
  battlefield: BattlefieldRenderState,
  visible: boolean,
): void {
  battlefield.towers.forEach((tower) => tower.sprite.setVisible(visible));
  battlefield.creeps.forEach((creep) => creep.sprite.setVisible(visible));
  battlefield.projectiles.forEach((projectile) => projectile.sprite.setVisible(visible));
  battlefield.impactEffects.forEach((effect) => effect.sprite.setVisible(visible));
  battlefield.damageNumbers.forEach((numberState) => numberState.label.setVisible(visible));
  battlefield.groundZoneGraphics?.setVisible(visible);
}

export function destroyBattlefieldCreeps(battlefield: BattlefieldRenderState): void {
  battlefield.creeps.forEach((creep) => destroyCreepRenderState(creep));
  battlefield.creeps = [];
}

export function destroyBattlefieldTowers(battlefield: BattlefieldRenderState): void {
  battlefield.towers.forEach((tower) => tower.sprite.destroy());
  battlefield.towers = [];
}

export function destroyBattlefieldProjectiles(battlefield: BattlefieldRenderState): void {
  battlefield.projectiles.forEach((projectile) => projectile.sprite.destroy());
  battlefield.projectiles = [];
}

export function destroyBattlefieldImpactEffects(battlefield: BattlefieldRenderState): void {
  battlefield.impactEffects.forEach((effect) => effect.sprite.destroy());
  battlefield.impactEffects = [];
}

/** Hands every live number's label back to its pool. */
export function destroyBattlefieldDamageNumbers(battlefield: BattlefieldRenderState): void {
  battlefield.damageNumbers.forEach((numberState) =>
    releaseFloatingLabel(numberState.labels, numberState.label),
  );
  battlefield.damageNumbers = [];
}

/** Drops every ground zone and wipes their drawing; the Graphics is kept for reuse. */
export function clearBattlefieldGroundZones(battlefield: BattlefieldRenderState): void {
  clearGroundZones(battlefield.groundZones);
  battlefield.groundZoneGraphics?.clear();
}

export function destroyBattlefieldRenderState(battlefield: BattlefieldRenderState): void {
  destroyBattlefieldCreeps(battlefield);
  destroyBattlefieldTowers(battlefield);
  destroyBattlefieldProjectiles(battlefield);
  destroyBattlefieldImpactEffects(battlefield);
  destroyBattlefieldDamageNumbers(battlefield);
  clearGroundZones(battlefield.groundZones);
  battlefield.groundZoneGraphics?.destroy();
  battlefield.groundZoneGraphics = undefined;
}
