import { describe, expect, it } from 'vitest';
import {
  ArmorKind,
  DamageScope,
  DamageType,
  EffectId,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import { tallyCreature, toDamageTypeEfficiency } from '../damage-profile';
import {
  computeArmorBreakGain,
  computeCritFactor,
  computeDefenceAmplification,
  computeTargetMultiplierFactor,
} from './abilityDamageModel';
import {
  BETWEEN_LANES_ANCHOR,
  ledgerTower,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damagePlacementFixtures';
import { createRouteDamageLedger } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';
import type { LedgerTower } from './routeDamageLedger';
import { computeChill } from './towerDamageModel';

const geometry = createRouteGeometry(U_TURN_ROUTE);
const PLATED = toDamageTypeEfficiency(
  tallyCreature({ health: 300, physicalArmor: 40, magicalArmor: 0 }),
);

function withStats(
  stats: Partial<LedgerTower['stats']>,
  base: LedgerTower = ledgerTower(BETWEEN_LANES_ANCHOR),
) {
  return { ...base, stats: { ...base.stats, ...stats } };
}

function contribution(tower: LedgerTower, efficiency = PLATED, others: LedgerTower[] = []) {
  return createRouteDamageLedger(geometry, others, UnitMoveType.GROUND, efficiency).contributionOf(
    tower,
  );
}

describe('entities/computer-opponent/damage-placement ability valuation', () => {
  it('averages every-Nth-shot crits into the shot damage', () => {
    expect(computeCritFactor(undefined)).toBe(1);
    expect(computeCritFactor({ critEveryNthShot: 4, critMultiplier: 3 })).toBeCloseTo(1.5);
  });

  it('applies air and ground multipliers per lane and size multipliers at a share of hits', () => {
    const abilities = { airDamageMultiplier: 2, largeTargetMultiplier: 2 };

    expect(computeTargetMultiplierFactor(abilities, UnitMoveType.AIR)).toBeGreaterThan(2);
    expect(computeTargetMultiplierFactor(abilities, UnitMoveType.GROUND)).toBeGreaterThan(1);
    expect(computeTargetMultiplierFactor(abilities, UnitMoveType.GROUND)).toBeLessThan(2);
  });

  it('values extra targets, a piercing line and a volley above the plain tower', () => {
    const plain = contribution(ledgerTower(BETWEEN_LANES_ANCHOR));

    expect(contribution(withStats({ abilities: { extraTargets: 2 } }))).toBeGreaterThan(plain);
    expect(contribution(withStats({ abilities: { pierceLine: 0.5 } }))).toBeGreaterThan(plain);
    expect(contribution(withStats({ abilities: { volleyEveryMs: 1000 } }))).toBeGreaterThan(plain);
  });

  it('values armor break through the combat mitigation curve', () => {
    expect(computeArmorBreakGain(PLATED[DamageType.PHYSICAL], 10)).toBeCloseTo(
      getArmorDamageMultiplier(30) / getArmorDamageMultiplier(40) - 1,
    );
    expect(computeArmorBreakGain(1, 10)).toBeCloseTo(getArmorDamageMultiplier(-10) - 1);
    expect(computeArmorBreakGain(PLATED[DamageType.PHYSICAL], 0)).toBe(0);
  });

  it('counts a physical armor break on its own physical shots and on the field', () => {
    const amplification = computeDefenceAmplification(
      [{ effectId: EffectId.ARMOR_BREAK, magnitude: 10, armorKind: ArmorKind.PHYSICAL }],
      DamageType.PHYSICAL,
      WALL_TYPE.stats.attackCooldownMs,
      PLATED,
    );

    expect(amplification.ownGain).toBeGreaterThan(0);
    expect(amplification.fieldGain).toBeGreaterThan(0);
  });

  it('values a vulnerability mark by the damage of the towers around it', () => {
    const marker = withStats({
      onHitEffects: [
        { effectId: EffectId.VULNERABILITY, magnitude: 0.3, damageKind: DamageScope.ALL },
      ],
    });
    const partner = ledgerTower({ x: 9, y: 3 });

    expect(contribution(marker, PLATED, [partner])).toBeGreaterThan(
      contribution(ledgerTower(BETWEEN_LANES_ANCHOR), PLATED, [partner]),
    );
    expect(contribution(marker, PLATED, [partner])).toBeGreaterThan(contribution(marker));
  });

  it('values a freezing chill as a deeper slow', () => {
    const chill = { effectId: EffectId.CHILL, magnitude: 0.5, durationMs: 2000 };
    const plain = computeChill(withStats({ onHitEffects: [chill] }));
    const freezing = computeChill(
      withStats({ onHitEffects: [{ ...chill, freezeAtStacks: 3, freezeMs: 500 }] }),
    );

    expect(freezing.magnitude).toBeGreaterThan(plain.magnitude);
  });
});
