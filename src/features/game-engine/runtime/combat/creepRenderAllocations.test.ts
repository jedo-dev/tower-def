import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS, type ActiveEffect } from '../../../../entities/creep';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import { UNIT_SPRITE_KEYS } from '../../../../shared/constants/sprites';
import { CreepTypeId, EFFECT_IDS, type EffectId } from '../../../../shared/types/content-ids';
import {
  referenceEffectSignature,
  referenceRefreshCreepEffectVisuals,
  referenceRemoveDeadCreepsFromActiveWave,
} from '../../test/combatRenderReference';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { computeEffectSignature, refreshCreepEffectVisuals } from './creepEffectVisuals';

vi.mock('phaser', () => ({ default: { Display: { Color: {} } } }));

const { removeDeadCreepsFromActiveWave } = await import('./gameSceneCombatRuntime');

// tower-def-5rh: the creep render paths stopped allocating per frame. Each
// rewritten path runs next to a verbatim copy of the old code
// (test/combatRenderReference) on seeded scenarios; both must make the same
// sprite calls in the same order and leave the same creep list.

type Random = () => number;
type CallLog = string[];

const FALLBACK_TINT = 0xffffff;
const FADE_MS = 180;
const DEATH_MS = 620;

function pick<V>(random: Random, values: readonly V[]): V {
  return values[Math.floor(random() * values.length)];
}

function createTextStub(log: CallLog, label: string): Record<string, unknown> {
  log.push(`text.create ${label}`);
  return {
    setOrigin: (x: number, y: number) => log.push(`text.origin ${x},${y}`),
    setDepth: (depth: number) => log.push(`text.depth ${depth}`),
    setPosition: (x: number, y: number) => log.push(`text.position ${x},${y}`),
    setText: (next: string) => log.push(`text.text ${next}`),
    setColor: (next: string) => log.push(`text.color ${next}`),
    destroy: () => log.push('text.destroy'),
  };
}

function createScene(log: CallLog): Phaser.Scene {
  return {
    add: {
      text: (x: number, y: number, label: string, style: unknown) => {
        log.push(`scene.text ${x},${y} ${JSON.stringify(style)}`);
        return createTextStub(log, label);
      },
    },
  } as unknown as Phaser.Scene;
}

function createCreep(log: CallLog, id: string, isDead: boolean): CreepRenderState {
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id,
      type: CreepTypeId.BASIC,
      hp: isDead ? 0 : 50,
      lifeState: isDead ? 'dead' : 'alive',
      speed: 1,
      status: isDead ? 'dead' : 'alive',
      position: { x: 0, y: 0 },
      pathIndex: 0,
    },
    sprite: {
      x: 10,
      y: 20,
      displayHeight: 24,
      texture: { key: UNIT_SPRITE_KEYS.ORC_GRUNT },
      setTint: (tint: number) => log.push(`${id} tint ${tint}`),
      setAlpha: (alpha: number) => log.push(`${id} alpha ${alpha}`),
      play: (key: string, ignoreIfPlaying: boolean) =>
        log.push(`${id} play ${key} ${ignoreIfPlaying}`),
      destroy: () => log.push(`${id} destroy`),
    },
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
  } as unknown as CreepRenderState;
}

function createEffect(random: Random, id: EffectId): ActiveEffect {
  const maxStacks = 1 + Math.floor(random() * 5);
  return {
    id,
    magnitude: random(),
    remainingMs: Math.floor(random() * 3_000),
    stacks: 1 + Math.floor(random() * maxStacks),
    maxStacks,
    nextTickInMs: 0,
  };
}

/** Random effect list: usually distinct ids, sometimes a repeated one. */
function createRandomEffects(random: Random): ActiveEffect[] {
  const length = Math.floor(random() * 5);
  const effects: ActiveEffect[] = [];
  for (let index = 0; index < length; index += 1) {
    const id = pick(random, EFFECT_IDS);
    if (random() < 0.85 && effects.some((effect) => effect.id === id)) {
      continue;
    }
    effects.push(createEffect(random, id));
  }
  return effects;
}

function shuffled<V>(random: Random, values: readonly V[]): V[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** One step of an effect scenario: what the creep carries before a refresh. */
function stepEffects(random: Random, creep: CreepRenderState): void {
  const roll = random();
  const current = creep.entity.activeEffects ?? [];
  if (roll < 0.35) {
    creep.entity = { ...creep.entity, activeEffects: createRandomEffects(random) };
  } else if (roll < 0.5) {
    creep.entity = { ...creep.entity, activeEffects: shuffled(random, current) };
  } else if (roll < 0.65) {
    const restacked = current.map((effect) => ({ ...effect, stacks: effect.stacks + 1 }));
    creep.entity = { ...creep.entity, activeEffects: restacked };
  } else if (roll < 0.7) {
    creep.entity = { ...creep.entity, activeEffects: undefined };
  }
  creep.hitFlashRemainingMs = random() < 0.3 ? 40 : 0;
  creep.baseTint = random() < 0.2 ? undefined : 0x8fce6a;
  (creep.sprite as { x: number }).x = Math.floor(random() * 300);
}

function runEffectScenario(seed: number, refresh: typeof refreshCreepEffectVisuals): CallLog {
  const random = createSeededRandom(seed);
  const log: CallLog = [];
  const scene = createScene(log);
  const creep = createCreep(log, 'creep:1', false);
  for (let step = 0; step < 40; step += 1) {
    stepEffects(random, creep);
    log.push('refresh');
    refresh(scene, creep, FALLBACK_TINT);
  }
  return log;
}

describe('refreshCreepEffectVisuals with a numeric signature', () => {
  it('repaints exactly when the sorted-string version did, on 300 seeded scenarios', () => {
    let repaints = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const expected = runEffectScenario(seed, referenceRefreshCreepEffectVisuals);
      const actual = runEffectScenario(seed, refreshCreepEffectVisuals);
      expect(actual, `seed ${seed}`).toEqual(expected);
      repaints += expected.filter((line) => line.includes(' tint ')).length;
    }
    // Guards against scenarios that never change the effect set.
    expect(repaints).toBeGreaterThan(1_000);
  });

  it('gives two effect lists one signature exactly when their sorted ids match', () => {
    const random = createSeededRandom(17);
    let equalPairs = 0;
    for (let pair = 0; pair < 2_000; pair += 1) {
      const left = createRandomEffects(random);
      const right = random() < 0.3 ? shuffled(random, left) : createRandomEffects(random);
      const stringsEqual =
        referenceEffectSignature(left.map((effect) => effect.id)) ===
        referenceEffectSignature(right.map((effect) => effect.id));
      expect(computeEffectSignature(left) === computeEffectSignature(right)).toBe(stringsEqual);
      equalPairs += stringsEqual ? 1 : 0;
    }
    expect(equalPairs).toBeGreaterThan(300);
  });

  it('counts a repeated id, as the joined string did', () => {
    const random = createSeededRandom(3);
    const once = [createEffect(random, EFFECT_IDS[0])];
    const twice = [...once, createEffect(random, EFFECT_IDS[0])];

    expect(computeEffectSignature(twice)).not.toBe(computeEffectSignature(once));
    expect(computeEffectSignature([])).toBe(0);
  });
});

type RemovalRun = { log: CallLog; frames: string[][] };

function runRemovalScenario(
  seed: number,
  remove: (creeps: CreepRenderState[], deltaMs: number) => CreepRenderState[],
): RemovalRun {
  const random = createSeededRandom(seed);
  const log: CallLog = [];
  let creeps = Array.from({ length: Math.floor(random() * 30) }, (_, index) => {
    const creep = createCreep(log, `creep:${index}`, random() < 0.4);
    creep.isDirectional = random() < 0.5;
    creep.deathFadeRemainingMs = random() < 0.3 ? Math.floor(random() * 400) : 0;
    creep.isDeathAnimationPlaying = random() < 0.2 ? true : undefined;
    return creep;
  });
  const frames: string[][] = [];

  for (let frame = 0; frame < 25; frame += 1) {
    for (const creep of creeps) {
      if (random() < 0.08) {
        creep.entity = { ...creep.entity, hp: 0 };
      }
    }
    creeps = remove(creeps, random() < 0.1 ? 0 : Math.floor(random() * 120));
    frames.push(creeps.map((creep) => `${creep.entity.id}:${creep.deathFadeRemainingMs}`));
  }

  return { log, frames };
}

describe('removeDeadCreepsFromActiveWave compacting in place', () => {
  it('matches the copying version frame by frame on 300 seeded fields', () => {
    let destroyed = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const expected = runRemovalScenario(seed, (creeps, deltaMs) =>
        referenceRemoveDeadCreepsFromActiveWave(creeps, deltaMs, FADE_MS, DEATH_MS),
      );
      const actual = runRemovalScenario(seed, (creeps, deltaMs) => {
        removeDeadCreepsFromActiveWave(creeps, deltaMs, FADE_MS, DEATH_MS);
        return creeps;
      });
      expect(actual.frames, `seed ${seed}`).toEqual(expected.frames);
      expect(actual.log, `seed ${seed}`).toEqual(expected.log);
      destroyed += expected.log.filter((line) => line.endsWith('destroy')).length;
    }
    expect(destroyed).toBeGreaterThan(1_000);
  });

  it('keeps the list it was given and drops destroyed creeps from it', () => {
    const log: CallLog = [];
    const alive = createCreep(log, 'creep:alive', false);
    const dead = createCreep(log, 'creep:dead', true);
    const creeps = [dead, alive];

    removeDeadCreepsFromActiveWave(creeps, FADE_MS, FADE_MS);

    expect(creeps).toEqual([alive]);
    expect(log).toContain('creep:dead destroy');
  });
});
