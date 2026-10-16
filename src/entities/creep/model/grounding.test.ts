import { describe, expect, it } from 'vitest';
import { EffectId, UnitMoveType } from '../../../shared/types/content-ids';
import { applyEffectToCreep } from './effects';
import { groundCreep, isCreepGrounded, tickCreepGrounding } from './grounding';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';

function creep(moveType: UnitMoveType = UnitMoveType.AIR): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    moveType,
    id: 'creep',
    type: 'basic',
    hp: 100,
    maxHp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
  };
}

describe('grounding fliers', () => {
  it('grounds a flier, keeps the longer timer and counts it down', () => {
    const flier = creep();
    groundCreep(flier, 1_000);
    groundCreep(flier, 400);
    expect(isCreepGrounded(flier)).toBe(true);
    expect(flier.groundedRemainingMs).toBe(1_000);

    tickCreepGrounding(flier, 600);
    expect(isCreepGrounded(flier)).toBe(true);
    tickCreepGrounding(flier, 600);
    expect(flier.groundedRemainingMs).toBe(0);
    expect(isCreepGrounded(flier)).toBe(false);
  });

  it('never grounds a ground creep or a dead flier', () => {
    const walker = creep(UnitMoveType.GROUND);
    groundCreep(walker, 1_000);
    expect(walker.groundedRemainingMs).toBeUndefined();
    const dead: CreepEntity = { ...creep(), status: 'dead' };
    groundCreep(dead, 1_000);
    expect(dead.groundedRemainingMs).toBeUndefined();
  });

  it('a freeze from a chill with freezeGroundsFliersMs grounds the flier', () => {
    const chill = {
      effectId: EffectId.CHILL,
      magnitude: 0.5,
      durationMs: 2_000,
      freezeAtStacks: 2,
      freezeMs: 800,
      freezeGroundsFliersMs: 800,
    };
    const once = applyEffectToCreep(creep(), chill);
    expect(isCreepGrounded(once)).toBe(false);
    const frozen = applyEffectToCreep(once, chill);
    expect(frozen.groundedRemainingMs).toBe(800);

    const walker = applyEffectToCreep(applyEffectToCreep(creep(UnitMoveType.GROUND), chill), chill);
    expect(walker.groundedRemainingMs).toBeUndefined();
  });
});
