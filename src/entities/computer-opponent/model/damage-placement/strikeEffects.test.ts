import { describe, expect, it } from 'vitest';
import { EffectId, TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import { computeExtraCreepsStruck, computeStunAdjustedSlow } from './abilityDamageModel';
import {
  BETWEEN_LANES_ANCHOR,
  FROST_TYPE,
  ledgerTower,
  SPLASH_TYPE,
  U_TURN_ROUTE,
  WALL_TYPE,
  investmentType,
} from './damagePlacementFixtures';
import { createRouteDamageLedger, type LedgerTower } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';
import { computeCreepsStruckPerShot, computeTargetsPerShot } from './shotReach';
import { computeChill, computeSampleDamageRate } from './towerDamageModel';

// What a shot's on-hit effects are worth (tower-def-02k.11): stuns as the
// share of a reload they hold a creep, effects on every creep a shot strikes,
// and slows capped where the towers that reach a held creep are already busy.

const geometry = createRouteGeometry(U_TURN_ROUTE);
const CHAIN_TYPE = investmentType(TowerTypeId.CHAIN, 85);
const POISON = { effectId: EffectId.POISON, magnitude: 6, durationMs: 4000 };

function withStats(base: LedgerTower, stats: Partial<LedgerTower['stats']>): LedgerTower {
  return { ...base, stats: { ...base.stats, ...stats } };
}

function denseSample(tower: LedgerTower): number {
  const samples = geometry.coveredSamples(tower.anchor, tower.stats.range);
  return samples.reduce((best, sample) =>
    computeTargetsPerShot(tower, geometry, sample) > computeTargetsPerShot(tower, geometry, best)
      ? sample
      : best,
  );
}

describe('entities/computer-opponent/damage-placement strike effects', () => {
  it('values a stun as the share of each reload it holds the creep, on top of a chill', () => {
    expect(computeStunAdjustedSlow(0, 200, 800)).toBeCloseTo(0.25);
    expect(computeStunAdjustedSlow(0.5, 200, 800)).toBeCloseTo(0.625);
    expect(computeStunAdjustedSlow(0, 2000, 800)).toBe(1);
    expect(computeStunAdjustedSlow(0.4, 0, 800)).toBe(0.4);
  });

  it('never reads a short stun as a deep chill', () => {
    const wall = ledgerTower(BETWEEN_LANES_ANCHOR);
    const stunning = withStats(wall, {
      attackCooldownMs: 800,
      onHitEffects: [{ effectId: EffectId.STUN, durationMs: 200 }],
    });

    expect(computeChill(stunning)).toEqual({ magnitude: 0.25, durationMs: 200 });
  });

  it('counts extra targets and pierced creeps whole for the on-hit effects', () => {
    const sample = denseSample(ledgerTower(BETWEEN_LANES_ANCHOR));
    const weighted = computeTargetsPerShot(
      withStats(ledgerTower(BETWEEN_LANES_ANCHOR), {
        abilities: { extraTargets: 2, extraTargetDamageShare: 0.25 },
      }),
      geometry,
      sample,
    );
    const struck = computeExtraCreepsStruck(
      { extraTargets: 2, extraTargetDamageShare: 0.25 },
      WALL_TYPE.stats.range,
      geometry,
      sample,
    );

    expect(struck).toBeGreaterThan(weighted - 1);
    expect(struck).toBeLessThanOrEqual(2);
  });

  it('puts a splash poison on every creep in the blast', () => {
    const single = withStats(ledgerTower(BETWEEN_LANES_ANCHOR), {
      damage: 0,
      onHitEffects: [POISON],
    });
    const splash = withStats(ledgerTower(BETWEEN_LANES_ANCHOR, SPLASH_TYPE), {
      damage: 0,
      onHitEffects: [POISON],
    });
    const sample = denseSample(splash);

    expect(computeCreepsStruckPerShot(splash, geometry, sample)).toBeGreaterThan(1);
    expect(computeSampleDamageRate(splash, geometry, sample)).toBeCloseTo(
      computeSampleDamageRate(single, geometry, sample) *
        computeCreepsStruckPerShot(splash, geometry, sample),
    );
  });

  it('lets a long chain walk along the wave past its first jump', () => {
    const tower = ledgerTower(BETWEEN_LANES_ANCHOR, CHAIN_TYPE);
    const short = withStats(tower, {
      chain: { bounces: 1, bounceRangeCells: 3, damageFalloff: 0 },
    });
    const long = withStats(tower, {
      chain: { bounces: 6, bounceRangeCells: 3, damageFalloff: 0 },
    });
    const sample = denseSample(long);

    expect(computeCreepsStruckPerShot(long, geometry, sample)).toBeGreaterThan(
      computeCreepsStruckPerShot(short, geometry, sample) + 1,
    );
  });

  it('stops crediting a deeper slow once a held creep is in reach twice as long', () => {
    const frost = ledgerTower(BETWEEN_LANES_ANCHOR, FROST_TYPE);
    const partner = ledgerTower({ x: 9, y: 3 });
    const at = (magnitude: number) =>
      createRouteDamageLedger(geometry, [partner], UnitMoveType.GROUND).contributionOf(
        withStats(frost, { onHitEffects: [{ effectId: EffectId.CHILL, magnitude }] }),
      );

    expect(at(0.5)).toBeGreaterThan(at(0.3));
    expect(at(0.75)).toBeCloseTo(at(0.5));
  });

  it('chills more of the wave when each shot strikes more creeps', () => {
    const chill = { effectId: EffectId.CHILL, magnitude: 0.5, durationMs: 2000 };
    const frost = withStats(ledgerTower(BETWEEN_LANES_ANCHOR, FROST_TYPE), {
      onHitEffects: [chill],
    });
    const spreading = withStats(frost, { abilities: { extraTargets: 2 } });
    const partner = ledgerTower({ x: 9, y: 3 });
    const ledger = createRouteDamageLedger(geometry, [partner], UnitMoveType.GROUND);

    expect(ledger.contributionOf(spreading)).toBeGreaterThan(ledger.contributionOf(frost));
  });
});
