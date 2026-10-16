import { describe, expect, it } from 'vitest';
import { PERCENT_DAMAGE } from '../../../../shared/constants/damage';
import { DamageType, EffectId, TowerTypeId } from '../../../../shared/types/content-ids';
import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import {
  tallyCreature,
  toDamageTypeEfficiency,
  type ArmoredHealth,
  type DamageTypeEfficiency,
} from '../damage-profile';
import { computeArmorCounterFactor } from './armorCounterFactor';
import {
  BETWEEN_LANES_ANCHOR,
  investmentType,
  ledgerTower,
  SPLASH_TYPE,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damagePlacementFixtures';
import { planRoundInvestments, type InvestmentTowerType } from './planRoundInvestments';
import { createRouteDamageLedger } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';
import { computeDamageOverTimeDps } from './towerDamageModel';

// Fixture waves with lopsided armor: the shipped rosters are not the subject.
const PLATED: ArmoredHealth = { health: 300, physicalArmor: 50, magicalArmor: 0 };
const WARDED: ArmoredHealth = { health: 300, physicalArmor: 0, magicalArmor: 50 };

function efficiencyOf(creature: ArmoredHealth): DamageTypeEfficiency {
  return toDamageTypeEfficiency(tallyCreature(creature));
}

const POISON_TYPE = investmentType(TowerTypeId.POISON, 75);
const PERCENT_TYPE: InvestmentTowerType = {
  ...investmentType(TowerTypeId.CHAIN, 75),
  damageType: DamageType.PERCENT,
};

/** One plan block between the two lanes and the gold to turn its wall into a damage tower. */
function planBetweenLanes(efficiency: DamageTypeEfficiency, damageTypes: InvestmentTowerType[]) {
  const plan = planRoundInvestments({
    ledger: createRouteDamageLedger(createRouteGeometry(U_TURN_ROUTE), [], undefined, efficiency),
    wall: WALL_TYPE,
    damageTypes,
    walls: [{ anchor: BETWEEN_LANES_ANCHOR, routeGain: 2 }],
    upgrades: [],
    budget: 2 * SPLASH_TYPE.cost,
    maxBuilds: 1,
  });
  return plan.builds[0]?.towerType;
}

function contributionAt(efficiency: DamageTypeEfficiency, type: InvestmentTowerType): number {
  const ledger = createRouteDamageLedger(
    createRouteGeometry(U_TURN_ROUTE),
    [],
    undefined,
    efficiency,
  );
  return ledger.contributionOf(ledgerTower(STRAIGHT_ANCHOR, type));
}

describe('entities/computer-opponent/damage-placement armor-aware investments', () => {
  it('turns the block into a magical archetype against a wave plated against physical', () => {
    expect(planBetweenLanes(efficiencyOf(PLATED), [SPLASH_TYPE, POISON_TYPE])).toBe(
      TowerTypeId.POISON,
    );
  });

  it('turns the same block into a physical archetype against a warded wave', () => {
    expect(planBetweenLanes(efficiencyOf(WARDED), [SPLASH_TYPE, POISON_TYPE])).toBe(
      TowerTypeId.SPLASH,
    );
  });

  it('counts physical damage through physical armor with the combat curve', () => {
    const neutral = contributionAt(efficiencyOf({ ...PLATED, physicalArmor: 0 }), WALL_TYPE);
    const plated = contributionAt(efficiencyOf(PLATED), WALL_TYPE);

    expect(plated / neutral).toBeCloseTo(getArmorDamageMultiplier(50));
  });

  it('values a percent tower by the maximum health of the wave, a physical one not', () => {
    const small = efficiencyOf({ health: 100, physicalArmor: 3, magicalArmor: 3 });
    const big = efficiencyOf({ health: 4000, physicalArmor: 3, magicalArmor: 3 });

    expect(contributionAt(big, PERCENT_TYPE) / contributionAt(small, PERCENT_TYPE)).toBeCloseTo(40);
    expect(contributionAt(big, WALL_TYPE)).toBeCloseTo(contributionAt(small, WALL_TYPE));
    // Big creatures make the percent tower the better buy for the block, small ones the splash.
    expect(planBetweenLanes(big, [SPLASH_TYPE, PERCENT_TYPE])).toBe(PERCENT_TYPE.towerType);
    expect(planBetweenLanes(small, [SPLASH_TYPE, PERCENT_TYPE])).toBe(SPLASH_TYPE.towerType);
  });

  it('values percent poison ticks as per mille of maximum health, not flat magical damage', () => {
    const percentPoison = {
      ...ledgerTower(STRAIGHT_ANCHOR, POISON_TYPE),
      stats: {
        ...POISON_TYPE.stats,
        onHitEffects: [{ effectId: EffectId.POISON, damageType: DamageType.PERCENT }],
      },
    };
    const magicalPoison = {
      ...percentPoison,
      stats: { ...percentPoison.stats, onHitEffects: [{ effectId: EffectId.POISON }] },
    };
    const wave = efficiencyOf({ health: 800, physicalArmor: 0, magicalArmor: 50 });
    const rawTicks = computeDamageOverTimeDps(percentPoison);

    expect(computeDamageOverTimeDps(percentPoison, wave)).toBeCloseTo(
      (rawTicks * 800) / PERCENT_DAMAGE.healthShareDivisor,
    );
    expect(computeDamageOverTimeDps(magicalPoison, wave)).toBeCloseTo(
      rawTicks * getArmorDamageMultiplier(50),
    );
  });

  it('scores the type that goes through the weaker armor above 1, the other below', () => {
    const magical = { ...ledgerTower(STRAIGHT_ANCHOR, WALL_TYPE), damageType: DamageType.MAGICAL };
    const physical = ledgerTower(STRAIGHT_ANCHOR, WALL_TYPE);
    const evenWave = efficiencyOf({ health: 300, physicalArmor: 10, magicalArmor: 10 });

    expect(computeArmorCounterFactor(magical, efficiencyOf(PLATED))).toBeGreaterThan(1);
    expect(computeArmorCounterFactor(physical, efficiencyOf(PLATED))).toBeLessThan(1);
    expect(computeArmorCounterFactor(physical, evenWave)).toBeCloseTo(1);
    expect(
      computeArmorCounterFactor(ledgerTower(STRAIGHT_ANCHOR, PERCENT_TYPE), efficiencyOf(PLATED)),
    ).toBeCloseTo(1);
  });
});
