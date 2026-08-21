import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CREEP_COMBAT_TRAITS,
  findActiveEffect,
  getEffectiveSpeedMultiplier,
  tickCreepEffects,
} from '../../../../../entities/creep';
import {
  createInitialTowerCombatRuntime,
  getTowerStatsForLevel,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../../../entities/tower';
import { CreepTypeId, EffectId, TowerTypeId } from '../../../../types/content-ids';
import { CREEP_EFFECT_TINTS } from '../../scenes/gameScene.constants';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CreepRenderState, TowerRenderState } from '../../scenes/gameScene.types';

vi.mock('phaser', () => ({ default: { Display: { Color: {} } } }));

const { updateTowerCombat } = await import('./gameSceneCombatRuntime');

type CombatConfig = Parameters<typeof updateTowerCombat>[2];
type CombatDeps = Parameters<typeof updateTowerCombat>[1];

const CONFIG = {
  archerProjectileVisualMode: 'attackEffect',
  creepBaseColor: 0xffffff,
  creepHitFlashColor: 0xffffff,
  creepHitFlashDurationMs: 90,
  creepDeathFadeDurationMs: 180,
  projectileMinLifetimeMs: 200,
  projectileMaxLifetimeMs: 350,
  projectileDisplaySizePx: 24,
  projectileRenderDepth: 70,
  impactEffectLifetimeMs: 120,
  impactEffectRenderDepth: 72,
  damageNumbersEnabled: false,
  damageNumberLifetimeMs: 400,
  damageNumberRisePx: 12,
  damageNumberHitColor: '#ffe9a8',
  damageNumberEffectColor: '#9de8a4',
  effectMaxSimulationDeltaMs: 34,
} as CombatConfig;

function createSpriteStub() {
  return {
    setTint: vi.fn(),
    setAlpha: vi.fn(),
    setDepth: vi.fn(),
    setOrigin: vi.fn(),
    setDisplaySize: vi.fn(),
    setPosition: vi.fn(),
    destroy: vi.fn(),
    play: vi.fn(),
    once: vi.fn(),
    active: true,
    texture: { key: 'tower.undead.bone_archer' },
  };
}

function createDeps(): CombatDeps & { sounds: string[] } {
  const sounds: string[] = [];

  return {
    sounds,
    scene: { add: { text: vi.fn(() => createSpriteStub()), sprite: vi.fn(() => createSpriteStub()) } },
    toCellCenter: (position: { x: number; y: number }) => ({ x: position.x * 40, y: position.y * 40 }),
    playArcherAttackAnimation: vi.fn(),
    playSplashAttackAnimation: vi.fn(),
    playSound: (soundId: string) => sounds.push(soundId),
    getResources: () => ({ gold: 0, lives: 20 }),
    onGoldUpdated: vi.fn(),
    onHudChanged: vi.fn(),
  } as unknown as CombatDeps & { sounds: string[] };
}

function buildTower(towerType: TowerTypeId, level = 1): TowerRenderState {
  const combatStats = level === 1
    ? TOWER_COMBAT_STATS_BY_TYPE[towerType]
    : getTowerStatsForLevel(towerType, level)!;
  const entity: TowerEntity = {
    id: `tower:${towerType}`,
    position: { x: 2, y: 2 },
    cost: 50,
    type: towerType,
    level,
    combatStats,
  };

  return {
    entity,
    runtime: createInitialTowerCombatRuntime(),
    sprite: createSpriteStub(),
  } as unknown as TowerRenderState;
}

function spawnCreep(): CreepRenderState {
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'creep:1',
      type: CreepTypeId.BASIC,
      hp: 500,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { x: 3, y: 2 },
      pathIndex: 0,
    },
    sprite: createSpriteStub(),
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    baseTint: 0xffffff,
  } as unknown as CreepRenderState;
}

function createBattlefield(towers: TowerRenderState[], creeps: CreepRenderState[]): BattlefieldRenderState {
  return {
    towers,
    creeps,
    projectiles: [],
    impactEffects: [],
    damageNumbers: [],
  } as unknown as BattlefieldRenderState;
}

describe('frost tower', () => {
  it('chills the creep it hits and deals less damage than the plain archetype', () => {
    const frostCreep = spawnCreep();
    const singleCreep = spawnCreep();

    updateTowerCombat(createBattlefield([buildTower(TowerTypeId.FROST)], [frostCreep]), createDeps(), CONFIG, 16);
    updateTowerCombat(createBattlefield([buildTower(TowerTypeId.SINGLE)], [singleCreep]), createDeps(), CONFIG, 16);

    expect(findActiveEffect(frostCreep.entity, EffectId.CHILL)).toBeDefined();
    expect(findActiveEffect(singleCreep.entity, EffectId.CHILL)).toBeUndefined();
    expect(500 - frostCreep.entity.hp).toBeLessThan(500 - singleCreep.entity.hp);
  });

  it('slows the creep while the chill runs and lets it recover afterwards', () => {
    const creep = spawnCreep();

    updateTowerCombat(createBattlefield([buildTower(TowerTypeId.FROST)], [creep]), createDeps(), CONFIG, 16);

    expect(getEffectiveSpeedMultiplier(creep.entity)).toBeLessThan(1);

    const chill = findActiveEffect(creep.entity, EffectId.CHILL)!;
    creep.entity = tickCreepEffects(creep.entity, chill.remainingMs).creep;

    expect(getEffectiveSpeedMultiplier(creep.entity)).toBe(1);
  });

  it('never stacks the chill into a permanent freeze', () => {
    const creep = spawnCreep();
    const battlefield = createBattlefield([buildTower(TowerTypeId.FROST, 3)], [creep]);
    const deps = createDeps();

    for (let shot = 0; shot < 20; shot += 1) {
      battlefield.towers[0].runtime = createInitialTowerCombatRuntime();
      updateTowerCombat(battlefield, deps, CONFIG, 16);
    }

    const chill = findActiveEffect(creep.entity, EffectId.CHILL)!;

    expect(chill.stacks).toBe(1);
    expect(getEffectiveSpeedMultiplier(creep.entity)).toBeGreaterThan(0);
  });

  it('deepens the slow as the tower is upgraded', () => {
    const magnitudeAtLevel = (level: number): number => {
      const creep = spawnCreep();
      updateTowerCombat(
        createBattlefield([buildTower(TowerTypeId.FROST, level)], [creep]),
        createDeps(),
        CONFIG,
        16,
      );
      return findActiveEffect(creep.entity, EffectId.CHILL)!.magnitude;
    };

    expect(magnitudeAtLevel(2)).toBeGreaterThan(magnitudeAtLevel(1));
    expect(magnitudeAtLevel(3)).toBeGreaterThan(magnitudeAtLevel(2));
  });

  it('fires a shot coloured by its effect', () => {
    const creep = spawnCreep();
    const battlefield = createBattlefield([buildTower(TowerTypeId.FROST)], [creep]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const projectile = battlefield.projectiles[0];

    expect(projectile).toBeDefined();
    expect(projectile.sprite.setTint).toHaveBeenCalledWith(CREEP_EFFECT_TINTS[EffectId.CHILL]);
  });
});
