import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CREEP_COMBAT_TRAITS,
} from '../../../../../entities/creep';
import {
  createInitialTowerCombatRuntime,
  getTowerArchetype,
  getTowerStatsForLevel,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../../../entities/tower';
import { CreepTypeId, TowerTypeId } from '../../../../types/content-ids';
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

function spawnCreepAt(id: string, x: number, y: number): CreepRenderState {
  const creep = spawnCreep();
  creep.entity = { ...creep.entity, id, position: { x, y } };
  return creep;
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

describe('chain tower', () => {
  const CHAIN = getTowerArchetype(TowerTypeId.CHAIN).chain!;

  it('hits the primary target hardest and each jump weaker', () => {
    const primary = spawnCreepAt('creep:a', 3, 2);
    const second = spawnCreepAt('creep:b', 4, 2);
    const third = spawnCreepAt('creep:c', 5, 2);
    const battlefield = createBattlefield([buildTower(TowerTypeId.CHAIN)], [primary, second, third]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const primaryDamage = 500 - primary.entity.hp;
    const secondDamage = 500 - second.entity.hp;
    const thirdDamage = 500 - third.entity.hp;

    expect(primaryDamage).toBeGreaterThan(secondDamage);
    expect(secondDamage).toBeGreaterThan(thirdDamage);
    expect(thirdDamage).toBeGreaterThan(0);
  });

  it('never jumps more times than the archetype declares', () => {
    const creeps = [
      spawnCreepAt('creep:a', 3, 2),
      spawnCreepAt('creep:b', 4, 2),
      spawnCreepAt('creep:c', 5, 2),
      spawnCreepAt('creep:d', 6, 2),
      spawnCreepAt('creep:e', 7, 2),
      spawnCreepAt('creep:f', 8, 2),
    ];
    const battlefield = createBattlefield([buildTower(TowerTypeId.CHAIN)], creeps);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const hitCount = creeps.filter((creep) => creep.entity.hp < 500).length;

    expect(hitCount).toBe(CHAIN.bounces + 1);
  });

  it('never hits the same creep twice in one shot', () => {
    const primary = spawnCreepAt('creep:a', 3, 2);
    const neighbour = spawnCreepAt('creep:b', 4, 2);
    const battlefield = createBattlefield([buildTower(TowerTypeId.CHAIN)], [primary, neighbour]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    const arcDamage = getTowerArchetype(TowerTypeId.CHAIN).damage * (1 - CHAIN.damageFalloff);

    expect(500 - neighbour.entity.hp).toBeCloseTo(arcDamage, 5);
  });

  it('stops jumping when nothing is close enough', () => {
    const primary = spawnCreepAt('creep:a', 3, 2);
    const distant = spawnCreepAt('creep:far', 9, 9);
    const battlefield = createBattlefield([buildTower(TowerTypeId.CHAIN)], [primary, distant]);

    updateTowerCombat(battlefield, createDeps(), CONFIG, 16);

    expect(distant.entity.hp).toBe(500);
  });

  it('picks the same chain every time for the same battlefield', () => {
    const runChain = (): number[] => {
      const creeps = [
        spawnCreepAt('creep:a', 3, 2),
        spawnCreepAt('creep:b', 4, 2),
        spawnCreepAt('creep:c', 4, 3),
      ];
      updateTowerCombat(
        createBattlefield([buildTower(TowerTypeId.CHAIN)], creeps),
        createDeps(),
        CONFIG,
        16,
      );
      return creeps.map((creep) => creep.entity.hp);
    };

    expect(runChain()).toEqual(runChain());
  });
});
