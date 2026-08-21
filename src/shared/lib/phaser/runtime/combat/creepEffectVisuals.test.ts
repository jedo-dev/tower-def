import { describe, expect, it, vi } from 'vitest';
import { applyEffectToCreep, DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import { CreepTypeId, EffectId } from '../../../../types/content-ids';
import {
  CREEP_EFFECT_PIP_MIN_EFFECTS,
  CREEP_EFFECT_TINTS,
} from '../../scenes/gameScene.constants';
import {
  destroyCreepRenderState,
  refreshCreepEffectVisuals,
  resolveCreepEffectTint,
  resolveCreepRestingTint,
} from './creepEffectVisuals';
import type { CreepRenderState } from '../../scenes/gameScene.types';

const FACTION_TINT = 0x8fce6a;
const FALLBACK_TINT = 0xffffff;

type TextStub = {
  text: string;
  color: string;
  destroyed: boolean;
} & Record<string, unknown>;

function createTextStub(label: string): TextStub {
  const stub: TextStub = {
    text: label,
    color: '',
    destroyed: false,
    setOrigin: vi.fn(),
    setDepth: vi.fn(),
    setPosition: vi.fn(),
    setText: vi.fn((next: string) => {
      stub.text = next;
    }),
    setColor: vi.fn((next: string) => {
      stub.color = next;
    }),
    destroy: vi.fn(() => {
      stub.destroyed = true;
    }),
  };
  return stub;
}

function createScene(): { scene: Phaser.Scene; created: TextStub[] } {
  const created: TextStub[] = [];
  const scene = {
    add: {
      text: vi.fn((_x: number, _y: number, label: string) => {
        const stub = createTextStub(label);
        created.push(stub);
        return stub;
      }),
    },
  } as unknown as Phaser.Scene;

  return { scene, created };
}

function createCreep(): CreepRenderState & { tints: number[] } {
  const tints: number[] = [];
  const creep = {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'creep:1',
      type: CreepTypeId.BASIC,
      hp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { x: 0, y: 0 },
      pathIndex: 0,
    },
    sprite: {
      x: 10,
      y: 20,
      setTint: vi.fn((tint: number) => tints.push(tint)),
      destroy: vi.fn(),
    },
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    baseTint: FACTION_TINT,
    tints,
  } as unknown as CreepRenderState & { tints: number[] };

  return creep;
}

describe('creep effect visuals', () => {
  it('has no effect tint on an untouched creep', () => {
    const creep = createCreep();

    expect(resolveCreepEffectTint(creep)).toBeUndefined();
    expect(resolveCreepRestingTint(creep, FALLBACK_TINT)).toBe(FACTION_TINT);
  });

  it('paints the dominant effect regardless of application order', () => {
    const chilledFirst = createCreep();
    chilledFirst.entity = applyEffectToCreep(chilledFirst.entity, { effectId: EffectId.CHILL });
    chilledFirst.entity = applyEffectToCreep(chilledFirst.entity, { effectId: EffectId.BURN });

    const burnedFirst = createCreep();
    burnedFirst.entity = applyEffectToCreep(burnedFirst.entity, { effectId: EffectId.BURN });
    burnedFirst.entity = applyEffectToCreep(burnedFirst.entity, { effectId: EffectId.CHILL });

    expect(resolveCreepEffectTint(chilledFirst)).toBe(CREEP_EFFECT_TINTS[EffectId.BURN]);
    expect(resolveCreepEffectTint(burnedFirst)).toBe(CREEP_EFFECT_TINTS[EffectId.BURN]);
  });

  it('restores the effect tint after a hit flash instead of the faction tint', () => {
    const creep = createCreep();
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.CHILL });

    expect(resolveCreepRestingTint(creep, FALLBACK_TINT)).toBe(CREEP_EFFECT_TINTS[EffectId.CHILL]);
  });

  it('repaints only when the effect set changes', () => {
    const { scene } = createScene();
    const creep = createCreep();

    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(creep.tints).toEqual([CREEP_EFFECT_TINTS[EffectId.POISON]]);
  });

  it('returns to the faction tint once every effect has expired', () => {
    const { scene } = createScene();
    const creep = createCreep();

    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    creep.entity = { ...creep.entity, activeEffects: [] };
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(creep.tints).toEqual([CREEP_EFFECT_TINTS[EffectId.POISON], FACTION_TINT]);
  });

  it('leaves a flashing creep to the hit feedback pass', () => {
    const { scene } = createScene();
    const creep = createCreep();
    creep.hitFlashRemainingMs = 50;
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });

    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(creep.tints).toEqual([]);
  });

  it('shows pips only once several effects run at once', () => {
    const { scene, created } = createScene();
    const creep = createCreep();

    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(creep.effectPips).toBeUndefined();

    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.CHILL });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(created).toHaveLength(1);
    expect(created[0].text).toHaveLength(CREEP_EFFECT_PIP_MIN_EFFECTS);
  });

  it('drops the pips when the creep falls back to a single effect', () => {
    const { scene, created } = createScene();
    const creep = createCreep();
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.CHILL });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    creep.entity = { ...creep.entity, activeEffects: [creep.entity.activeEffects![0]] };
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    expect(creep.effectPips).toBeUndefined();
    expect(created[0].destroyed).toBe(true);
  });

  it('destroys pips together with the creep sprite', () => {
    const { scene, created } = createScene();
    const creep = createCreep();
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.POISON });
    creep.entity = applyEffectToCreep(creep.entity, { effectId: EffectId.CHILL });
    refreshCreepEffectVisuals(scene, creep, FALLBACK_TINT);

    destroyCreepRenderState(creep);

    expect(created[0].destroyed).toBe(true);
    expect(creep.effectPips).toBeUndefined();
    expect(creep.sprite.destroy).toHaveBeenCalledTimes(1);
  });
});
