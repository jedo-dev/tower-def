import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CREEP_COMBAT_TRAITS,
  findActiveEffect,
  tickCreepEffects,
} from '../../../../../entities/creep';
import {
  createInitialTowerCombatRuntime,
  getTowerStatsForLevel,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../../../entities/tower';
import { CreepTypeId, EffectId, TowerTypeId } from '../../../../types/content-ids';
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

describe('poison tower', () => {
  it('trades direct damage for damage over time', () => {
    const poisonCreep = spawnCreep();
    const singleCreep = spawnCreep();

    updateTowerCombat(createBattlefield([buildTower(TowerTypeId.POISON)], [poisonCreep]), createDeps(), CONFIG, 16);
    updateTowerCombat(createBattlefield([buildTower(TowerTypeId.SINGLE)], [singleCreep]), createDeps(), CONFIG, 16);

    expect(500 - poisonCreep.entity.hp).toBeLessThan(500 - singleCreep.entity.hp);
    expect(findActiveEffect(poisonCreep.entity, EffectId.POISON)).toBeDefined();
  });

  it('stacks poison up to the cap its level declares', () => {
    const creep = spawnCreep();
    const battlefield = createBattlefield([buildTower(TowerTypeId.POISON)], [creep]);
    const deps = createDeps();

    for (let shot = 0; shot < 10; shot += 1) {
      battlefield.towers[0].runtime = createInitialTowerCombatRuntime();
      updateTowerCombat(battlefield, deps, CONFIG, 16);
    }

    const poison = findActiveEffect(creep.entity, EffectId.POISON)!;
    const authoredCap = getTowerStatsForLevel(TowerTypeId.POISON, 1)!.onHitEffects![0].maxStacks!;

    expect(poison.stacks).toBe(authoredCap);
  });

  it('raises tick damage and stack cap with each upgrade', () => {
    const effectAtLevel = (level: number) =>
      getTowerStatsForLevel(TowerTypeId.POISON, level)!.onHitEffects![0];

    expect(effectAtLevel(2).magnitude!).toBeGreaterThan(effectAtLevel(1).magnitude!);
    expect(effectAtLevel(3).magnitude!).toBeGreaterThan(effectAtLevel(2).magnitude!);
    expect(effectAtLevel(2).maxStacks!).toBeGreaterThan(effectAtLevel(1).maxStacks!);
    expect(effectAtLevel(3).maxStacks!).toBeGreaterThan(effectAtLevel(2).maxStacks!);
  });

  it('keeps killing the creep after the tower stops firing', () => {
    const creep = spawnCreep();
    creep.entity = { ...creep.entity, hp: 40 };
    const battlefield = createBattlefield([buildTower(TowerTypeId.POISON)], [creep]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const hpAfterHit = creep.entity.hp;
    let ticked = creep.entity;

    for (let frame = 0; frame < 250; frame += 1) {
      const result = tickCreepEffects(ticked, 16);
      ticked = { ...result.creep, hp: result.creep.hp - result.damage };
    }

    expect(ticked.hp).toBeLessThan(hpAfterHit);
  });

  it('bypasses armor, unlike a direct hit', () => {
    const armored = spawnCreep();
    armored.entity = { ...armored.entity, armor: 10, armorType: 'heavy' };
    const battlefield = createBattlefield([buildTower(TowerTypeId.POISON)], [armored]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const poison = findActiveEffect(armored.entity, EffectId.POISON)!;
    const tick = tickCreepEffects(armored.entity, 500);

    expect(tick.damage).toBe(poison.magnitude * poison.stacks);
  });
});
