import { describe, expect, it } from 'vitest';
import { EffectId, TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks, tickFieldCreepEffects } from './towerCombatCore';

// Combat-core integration: grounding fliers (tower-def-bge.9). A grounded
// flier is targetable by ground-only towers until its timer runs out.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };

function groundOnlyArcher() {
  const tower = createFixtureTower({ id: 'tower:ground', position: TOWER_AT_ORIGIN });
  tower.entity.allowedTargets = 'ground';
  return tower;
}

function flier() {
  return createFixtureCreep('flier', { x: 2, y: 0 }, { moveType: UnitMoveType.AIR });
}

describe('groundsFliersMs (on hit)', () => {
  it('lets a ground-only tower shoot the flier while it is down', () => {
    const target = flier();
    const puller = createFixtureTower({
      id: 'tower:puller',
      type: TowerTypeId.SPLASH,
      position: TOWER_AT_ORIGIN,
      stats: { splashRadius: 3, allowedTargets: 'both' },
      abilities: { groundsFliersMs: 1_000 },
    });
    const ground = groundOnlyArcher();
    const field = createFixtureField([puller, ground], [target]);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 1_000);
    expect(target.entity.groundedRemainingMs).toBe(1_000);
    expect(damageTaken(target)).toBe(100);

    // Towers pick from the frame's snapshot, so the ground tower sees it next frame.
    field.towers = [ground];
    resolveTowerAttacks(field, hooks, 0);
    expect(damageTaken(target)).toBe(200);

    tickFieldCreepEffects(field, hooks, 1_000);
    resolveTowerAttacks(field, hooks, 1_000);
    expect(damageTaken(target)).toBe(200);
  });
});

describe('chill groundsFliersMs (on freeze)', () => {
  it('grounds a flier only when the chill freezes it', () => {
    const target = flier();
    const frost = createFixtureTower({
      id: 'tower:frost',
      position: TOWER_AT_ORIGIN,
      stats: {
        onHitEffects: [
          {
            effectId: EffectId.CHILL,
            magnitude: 0.5,
            durationMs: 3_000,
            freezeAtStacks: 2,
            freezeMs: 800,
            groundsFliersMs: 800,
          },
        ],
      },
    });
    const field = createFixtureField([frost], [target]);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 1_000);
    expect(target.entity.groundedRemainingMs).toBeUndefined();
    resolveTowerAttacks(field, hooks, 1_000);
    expect(target.entity.groundedRemainingMs).toBe(800);

    field.towers = [groundOnlyArcher()];
    resolveTowerAttacks(field, hooks, 1_000);
    expect(hooks.firedTowerIds.at(-1)).toBe('tower:ground');
  });
});
