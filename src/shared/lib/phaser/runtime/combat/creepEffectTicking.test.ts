import { describe, expect, it, vi } from 'vitest';
import { applyEffectToCreep, DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import { CreepTypeId, EffectId } from '../../../../types/content-ids';
import { resolveEffectDefinition } from '../../../../constants/effects';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CreepRenderState } from '../../scenes/gameScene.types';

// The combat runtime imports Phaser for colour maths only; the stub keeps this
// suite in the node environment.
vi.mock('phaser', () => ({ default: { Display: { Color: {} } } }));

const { applyTowerEffectToCreep, updateCreepEffects } = await import('./gameSceneCombatRuntime');

type CombatConfig = Parameters<typeof updateCreepEffects>[2];
type CombatDeps = Parameters<typeof updateCreepEffects>[1];

const POISON = resolveEffectDefinition(EffectId.POISON);

const CONFIG = {
  damageNumbersEnabled: false,
  damageNumberLifetimeMs: 400,
  damageNumberRisePx: 12,
  damageNumberHitColor: '#ffe9a8',
  damageNumberEffectColor: '#9de8a4',
  effectMaxSimulationDeltaMs: 34,
} as CombatConfig;

function createDeps(): CombatDeps & {
  goldUpdates: number[];
  sounds: string[];
} {
  const goldUpdates: number[] = [];
  const sounds: string[] = [];
  let gold = 0;

  return {
    goldUpdates,
    sounds,
    scene: { add: { text: vi.fn(), sprite: vi.fn() } },
    toCellCenter: (position: { x: number; y: number }) => position,
    playArcherAttackAnimation: vi.fn(),
    playSplashAttackAnimation: vi.fn(),
    playSound: (soundId: string) => sounds.push(soundId),
    getResources: () => ({ gold, lives: 20 }),
    onGoldUpdated: (nextGold: number) => {
      gold = nextGold;
      goldUpdates.push(nextGold);
    },
    onHudChanged: vi.fn(),
  } as unknown as CombatDeps & { goldUpdates: number[]; sounds: string[] };
}

function createCreepRenderState(overrides?: { hp?: number; status?: 'alive' | 'escaped' }): CreepRenderState {
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'creep:1',
      type: CreepTypeId.BASIC,
      hp: overrides?.hp ?? 100,
      lifeState: 'alive',
      speed: 1,
      status: overrides?.status ?? 'alive',
      position: { x: 2, y: 3 },
      pathIndex: 0,
    },
    sprite: { setTint: vi.fn(), setAlpha: vi.fn(), destroy: vi.fn() },
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    baseTint: 0xffffff,
  } as unknown as CreepRenderState;
}

function createBattlefield(creeps: CreepRenderState[]): BattlefieldRenderState {
  return {
    creeps,
    towers: [],
    projectiles: [],
    impactEffects: [],
    damageNumbers: [],
  } as unknown as BattlefieldRenderState;
}

const FRAME_MS = 16;

function advanceFrames(
  battlefield: BattlefieldRenderState,
  deps: CombatDeps,
  totalMs: number,
): void {
  for (let elapsed = 0; elapsed < totalMs; elapsed += FRAME_MS) {
    updateCreepEffects(battlefield, deps, CONFIG, FRAME_MS);
  }
}

describe('updateCreepEffects', () => {
  it('applies damage over time through the creep damage path', () => {
    const creep = createCreepRenderState();
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    const battlefield = createBattlefield([creep]);

    advanceFrames(battlefield, createDeps(), POISON.tickIntervalMs);

    expect(creep.entity.hp).toBe(100 - POISON.magnitude);
  });

  it('pays the kill reward and death sound exactly once for a poison kill', () => {
    const creep = createCreepRenderState({ hp: POISON.magnitude });
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    const battlefield = createBattlefield([creep]);
    const deps = createDeps();

    advanceFrames(battlefield, deps, POISON.durationMs);

    expect(creep.entity.lifeState).toBe('dead');
    expect(deps.goldUpdates).toHaveLength(1);
    expect(deps.sounds.filter((sound) => sound === 'combat.creep_death.basic')).toHaveLength(1);
  });

  it('leaves escaped creeps alone', () => {
    const creep = createCreepRenderState({ status: 'escaped' });
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    const battlefield = createBattlefield([creep]);

    advanceFrames(battlefield, createDeps(), POISON.durationMs);

    expect(creep.entity.hp).toBe(100);
  });

  it('clamps a long frame so an unpause cannot burst a wave down', () => {
    const creep = createCreepRenderState();
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    const battlefield = createBattlefield([creep]);

    updateCreepEffects(battlefield, createDeps(), CONFIG, 5_000);

    expect(creep.entity.hp).toBe(100);
    expect(creep.entity.activeEffects?.[0].remainingMs).toBe(
      POISON.durationMs - CONFIG.effectMaxSimulationDeltaMs,
    );
  });

  it('does nothing for creeps without effects', () => {
    const creep = createCreepRenderState();
    const before = creep.entity;
    const battlefield = createBattlefield([creep]);

    updateCreepEffects(battlefield, createDeps(), CONFIG, 16);

    expect(creep.entity).toBe(before);
  });
});

describe('applyTowerEffectToCreep', () => {
  it('puts the effect on the creep and plays its stinger', () => {
    const creep = createCreepRenderState();
    const deps = createDeps();

    const applied = applyTowerEffectToCreep(deps, CONFIG, creep, { effectId: EffectId.CHILL });

    expect(applied).toBe(true);
    expect(creep.entity.activeEffects).toHaveLength(1);
    expect(deps.sounds).toContain('combat.effect_applied.chill');
  });

  it('reports nothing applied when a weaker slow is dropped', () => {
    const creep = createCreepRenderState();
    const deps = createDeps();

    applyTowerEffectToCreep(deps, CONFIG, creep, { effectId: EffectId.CHILL, magnitude: 0.5 });
    const secondApplication = applyTowerEffectToCreep(deps, CONFIG, creep, {
      effectId: EffectId.CHILL,
      magnitude: 0.2,
    });

    expect(secondApplication).toBe(false);
    expect(deps.sounds.filter((sound) => sound === 'combat.effect_applied.chill')).toHaveLength(1);
  });

  it('has no stinger for armor break yet', () => {
    const creep = createCreepRenderState();
    const deps = createDeps();

    applyTowerEffectToCreep(deps, CONFIG, creep, { effectId: EffectId.ARMOR_BREAK });

    expect(creep.entity.activeEffects).toHaveLength(1);
    expect(deps.sounds).toHaveLength(0);
  });
});
