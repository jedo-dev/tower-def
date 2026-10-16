import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import { TOWER_TYPE_IDS } from '../../../../shared/types/content-ids';
import { createFixtureTower } from '../../test/combatCoreFixtures';
import {
  referenceSpawnDamageNumber,
  referenceSpawnImpactEffect,
  referenceSpawnProjectileFeedback,
  referenceUpdateDamageNumbers,
  referenceUpdateImpactEffects,
  referenceUpdateProjectiles,
} from '../../test/combatFeedbackReference';
import type { CreepRenderState, TowerRenderState } from '../../scenes/gameScene.types';
import {
  createBattlefieldRenderState,
  type BattlefieldRenderState,
} from '../battlefield/battlefieldRenderState';
import type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
import { getDamageNumberPool, spawnDamageNumber, updateDamageNumbers } from './damageNumbers';
import { getImpactEffectPool, spawnImpactEffect, updateImpactEffects } from './impactEffects';
import { getProjectilePool, spawnProjectileFeedback, updateProjectiles } from './projectiles';
import { createRenderRecordPool, releasePooledRecord, takePooledRecord } from './renderRecordPool';

// tower-def-5rh: projectiles, impact effects and damage numbers stopped
// rebuilding their lists and records every frame. The pooled, in-place
// versions run next to verbatim copies of the old code
// (test/combatFeedbackReference) on seeded scenarios; both must make the same
// scene calls in the same order and hold the same records.

type Random = () => number;
type CallLog = string[];

type FeedbackPaths = {
  spawnProjectile: typeof spawnProjectileFeedback;
  spawnImpact: typeof spawnImpactEffect;
  spawnNumber: typeof spawnDamageNumber;
  updateProjectiles: typeof updateProjectiles;
  updateImpacts: typeof updateImpactEffects;
  updateNumbers: typeof updateDamageNumbers;
};

const LIVE: FeedbackPaths = {
  spawnProjectile: spawnProjectileFeedback,
  spawnImpact: spawnImpactEffect,
  spawnNumber: spawnDamageNumber,
  updateProjectiles,
  updateImpacts: updateImpactEffects,
  updateNumbers: updateDamageNumbers,
};

const REFERENCE: FeedbackPaths = {
  spawnProjectile: referenceSpawnProjectileFeedback,
  spawnImpact: referenceSpawnImpactEffect,
  spawnNumber: referenceSpawnDamageNumber,
  updateProjectiles: referenceUpdateProjectiles,
  updateImpacts: referenceUpdateImpactEffects,
  updateNumbers: referenceUpdateDamageNumbers,
};

function pick<V>(random: Random, values: readonly V[]): V {
  return values[Math.floor(random() * values.length)];
}

function createConfig(random: Random): CombatRuntimeConfig {
  return {
    archerProjectileVisualMode: random() < 0.5 ? 'projectile' : 'attackEffect',
    creepBaseColor: 0xffffff,
    creepHitFlashColor: 0xff0000,
    creepHitFlashDurationMs: 90,
    creepDeathFadeDurationMs: 180,
    creepDeathAnimationDurationMs: 620,
    projectileMinLifetimeMs: 60 + Math.floor(random() * 60),
    projectileMaxLifetimeMs: 200 + Math.floor(random() * 200),
    projectileDisplaySizePx: 12,
    projectileRenderDepth: 5,
    impactEffectLifetimeMs: 80 + Math.floor(random() * 200),
    impactEffectRenderDepth: 6,
    damageNumbersEnabled: random() < 0.85,
    damageNumberLifetimeMs: 200 + Math.floor(random() * 600),
    damageNumberRisePx: 14,
    damageNumberHitColor: '#ffffff',
    damageNumberEffectColor: '#88ff88',
    effectMaxSimulationDeltaMs: 100,
  };
}

/** A scene whose sprites and texts log every call, tagged by creation order. */
function createScene(log: CallLog): Phaser.Scene {
  let created = 0;
  const createObject = (x: number, y: number): Record<string, unknown> => {
    const id = `#${created}`;
    created += 1;
    const object: Record<string, unknown> = {
      id,
      x,
      y,
      setDisplaySize: (width: number, height: number) => log.push(`${id} size ${width},${height}`),
      setOrigin: (origin: number) => log.push(`${id} origin ${origin}`),
      setDepth: (depth: number) => log.push(`${id} depth ${depth}`),
      setTint: (tint: number) => log.push(`${id} tint ${tint}`),
      setPosition: (nextX: number, nextY: number) => log.push(`${id} position ${nextX},${nextY}`),
      setAlpha: (alpha: number) => log.push(`${id} alpha ${alpha}`),
      setY: (nextY: number) => {
        object.y = nextY;
        log.push(`${id} y ${nextY}`);
      },
      destroy: () => log.push(`${id} destroy`),
    };
    return object;
  };
  return {
    add: {
      sprite: (x: number, y: number, key: string, frame: number) => {
        log.push(`sprite ${x},${y} ${key} ${frame}`);
        return createObject(x, y);
      },
      text: (x: number, y: number, label: string, style: unknown) => {
        log.push(`text ${x},${y} ${label} ${JSON.stringify(style)}`);
        return createObject(x, y);
      },
    },
  } as unknown as Phaser.Scene;
}

function createDeps(scene: Phaser.Scene): CombatRuntimeDependencies {
  return {
    scene,
    writeCellCenter: (position: { x: number; y: number }, out: { x: number; y: number }) => {
      out.x = position.x * 16 + 8;
      out.y = position.y * 16 + 8;
    },
  } as unknown as CombatRuntimeDependencies;
}

function createRandomTower(random: Random, index: number): TowerRenderState {
  const tower = createFixtureTower({
    id: `tower:${index}`,
    type: pick(random, TOWER_TYPE_IDS),
    position: { x: Math.floor(random() * 12), y: Math.floor(random() * 12) },
    stats: { attackCooldownMs: Math.floor(random() * 2_000) },
  });
  return {
    ...tower,
    sprite: { texture: { key: `tower-key-${index}` } },
  } as unknown as TowerRenderState;
}

function createRandomTarget(random: Random): CreepRenderState {
  return {
    entity: { position: { x: Math.floor(random() * 12), y: Math.floor(random() * 12) } },
    footprintCenterOffsetPx: random() < 0.3 ? 8 : undefined,
  } as unknown as CreepRenderState;
}

function objectId(object: unknown): unknown {
  return (object as { id: string }).id;
}

/** Records as plain data, with each sprite or text replaced by its creation tag. */
function snapshot(field: BattlefieldRenderState): unknown {
  return {
    projectiles: field.projectiles.map((record) => ({
      ...record,
      sprite: objectId(record.sprite),
    })),
    impactEffects: field.impactEffects.map((record) => ({
      ...record,
      sprite: objectId(record.sprite),
    })),
    damageNumbers: field.damageNumbers.map((record) => ({
      ...record,
      text: objectId(record.text),
    })),
  };
}

function spawnRandomFeedback(
  random: Random,
  paths: FeedbackPaths,
  field: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  towers: readonly TowerRenderState[],
): void {
  const spawns = Math.floor(random() * 4);
  for (let spawn = 0; spawn < spawns; spawn += 1) {
    const roll = random();
    const tower = pick(random, towers);
    if (roll < 0.5) {
      paths.spawnProjectile(field, deps, config, tower, createRandomTarget(random), random() < 0.4);
    } else if (roll < 0.85) {
      const position = { x: Math.floor(random() * 12), y: Math.floor(random() * 12) };
      const source = random() < 0.3 ? 'effect' : 'hit';
      paths.spawnNumber(field, deps, config, position, Math.floor(random() * 300), source);
    } else {
      const x = Math.floor(random() * 200);
      const y = Math.floor(random() * 200);
      paths.spawnImpact(
        field,
        deps,
        config,
        'impact',
        x,
        y,
        random() < 0.5,
        tower.entity.type,
        false,
      );
    }
  }
}

function runScenario(seed: number, paths: FeedbackPaths): { log: CallLog; frames: unknown[] } {
  const random = createSeededRandom(seed);
  const log: CallLog = [];
  const deps = createDeps(createScene(log));
  const config = createConfig(random);
  const towers = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, index) =>
    createRandomTower(random, index),
  );
  const field = createBattlefieldRenderState();
  const frames: unknown[] = [];

  for (let frame = 0; frame < 30; frame += 1) {
    spawnRandomFeedback(random, paths, field, deps, config, towers);
    const deltaMs = random() < 0.1 ? 0 : Math.floor(random() * 120);
    paths.updateProjectiles(field, deps, config, deltaMs);
    paths.updateImpacts(field, deltaMs);
    paths.updateNumbers(field, config, deltaMs);
    frames.push(snapshot(field));
  }

  return { log, frames };
}

describe('combat feedback with pooled records and in-place lists', () => {
  it('matches the list-rebuilding versions frame by frame on 300 seeded scenarios', () => {
    let destroyed = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const expected = runScenario(seed, REFERENCE);
      const actual = runScenario(seed, LIVE);
      expect(actual.frames, `seed ${seed}`).toEqual(expected.frames);
      expect(actual.log, `seed ${seed}`).toEqual(expected.log);
      destroyed += expected.log.filter((line) => line.endsWith('destroy')).length;
    }
    // Guards against scenarios where nothing ever expires.
    expect(destroyed).toBeGreaterThan(3_000);
  });

  it('keeps each battlefield list and hands expired records to the next spawn', () => {
    const random = createSeededRandom(42);
    const log: CallLog = [];
    const deps = createDeps(createScene(log));
    const config = { ...createConfig(random), damageNumbersEnabled: true };
    const tower = createRandomTower(random, 0);
    const field = createBattlefieldRenderState();
    const lists = [field.projectiles, field.impactEffects, field.damageNumbers];

    spawnProjectileFeedback(field, deps, config, tower, createRandomTarget(random), false);
    spawnDamageNumber(field, deps, config, { x: 1, y: 1 }, 10);
    const projectile = field.projectiles[0];
    const damageNumber = field.damageNumbers[0];

    updateProjectiles(field, deps, config, 10_000);
    updateDamageNumbers(field, config, 10_000);
    const impact = field.impactEffects[0];
    updateImpactEffects(field, 10_000);

    expect(field.projectiles).toHaveLength(0);
    expect(field.impactEffects).toHaveLength(0);
    expect(field.damageNumbers).toHaveLength(0);
    expect(getProjectilePool().free).toContain(projectile);
    expect(getImpactEffectPool().free).toContain(impact);
    expect(getDamageNumberPool().free).toContain(damageNumber);

    spawnProjectileFeedback(field, deps, config, tower, createRandomTarget(random), true);
    spawnDamageNumber(field, deps, config, { x: 2, y: 2 }, 20);
    expect(field.projectiles[0]).toBe(projectile);
    expect(projectile.isSplash).toBe(true);
    updateProjectiles(field, deps, config, 10_000);

    expect(field.projectiles).toHaveLength(0);
    expect(field.impactEffects[0]).toBe(impact);
    expect(field.damageNumbers[0]).toBe(damageNumber);
    expect(damageNumber.remainingMs).toBe(config.damageNumberLifetimeMs);
    expect([field.projectiles, field.impactEffects, field.damageNumbers]).toEqual(lists);
    expect(field.projectiles).toBe(lists[0]);
    expect(field.impactEffects).toBe(lists[1]);
    expect(field.damageNumbers).toBe(lists[2]);
  });

  it('stops pooling once the free list is full', () => {
    const pool = createRenderRecordPool<{ id: number }>(2);
    const records = [{ id: 1 }, { id: 2 }, { id: 3 }];

    for (const record of records) {
      releasePooledRecord(pool, record);
    }

    expect(pool.free).toEqual([records[0], records[1]]);
    expect(takePooledRecord(pool)).toBe(records[1]);
    expect(takePooledRecord(pool)).toBe(records[0]);
    expect(takePooledRecord(pool)).toBeUndefined();
  });
});
