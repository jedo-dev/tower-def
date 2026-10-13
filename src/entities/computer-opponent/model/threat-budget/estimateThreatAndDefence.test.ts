import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../../shared/types/content-ids';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
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
import { computeEffectiveHealth } from './effectiveHealth';
import { estimateDefenceCapability } from './estimateDefenceCapability';
import { estimateIncomingThreat, type IncomingThreatInput } from './estimateIncomingThreat';

const ROSTER = getUnitsByFaction(RaceId.UNDEAD);
const SENDABLES = ['undead_skeleton', 'undead_ghoul'] as const;

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

  it('adds the creeps the other side has queued, armor included', () => {
    const fiend = resolveUnitConfigById('undead_crypt_fiend');
    const quiet = estimateIncomingThreat(threatInput());
    const sent = estimateIncomingThreat(threatInput({ observedSends: [fiend, fiend] }));

    expect(computeEffectiveHealth(fiend)).toBeGreaterThan(fiend.health);
    expect(sent.sendHealth).toBeCloseTo(
      2 * computeEffectiveHealth(fiend) * getWaveHealthMultiplier(threatInput().waveNumber),
    );
    expect(sent.totalHealth).toBeCloseTo(quiet.totalHealth + sent.sendHealth);
  });

  it('grows every creep with the wave it spawns in, as the battlefield does', () => {
    const fiend = resolveUnitConfigById('undead_crypt_fiend');
    const early = estimateIncomingThreat(threatInput({ waveNumber: 1, observedSends: [fiend] }));
    const late = estimateIncomingThreat(threatInput({ waveNumber: 9, observedSends: [fiend] }));

    expect(early.sendHealth).toBeCloseTo(computeEffectiveHealth(fiend));
    expect(late.sendHealth).toBeCloseTo(early.sendHealth * getWaveHealthMultiplier(9));
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
