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
};

export function createBattlefieldRenderState(): BattlefieldRenderState {
  return {
    creeps: [],
    towers: [],
    projectiles: [],
    impactEffects: [],
    damageNumbers: [],
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
  battlefield.damageNumbers.forEach((numberState) => numberState.text.setVisible(visible));
}

export function destroyBattlefieldCreeps(battlefield: BattlefieldRenderState): void {
  battlefield.creeps.forEach((creep) => creep.sprite.destroy());
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

export function destroyBattlefieldDamageNumbers(battlefield: BattlefieldRenderState): void {
  battlefield.damageNumbers.forEach((numberState) => numberState.text.destroy());
  battlefield.damageNumbers = [];
}

export function destroyBattlefieldRenderState(battlefield: BattlefieldRenderState): void {
  destroyBattlefieldCreeps(battlefield);
  destroyBattlefieldTowers(battlefield);
  destroyBattlefieldProjectiles(battlefield);
  destroyBattlefieldImpactEffects(battlefield);
  destroyBattlefieldDamageNumbers(battlefield);
}
