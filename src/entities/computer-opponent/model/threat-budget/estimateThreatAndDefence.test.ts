import { describe, expect, it } from 'vitest';
import { PERCENT_DAMAGE } from '../../../../shared/constants/damage';
import { RaceId, UnitMoveType } from '../../../../shared/types/content-ids';
import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
import { UnitTier, type UnitConfig } from '../../../unit/model/types';
import { NEUTRAL_DAMAGE_EFFICIENCY } from '../damage-profile';
import { getWaveHealthMultiplier } from '../../../wave/model/waveHealth';
import {
  BETWEEN_LANES_ANCHOR,
  ledgerTower,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
  WALL_TYPE,
} from '../damage-placement/damagePlacementFixtures';
import { createRouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { createRouteGeometry } from '../damage-placement/routeGeometry';
import { computeShotDps } from '../damage-placement/towerDamageModel';
import { estimateDefenceCapability } from './estimateDefenceCapability';
import { estimateIncomingThreat, type IncomingThreatInput } from './estimateIncomingThreat';

const ROSTER = getUnitsByFaction(RaceId.UNDEAD);
const SENDABLES = ['undead_skeleton', 'undead_ghoul'] as const;

/** A tier 1 ground creature with chosen health and armor (content armor is not the subject). */
function armoredUnit(overrides: Partial<UnitConfig>): UnitConfig {
  return {
    ...resolveUnitConfigById('undead_skeleton'),
    tier: UnitTier.TIER_1,
    moveType: UnitMoveType.GROUND,
    health: 100,
    physicalArmor: 0,
    magicalArmor: 0,
    ...overrides,
  };
}

function threatInput(overrides?: Partial<IncomingThreatInput>): IncomingThreatInput {
  return {
    waveNumber: 5,
    baselineFactionUnits: ROSTER,
    observedSends: [],
    expectedSendGold: 0,
    enemySendables: SENDABLES.map((id) => resolveUnitConfigById(id)),
    ...overrides,
  };
}

describe('entities/computer-opponent/threat-budget estimateIncomingThreat', () => {
  it('estimates the same typical baseline wave every time', () => {
    const first = estimateIncomingThreat(threatInput());

    expect(first.baselineHealth).toBeGreaterThan(0);
    expect(first.creepCount).toBeGreaterThan(0);
    expect(estimateIncomingThreat(threatInput())).toEqual(first);
  });

  it('expects later waves to be tougher', () => {
    const early = estimateIncomingThreat(threatInput({ waveNumber: 1 }));
    const late = estimateIncomingThreat(threatInput({ waveNumber: 10 }));

    expect(late.totalHealth).toBeGreaterThan(early.totalHealth);
  });

  it('adds the creeps the other side has queued, in hit points', () => {
    const fiend = resolveUnitConfigById('undead_crypt_fiend');
    const quiet = estimateIncomingThreat(threatInput());
    const sent = estimateIncomingThreat(threatInput({ observedSends: [fiend, fiend] }));

    expect(sent.sendHealth).toBeCloseTo(
      2 * fiend.health * getWaveHealthMultiplier(threatInput().waveNumber),
    );
    expect(sent.totalHealth).toBeCloseTo(quiet.totalHealth + sent.sendHealth);
  });

  it('grows every creep with the wave it spawns in, as the battlefield does', () => {
    const fiend = resolveUnitConfigById('undead_crypt_fiend');
    const early = estimateIncomingThreat(threatInput({ waveNumber: 1, observedSends: [fiend] }));
    const late = estimateIncomingThreat(threatInput({ waveNumber: 9, observedSends: [fiend] }));

    expect(early.sendHealth).toBeCloseTo(fiend.health);
    expect(late.sendHealth).toBeCloseTo(early.sendHealth * getWaveHealthMultiplier(9));
  });

  it('reads the armor of the wave into what each damage type is worth', () => {
    const plated = armoredUnit({ physicalArmor: 25, magicalArmor: 0 });
    const warded = armoredUnit({ physicalArmor: 0, magicalArmor: 25 });
    const platedWave = estimateIncomingThreat(
      threatInput({ baselineFactionUnits: [plated], enemySendables: [plated] }),
    );
    const wardedWave = estimateIncomingThreat(
      threatInput({ baselineFactionUnits: [warded], enemySendables: [warded] }),
    );

    expect(platedWave.groundEfficiency.physical).toBeCloseTo(getArmorDamageMultiplier(25));
    expect(platedWave.groundEfficiency.magical).toBeCloseTo(1);
    expect(wardedWave.groundEfficiency.magical).toBeCloseTo(getArmorDamageMultiplier(25));
    expect(wardedWave.groundEfficiency.physical).toBeCloseTo(1);
    // No fliers: the air lane stays neutral.
    expect(platedWave.airEfficiency).toEqual(NEUTRAL_DAMAGE_EFFICIENCY);
  });

  it('values percent damage by the maximum health the wave spawns with', () => {
    const small = armoredUnit({ health: 100 });
    const big = armoredUnit({ health: 400 });
    const percentOf = (unit: UnitConfig, waveNumber: number) =>
      estimateIncomingThreat(
        threatInput({ waveNumber, baselineFactionUnits: [unit], enemySendables: [unit] }),
      ).groundEfficiency.percent;

    expect(percentOf(big, 1)).toBeCloseTo(4 * percentOf(small, 1));
    expect(percentOf(small, 1)).toBeCloseTo(100 / PERCENT_DAMAGE.healthShareDivisor);
    expect(percentOf(small, 9)).toBeCloseTo(percentOf(small, 1) * getWaveHealthMultiplier(9));
  });

  it('expects sends from the other side income while its queue is empty', () => {
    const quiet = estimateIncomingThreat(threatInput());
    const rich = estimateIncomingThreat(threatInput({ expectedSendGold: 200 }));

    expect(rich.sendHealth).toBeGreaterThan(0);
    expect(rich.totalHealth).toBeGreaterThan(quiet.totalHealth);
  });
});

describe('entities/computer-opponent/threat-budget estimateDefenceCapability', () => {
  const geometry = createRouteGeometry(U_TURN_ROUTE);
  const wall = { cost: WALL_TYPE.cost, shotDps: computeShotDps(WALL_TYPE.stats) };

  it('deals no damage without towers but prices new ones', () => {
    const capability = estimateDefenceCapability({
      ledger: createRouteDamageLedger(geometry),
      creepCount: 10,
      averageSpeed: 1.3,
      wall,
    });

    expect(capability.waveDamage).toBe(0);
    expect(capability.damagePerGold).toBeGreaterThan(0);
  });

  it('deals more damage with more route under the guns', () => {
    const run = (anchor: typeof STRAIGHT_ANCHOR) =>
      estimateDefenceCapability({
        ledger: createRouteDamageLedger(geometry, [ledgerTower(anchor)]),
        creepCount: 10,
        averageSpeed: 1.3,
        wall,
      }).waveDamage;

    expect(run(BETWEEN_LANES_ANCHOR)).toBeGreaterThan(run(STRAIGHT_ANCHOR));
  });

  it('deals less to faster creeps, which spend less time in range', () => {
    const run = (averageSpeed: number) =>
      estimateDefenceCapability({
        ledger: createRouteDamageLedger(geometry, [ledgerTower(STRAIGHT_ANCHOR)]),
        creepCount: 1,
        averageSpeed,
        wall,
      }).waveDamage;

    expect(run(2)).toBeLessThan(run(1));
  });

  it('cannot shoot a whole wave at once: damage grows slower than the creep count', () => {
    const run = (creepCount: number) =>
      estimateDefenceCapability({
        ledger: createRouteDamageLedger(geometry, [ledgerTower(STRAIGHT_ANCHOR)]),
        creepCount,
        averageSpeed: 1.3,
        wall,
      }).waveDamage;

    expect(run(10)).toBeGreaterThan(run(1));
    expect(run(10)).toBeLessThan(10 * run(1));
  });

  it('has no price for defence it cannot build', () => {
    const capability = estimateDefenceCapability({
      ledger: createRouteDamageLedger(geometry),
      creepCount: 10,
      averageSpeed: 1.3,
      wall: null,
    });

    expect(capability.damagePerGold).toBe(0);
  });
});
