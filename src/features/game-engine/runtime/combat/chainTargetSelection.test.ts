import { describe, expect, it } from 'vitest';
import { getCreepFootprintCenter, isCreepHidden } from '../../../../entities/creep';
import { canTowerTargetCreep } from '../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import {
  TowerTargetScope,
  TowerTypeId,
  UNIT_SIZE_CLASSES,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
} from '../../test/combatCoreFixtures';
import {
  createChainTargetScratch,
  getSharedChainTargetScratch,
  selectChainTargets,
  type ChainTargetScratch,
} from './chainTargetSelection';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';

type Field = CombatField<CombatCreep, CombatTower>;
type Hooks = TowerCombatHooks<CombatCreep, CombatTower>;

/** The pre-rewrite filter/map/sort selection, kept verbatim as the oracle. */
function referenceSelectChainTargets(
  field: Field,
  hooks: Hooks,
  tower: CombatTower,
  from: CombatCreep,
  bounces: number,
  bounceRangeCells: number,
): CombatCreep[] {
  const visited = new Set<string>([from.entity.id]);
  const chain: CombatCreep[] = [];
  let current = from;
  for (let bounce = 0; bounce < bounces; bounce += 1) {
    const currentCenter = hooks.toCellCenter(getCreepFootprintCenter(current.entity));
    const rangePx = bounceRangeCells * GRID_DIMENSIONS.cellSize;
    const next = field.creeps
      .filter(
        (creep) =>
          creep.entity.status === 'alive' &&
          !visited.has(creep.entity.id) &&
          !isCreepHidden(creep.entity) &&
          canTowerTargetCreep(tower.entity, creep.entity),
      )
      .map((creep) => {
        const center = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
        return {
          creep,
          distance: Math.hypot(center.x - currentCenter.x, center.y - currentCenter.y),
        };
      })
      .filter((candidate) => candidate.distance <= rangePx)
      .sort((left, right) =>
        left.distance === right.distance
          ? left.creep.entity.id.localeCompare(right.creep.entity.id)
          : left.distance - right.distance,
      )[0];
    if (!next) {
      break;
    }
    visited.add(next.creep.entity.id);
    chain.push(next.creep);
    current = next.creep;
  }
  return chain;
}

const SCOPES = [TowerTargetScope.GROUND, TowerTargetScope.AIR, TowerTargetScope.BOTH];

/** A random field on a small grid so distance ties are common. */
function createRandomFixture(seed: number) {
  const random = createSeededRandom(seed);
  const pick = <V>(values: readonly V[]): V => values[Math.floor(random() * values.length)];
  const creepCount = 1 + Math.floor(random() * 90);
  const creeps: CombatCreep[] = [];
  for (let index = 0; index < creepCount; index += 1) {
    creeps.push(
      createFixtureCreep(
        `creep:${Math.floor(random() * 1_000)}:${index}`,
        { x: Math.floor(random() * 12), y: Math.floor(random() * 12) },
        {
          status: random() < 0.15 ? 'dead' : 'alive',
          moveType: random() < 0.3 ? UnitMoveType.AIR : UnitMoveType.GROUND,
          sizeClass: pick(UNIT_SIZE_CLASSES),
          ...(random() < 0.1 ? { invisibleRemainingMs: 500 } : {}),
        },
      ),
    );
  }
  const tower = createFixtureTower({ type: TowerTypeId.CHAIN });
  tower.entity = { ...tower.entity, allowedTargets: pick(SCOPES) };
  return {
    field: createFixtureField([tower], creeps),
    tower,
    from: pick(creeps),
    bounces: Math.floor(random() * 8),
    bounceRangeCells: 1 + random() * 6,
  };
}

function selectIds(
  fixture: ReturnType<typeof createRandomFixture>,
  hooks: Hooks,
  scratch: ChainTargetScratch,
): string[] {
  const { field, tower, from, bounces, bounceRangeCells } = fixture;
  const count = selectChainTargets(field, hooks, tower, from, bounces, bounceRangeCells, scratch);
  return scratch.targets.slice(0, count).map((creep) => creep?.entity.id ?? 'missing');
}

describe('selectChainTargets', () => {
  it('matches the reference filter/map/sort selection on 500 seeded random fields', () => {
    const hooks = createRecordingHooks();
    const scratch = createChainTargetScratch(4);
    let nonEmptyChains = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const fixture = createRandomFixture(seed);
      const { field, tower, from, bounces, bounceRangeCells } = fixture;
      const expected = referenceSelectChainTargets(
        field,
        hooks,
        tower,
        from,
        bounces,
        bounceRangeCells,
      ).map((creep) => creep.entity.id);
      const actual = selectIds(fixture, hooks, scratch);
      expect(actual, `seed ${seed}`).toEqual(expected);
      nonEmptyChains += expected.length > 0 ? 1 : 0;
    }
    // Guards against a generator that only ever produces empty chains.
    expect(nonEmptyChains).toBeGreaterThan(250);
  });

  it('reuses the same scratch buffers across calls once they fit the field', () => {
    const hooks = createRecordingHooks();
    const scratch = getSharedChainTargetScratch();
    // Warm-up pass: lets the buffers grow to the largest field once.
    for (let seed = 8; seed < 40; seed += 1) {
      selectIds(createRandomFixture(seed), hooks, scratch);
    }
    const { centerX, centerY, isCandidate, targets } = scratch;

    for (let seed = 8; seed < 40; seed += 1) {
      selectIds(createRandomFixture(seed), hooks, scratch);
    }

    expect(getSharedChainTargetScratch()).toBe(scratch);
    expect(scratch.centerX).toBe(centerX);
    expect(scratch.centerY).toBe(centerY);
    expect(scratch.isCandidate).toBe(isCandidate);
    expect(scratch.targets).toBe(targets);
  });

  it('grows a too-small scratch to fit the field, then keeps it', () => {
    const scratch = createChainTargetScratch(1);
    const fixture = createRandomFixture(3);
    fixture.bounces = 3;
    selectIds(fixture, createRecordingHooks(), scratch);
    const grown = scratch.isCandidate;

    expect(grown.length).toBeGreaterThanOrEqual(fixture.field.creeps.length);
    selectIds(fixture, createRecordingHooks(), scratch);
    expect(scratch.isCandidate).toBe(grown);
  });
});
